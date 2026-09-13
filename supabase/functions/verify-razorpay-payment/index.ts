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

        const userId =
          ctx.userClaims.sub;

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
          .select(
            [
              "id",
              "order_id",
              "user_id",
              "total",
              "payment_status",
              "payment_method",
              "razorpay_order_id",
              "razorpay_payment_id",
              "razorpay_signature",
            ].join(","),
          )
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
          !Number.isFinite(
            orderTotalRupees,
          ) ||
          orderTotalRupees <= 0
        ) {
          console.error(
            "Invalid Chalega order total.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              total:
                chalegaOrder.total,
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "The Chalega order has an invalid total.",
            },
            400,
          );
        }

        const expectedAmountPaise =
          Math.round(
            orderTotalRupees * 100,
          );

        if (
          payment.amount !==
          expectedAmountPaise
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
         * 9. Idempotency / replay protection.
         * -------------------------------------------------------
         *
         * If the same payment has already been recorded, return
         * success instead of creating another payment record.
         */
        const {
          data: existingPayment,
          error:
            existingPaymentError,
        } = await adminSupabase
          .from("payment_records")
          .select(
            "id, order_id, razorpay_order_id, razorpay_payment_id, amount, currency, status",
          )
          .eq(
            "razorpay_payment_id",
            razorpayPaymentId,
          )
          .maybeSingle();

        if (existingPaymentError) {
          console.error(
            "Failed to check existing payment record.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              razorpayPaymentId,
              error:
                existingPaymentError,
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Unable to check payment history.",
            },
            500,
          );
        }

        if (existingPayment) {
          if (
            existingPayment.order_id !==
            chalegaOrder.id
          ) {
            console.error(
              "Payment ID is already attached to a different order.",
              {
                userId,
                chalegaOrderId:
                  chalegaOrder.id,
                razorpayPaymentId,
                existingOrderId:
                  existingPayment.order_id,
              },
            );

            return jsonResponse(
              {
                success: false,
                verified: false,
                error:
                  "This payment is already attached to another order.",
              },
              409,
            );
          }

          console.info(
            "Payment verification replay detected; returning existing success.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              razorpayPaymentId,
            },
          );

          return jsonResponse({
            success: true,
            verified: true,
            captured: true,
            already_recorded: true,
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
              method:
                payment.method ??
                null,
            },
          });
        }

        /*
         * -------------------------------------------------------
         * 10. Reconcile the Chalega order.
         * -------------------------------------------------------
         *
         * We use a guarded update:
         * - exact order UUID
         * - exact authenticated user
         * - exact Razorpay order ID
         *
         * The payment status is changed by the server only.
         */
        const {
          data: updatedOrder,
          error:
            updateOrderError,
        } = await adminSupabase
          .from("orders")
          .update({
            payment_status:
              "paid",
            razorpay_payment_id:
              razorpayPaymentId,
            razorpay_signature:
              razorpaySignature,
          })
          .eq(
            "id",
            chalegaOrder.id,
          )
          .eq(
            "user_id",
            userId,
          )
          .eq(
            "razorpay_order_id",
            razorpayOrderId,
          )
          .select(
            "id, order_id, payment_status, razorpay_order_id, razorpay_payment_id",
          )
          .maybeSingle();

        if (updateOrderError) {
          console.error(
            "Failed to mark Chalega order as paid.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              razorpayOrderId,
              razorpayPaymentId,
              error:
                updateOrderError,
            },
          );

          return jsonResponse(
            {
              success: false,
              verified: false,
              error:
                "Payment was verified but the order could not be updated.",
            },
            500,
          );
        }

        if (!updatedOrder) {
          /*
           * This can occur if another request reconciled the order
           * between our initial read and this update.
           *
           * Re-read it before treating the operation as a failure.
           */
          const {
            data: currentOrder,
            error:
              currentOrderError,
          } = await adminSupabase
            .from("orders")
            .select(
              "id, order_id, user_id, payment_status, razorpay_order_id, razorpay_payment_id",
            )
            .eq(
              "id",
              chalegaOrder.id,
            )
            .eq(
              "user_id",
              userId,
            )
            .maybeSingle();

          if (currentOrderError) {
            console.error(
              "Failed to re-read Chalega order after guarded update.",
              {
                userId,
                chalegaOrderId:
                  chalegaOrder.id,
                error:
                  currentOrderError,
              },
            );

            return jsonResponse(
              {
                success: false,
                verified: false,
                error:
                  "Payment was verified but order reconciliation could not be confirmed.",
              },
              500,
            );
          }

          if (
            currentOrder?.payment_status ===
              "paid" &&
            currentOrder.razorpay_payment_id ===
              razorpayPaymentId
          ) {
            console.info(
              "Concurrent payment reconciliation detected.",
              {
                userId,
                chalegaOrderId:
                  chalegaOrder.id,
                razorpayPaymentId,
              },
            );
          } else {
            return jsonResponse(
              {
                success: false,
                verified: false,
                error:
                  "Payment was verified but order reconciliation could not be completed.",
              },
              500,
            );
          }
        }

        /*
         * -------------------------------------------------------
         * 11. Create the payment audit record.
         * -------------------------------------------------------
         *
         * amount is stored in paise here because it is the exact
         * amount returned by Razorpay.
         */
        const {
          error:
            paymentRecordError,
        } = await adminSupabase
          .from("payment_records")
          .insert({
            order_id:
              chalegaOrder.id,
            provider:
              "razorpay",
            razorpay_order_id:
              razorpayOrderId,
            razorpay_payment_id:
              razorpayPaymentId,
            razorpay_signature:
              razorpaySignature,
            amount:
              payment.amount,
            currency:
              payment.currency,
            payment_method:
              payment.method ??
              null,
            status:
              payment.status,
          });

        if (paymentRecordError) {
          /*
           * The order is already marked paid at this point.
           * Never tell the customer the payment failed merely
           * because the audit insert failed.
           *
           * Log it clearly so it can be repaired/reconciled.
           */
          console.error(
            "Payment verified and order marked paid, but payment record insertion failed.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              razorpayOrderId,
              razorpayPaymentId,
              error:
                paymentRecordError,
            },
          );

          return jsonResponse(
            {
              success: true,
              verified: true,
              captured: true,
              reconciled: true,
              payment_record_saved:
                false,
              warning:
                "Payment was verified and the order was marked paid. Payment audit record requires reconciliation.",
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
                method:
                  payment.method ??
                  null,
              },
            },
          );
        }

        console.info(
          "Razorpay payment fully verified and reconciled.",
          {
            userId,
            chalegaOrderId:
              chalegaOrder.id,
            publicOrderId:
              chalegaOrder.order_id,
            razorpayOrderId,
            razorpayPaymentId,
            amount:
              payment.amount,
            currency:
              payment.currency,
            status:
              payment.status,
          },
        );

        return jsonResponse({
          success: true,
          verified: true,
          captured: true,
          reconciled: true,
          payment_record_saved:
            true,
          order: {
            id:
              chalegaOrder.id,
            order_id:
              chalegaOrder.order_id,
            payment_status:
              "paid",
          },
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
            method:
              payment.method ??
              null,
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