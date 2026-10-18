import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSupabase } from "jsr:@supabase/server";

interface RecoveryRequest {
  chalega_order_id: string;
  razorpay_order_id: string;
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
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status });
}

function authHeader(keyId: string, keySecret: string) {
  return `Basic ${btoa(`${keyId}:${keySecret}`)}`;
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      if (req.method !== "POST") {
        return jsonResponse(
          { success: false, recovered: false, error: "Method not allowed" },
          405,
        );
      }

      try {
        const body: unknown = await req.json();

        if (
          body === null ||
          typeof body !== "object" ||
          Array.isArray(body)
        ) {
          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "Invalid request body.",
            },
            400,
          );
        }

        const request = body as Partial<RecoveryRequest>;

        const chalegaOrderId =
          typeof request.chalega_order_id === "string"
            ? request.chalega_order_id.trim()
            : "";

        const razorpayOrderId =
          typeof request.razorpay_order_id === "string"
            ? request.razorpay_order_id.trim()
            : "";

        if (!chalegaOrderId || !razorpayOrderId) {
          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "Missing or invalid recovery fields.",
            },
            400,
          );
        }

        const userId = ctx.userClaims?.id;

        if (typeof userId !== "string" || !userId.trim()) {
          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "Authentication required.",
            },
            401,
          );
        }
        const supabaseUrl = Deno.env.get("SUPABASE_URL");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const keyId = Deno.env.get("RAZORPAY_KEY_ID");
        const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

        if (!supabaseUrl || !serviceRoleKey || !keyId || !keySecret) {
          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "Payment recovery is not configured.",
            },
            500,
          );
        }

        const admin = createClient(
          supabaseUrl,
          serviceRoleKey,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          },
        );

        const { data: order, error: orderError } = await admin
          .from("orders")
          .select(
            "id,order_id,user_id,total,status,payment_status,payment_method,razorpay_order_id,razorpay_payment_id,razorpay_signature",
          )
          .eq("id", chalegaOrderId)
          .eq("user_id", userId)
          .maybeSingle();

        if (orderError) {
          console.error("Recovery order lookup failed.", {
            userId,
            chalegaOrderId,
            error: orderError,
          });
          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "Unable to load the order.",
            },
            500,
          );
        }

        if (!order) {
          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "Chalega order not found.",
            },
            404,
          );
        }

        if (order.status === "Cancelled") {
  return jsonResponse(
    {
      success: false,
      recovered: false,
      error: "Order is cancelled; payment requires manual resolution.",
    },
    409,
  );
}
if (
          order.payment_method !== "Razorpay" ||
          order.razorpay_order_id !== razorpayOrderId
        ) {
          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "Payment does not belong to this Chalega order.",
            },
            400,
          );
        }

        // If the order is already paid, recovery must verify its exact payment
        // ID and still check whether the payment audit record needs repair.
        const alreadyPaidPaymentId =
          order.payment_status === "paid" && order.razorpay_payment_id
            ? order.razorpay_payment_id
            : null;

        /*
         * Recovery deliberately does NOT trust the browser response.
         * Razorpay is queried directly for every payment belonging to
         * this exact Razorpay order, then the exact INR amount and
         * captured status are validated before Chalega is marked paid.
         */
        const paymentsResponse = await fetch(
          `https://api.razorpay.com/v1/orders/${encodeURIComponent(
            razorpayOrderId,
          )}/payments`,
          {
            method: "GET",
            headers: {
              Authorization: authHeader(keyId, keySecret),
              Accept: "application/json",
            },
          },
        );

        const paymentsData = await paymentsResponse.json();

        if (!paymentsResponse.ok) {
          console.error("Razorpay recovery lookup failed.", {
            userId,
            chalegaOrderId,
            razorpayOrderId,
            razorpayStatus: paymentsResponse.status,
            razorpayError: paymentsData,
          });
          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "Unable to check the payment with Razorpay.",
            },
            502,
          );
        }

        const items = Array.isArray(paymentsData?.items)
          ? (paymentsData.items as RazorpayPayment[])
          : [];

        const orderTotal = Number(order.total);
        const orderTotalPaise = Math.round(orderTotal * 100);

        if (
          !Number.isFinite(orderTotal) ||
          orderTotal <= 0 ||
          Math.round(orderTotal * 100) / 100 !== orderTotal ||
          !Number.isSafeInteger(orderTotal * 100) ||
          !Number.isSafeInteger(orderTotalPaise) ||
          orderTotalPaise > 99999999
        ) {
          console.error("Recovery rejected an invalid order total.", {
            userId,
            chalegaOrderId,
            razorpayOrderId,
            orderTotal: order.total,
          });
          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "The order total is invalid for payment recovery.",
            },
            400,
          );
        }

        const expectedAmountPaise = orderTotalPaise;

        const matchingPayments = items.filter(
          (candidate) =>
            candidate !== null &&
            typeof candidate === "object" &&
            candidate.entity === "payment" &&
            typeof candidate.id === "string" &&
            candidate.id.length > 0 &&
            typeof candidate.order_id === "string" &&
            candidate.order_id === razorpayOrderId &&
            typeof candidate.amount === "number" &&
            Number.isSafeInteger(candidate.amount) &&
            candidate.amount > 0 &&
            candidate.amount === expectedAmountPaise &&
            candidate.currency === "INR" &&
            typeof candidate.status === "string" &&
            candidate.status === "captured",
        );

        const uniqueMatchingPayments = [
          ...new Map(matchingPayments.map((item) => [item.id, item])).values(),
        ];

        if (uniqueMatchingPayments.length > 1) {
          console.error("Multiple captured payments match one Chalega order.", {
            userId,
            chalegaOrderId,
            razorpayOrderId,
            paymentIds: uniqueMatchingPayments.map((item) => item.id),
          });

          return jsonResponse(
            {
              success: false,
              recovered: false,
              captured: true,
              error: "Multiple captured payments were found; manual review is required.",
            },
            409,
          );
        }

        const payment = alreadyPaidPaymentId
          ? uniqueMatchingPayments.find(
              (candidate) => candidate.id === alreadyPaidPaymentId,
            )
          : uniqueMatchingPayments[0];

        if (!payment) {
          return jsonResponse({
            success: false,
            recovered: false,
            captured: false,
            error: "No captured payment matching this Chalega order was found.",
          });
        }

        // Reconcile the order and payment record atomically in PostgreSQL.
        const {
          data: reconciliationResult,
          error: reconciliationError,
        } = await admin.rpc("reconcile_razorpay_payment", {
          p_order_id: order.id,
          p_user_id: userId,
          p_razorpay_order_id: razorpayOrderId,
          p_payment_id: payment.id,
          p_amount_paise: payment.amount,
          p_currency: payment.currency,
          p_payment_method: payment.method ?? null,
          p_payment_status: payment.status,
        });

        if (
          reconciliationError ||
          reconciliationResult?.success !== true ||
          reconciliationResult?.payment_record_saved !== true
        ) {
          console.error("Atomic payment reconciliation failed.", {
            userId,
            chalegaOrderId,
            razorpayOrderId,
            paymentId: payment.id,
            error: reconciliationError,
            result: reconciliationResult,
          });

          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "Payment was verified but database reconciliation could not be confirmed.",
            },
            500,
          );
        }

        const paymentRecordSaved = reconciliationResult.payment_record_saved === true;

        return jsonResponse({
          success: true,
          recovered: true,
          captured: true,
          payment_record_saved: paymentRecordSaved,
          order: {
            id: order.id,
            order_id: order.order_id,
            payment_status: "paid",
          },
          payment: {
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            method: payment.method ?? null,
          },
        });
      } catch (error) {
        console.error("recover-razorpay-payment error:", error);
        return jsonResponse(
          {
            success: false,
            recovered: false,
            error: "Unexpected error while recovering payment.",
          },
          500,
        );
      }
    },
  ),
};
