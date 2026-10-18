import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSupabase } from "jsr:@supabase/server";

interface VerifyPaymentRequest {
  chalega_order_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface ChalegaOrder {
  id: string;
  order_id: string;
  user_id: string | null;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
}

interface RazorpayPayment {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string | null;
  method?: string;
  captured?: boolean;
  amount_captured?: number | null;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return Response.json(body, { status });
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

async function createHmacSha256(
  secret: string,
  message: string,
): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message),
  );

  return toHex(signature);
}

function safeEqual(
  a: string,
  b: string,
): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i += 1) {
    result |=
      a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function razorpayAuthHeader(
  keyId: string,
  keySecret: string,
): string {
  return `Basic ${btoa(
    `${keyId}:${keySecret}`,
  )}`;
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      if (req.method !== "POST") {
        return jsonResponse(
          {
            success: false,
            verified: false,
            error: "Method not allowed",
          },
          405,
        );
      }

      try {
        const body =
          (await req.json()) as Partial<VerifyPaymentRequest>;

        const chalegaOrderId =
          body.chalega_order_id?.trim();

        const razorpayOrderId =
          body.razorpay_order_id?.trim();

        const razorpayPaymentId =
          body.razorpay_payment_id?.trim();

        const razorpaySignature =
          body.razorpay_signature?.trim();

        if (
          !chalegaOrderId ||
          !razorpayOrderId ||
          !razorpayPaymentId ||
          !razorpaySignature
        ) {
          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Missing payment verification fields.",
            },
            400,
          );
        }

        const userId = ctx.userClaims?.id;

        if (typeof userId !== "string" || !userId.trim()) {
          return jsonResponse(
            {
              success: false,
              verified: false,
              error: "Authentication required.",
            },
            401,
          );
        }

        const supabaseUrl =
          Deno.env.get("SUPABASE_URL");

        const serviceRoleKey =
          Deno.env.get(
            "SUPABASE_SERVICE_ROLE_KEY",
          );

        const keyId =
          Deno.env.get(
            "RAZORPAY_KEY_ID",
          );

        const keySecret =
          Deno.env.get(
            "RAZORPAY_KEY_SECRET",
          );

        if (
          !supabaseUrl ||
          !serviceRoleKey ||
          !keyId ||
          !keySecret
        ) {
          console.error(
            "Required payment verification secrets are missing.",
            {
              hasSupabaseUrl:
                Boolean(supabaseUrl),
              hasServiceRoleKey:
                Boolean(serviceRoleKey),
              hasRazorpayKeyId:
                Boolean(keyId),
              hasRazorpaySecret:
                Boolean(keySecret),
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Payment verification is not configured.",
            },
            500,
          );
        }

        const adminSupabase =
          createClient(
            supabaseUrl,
            serviceRoleKey,
            {
              auth: {
                autoRefreshToken: false,
                persistSession: false,
              },
            },
          );

        /*
         * -------------------------------------------------------
         * 1. Load the Chalega order belonging to the caller.
         * -------------------------------------------------------
         *
         * chalega_order_id is the UUID in orders.id.
         *
         * We still explicitly check user_id even though the Edge
         * Function itself requires an authenticated user.
         */
        const {
          data: order,
          error: orderError,
        } = await adminSupabase
          .from("orders")
          .select("id, order_id, user_id, total, status, payment_status, payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature")
          .eq("id", chalegaOrderId)
          .eq("user_id", userId)
          .maybeSingle();

        if (orderError) {
          console.error(
            "Failed to load Chalega order.",
            {
              userId,
              chalegaOrderId,
              error: orderError,
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Unable to load the order.",
            },
            500,
          );
        }

        if (!order) {
          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Chalega order not found.",
            },
            404,
          );
        }

        const chalegaOrder =
          order as ChalegaOrder;

        if (chalegaOrder.status === "Cancelled") {
          return jsonResponse(
            {
              success: false,
              verified: false,
              error: "Cancelled orders cannot be marked as paid.",
            },
            400,
          );
        }

        /*
         * -------------------------------------------------------
         * 2. Confirm that the Razorpay order is the one created
         *    for this exact Chalega order.
         * -------------------------------------------------------
         */
        if (
          !chalegaOrder.razorpay_order_id ||
          chalegaOrder.razorpay_order_id !==
            razorpayOrderId
        ) {
          console.warn(
            "Chalega/Razorpay order mismatch.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              expectedRazorpayOrderId:
                chalegaOrder.razorpay_order_id,
              receivedRazorpayOrderId:
                razorpayOrderId,
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Payment does not belong to this Chalega order.",
            },
            400,
          );
        }

        /*
         * -------------------------------------------------------
         * 3. Verify the Razorpay Checkout signature.
         * -------------------------------------------------------
         */
        const message =
          `${razorpayOrderId}|${razorpayPaymentId}`;

        const expectedSignature =
          await createHmacSha256(
            keySecret,
            message,
          );

        const signatureValid =
          safeEqual(
            expectedSignature,
            razorpaySignature,
          );

        if (!signatureValid) {
          console.warn(
            "Invalid Razorpay payment signature.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              razorpayOrderId,
              razorpayPaymentId,
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Invalid payment signature.",
            },
            400,
          );
        }

        /*
         * -------------------------------------------------------
         * 4. Ask Razorpay directly for the payment.
         * -------------------------------------------------------
         */
        const paymentResponse =
          await fetch(
            `https://api.razorpay.com/v1/payments/${encodeURIComponent(
              razorpayPaymentId,
            )}`,
            {
              method: "GET",
              headers: {
                Authorization:
                  razorpayAuthHeader(
                    keyId,
                    keySecret,
                  ),
                Accept:
                  "application/json",
              },
            },
          );

        const paymentData =
          await paymentResponse.json();

        if (!paymentResponse.ok) {
          console.error(
            "Razorpay payment lookup failed.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              razorpayOrderId,
              razorpayPaymentId,
              razorpayStatus:
                paymentResponse.status,
              razorpayError:
                paymentData,
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Unable to confirm the payment with Razorpay.",
            },
            502,
          );
        }

        const payment =
          paymentData as RazorpayPayment;

        /*
         * -------------------------------------------------------
         * 5. Confirm the Razorpay payment belongs to the exact
         *    Razorpay order.
         * -------------------------------------------------------
         */
        if (
          payment.order_id !==
          razorpayOrderId
        ) {
          console.warn(
            "Razorpay payment/order mismatch.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              expectedOrderId:
                razorpayOrderId,
              actualOrderId:
                payment.order_id,
              razorpayPaymentId,
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Payment does not belong to the expected Razorpay order.",
            },
            400,
          );
        }

        /*
         * -------------------------------------------------------
         * 6. Confirm currency.
         * -------------------------------------------------------
         */
        if (
          payment.currency !==
          "INR"
        ) {
          console.warn(
            "Unexpected payment currency.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              currency:
                payment.currency,
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Payment currency does not match INR.",
            },
            400,
          );
        }

        /*
         * -------------------------------------------------------
         * 7. Confirm Razorpay amount exactly matches the
         *    server-side Chalega order total.
         * -------------------------------------------------------
         *
         * Chalega stores total in rupees.
         * Razorpay sends amount in paise.
         */
        const orderTotalRupees =
          Number(chalegaOrder.total);

        if (
          !Number.isFinite(orderTotalRupees) ||
          orderTotalRupees <= 0 ||
          Math.round(orderTotalRupees * 100) / 100 !== orderTotalRupees
        ) {
          console.error("Invalid Chalega order total.", {
            userId,
            chalegaOrderId: chalegaOrder.id,
            total: chalegaOrder.total,
          });

          return jsonResponse(
            {
              success: false,
              verified: false,
              error: "The Chalega order has an invalid total.",
            },
            400,
          );
        }
        const expectedAmountPaise =
          Math.round(
            orderTotalRupees * 100,
          );

        if (
          !Number.isSafeInteger(expectedAmountPaise) ||
          expectedAmountPaise < 100 ||
          expectedAmountPaise > 99999999 ||
          !Number.isSafeInteger(payment.amount) ||
          payment.amount !== expectedAmountPaise
        ) {
          console.warn(
            "Payment amount mismatch.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              expectedAmountPaise,
              actualAmountPaise:
                payment.amount,
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Payment amount does not match the Chalega order.",
            },
            400,
          );
        }

        /*
         * -------------------------------------------------------
         * 8. Require a captured payment.
         * -------------------------------------------------------
         */
        const isCaptured =
          payment.status ===
            "captured" ||
          payment.captured === true;

        if (!isCaptured) {
          console.warn(
            "Razorpay payment is not captured.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              razorpayOrderId,
              razorpayPaymentId,
              paymentStatus:
                payment.status,
              captured:
                payment.captured,
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              captured: false,
              error:
                "Payment has not been captured yet.",
              payment: {
                razorpay_order_id:
                  razorpayOrderId,
                razorpay_payment_id:
                  razorpayPaymentId,
                amount:
                  payment.amount,
                currency:
                  payment.currency,
                status:
                  payment.status,
              },
            },
            400,
          );
        }

        /*
         * -------------------------------------------------------
         * 9. Atomically reconcile the verified payment.
         * -------------------------------------------------------
         *
         * The database transaction updates the order and saves
         * its payment record together. Never report success unless
         * the RPC confirms both reconciliation and record storage.
         */
        const {
          data: reconciliationResult,
          error: reconciliationError,
        } = await adminSupabase.rpc("reconcile_razorpay_payment", {
          p_order_id: chalegaOrder.id,
          p_user_id: userId,
          p_razorpay_order_id: razorpayOrderId,
          p_payment_id: razorpayPaymentId,
          p_amount_paise: payment.amount,
          p_currency: payment.currency,
          p_payment_method: payment.method ?? null,
          p_payment_status: payment.status,
          p_razorpay_signature: razorpaySignature,
        });

        if (
          reconciliationError ||
          reconciliationResult?.success !== true ||
          reconciliationResult?.payment_record_saved !== true
        ) {
          console.error("Atomic payment reconciliation failed.", {
            userId,
            chalegaOrderId: chalegaOrder.id,
            razorpayOrderId,
            razorpayPaymentId,
            error: reconciliationError,
            result: reconciliationResult,
          });

          return jsonResponse(
            {
              success: false,
              verified: false,
              error: "Payment was verified but database reconciliation could not be confirmed.",
            },
            500,
          );
        }

        console.info("Razorpay payment fully verified and atomically reconciled.", {
          userId,
          chalegaOrderId: chalegaOrder.id,
          publicOrderId: chalegaOrder.order_id,
          razorpayOrderId,
          razorpayPaymentId,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
        });

        return jsonResponse({
          success: true,
          verified: true,
          captured: true,
          reconciled: true,
          payment_record_saved: true,
          order: {
            id: chalegaOrder.id,
            order_id: chalegaOrder.order_id,
            payment_status: "paid",
          },
          payment: {
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            method: payment.method ?? null,
          },
        });
      } catch (error) {
        console.error(
          "verify-razorpay-payment error:",
          error,
        );

        return jsonResponse(
          {
            success: false,
            verified: false,
            error:
              "Unexpected error while verifying payment.",
          },
          500,
        );
      }
    },
  ),
};
