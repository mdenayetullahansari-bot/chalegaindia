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
        const body = (await req.json()) as Partial<RecoveryRequest>;
        const chalegaOrderId = body.chalega_order_id?.trim();
        const razorpayOrderId = body.razorpay_order_id?.trim();

        if (!chalegaOrderId || !razorpayOrderId) {
          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "Missing recovery fields.",
            },
            400,
          );
        }

        const userId = ctx.userClaims.id;
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
            "id,order_id,user_id,total,payment_status,payment_method,razorpay_order_id,razorpay_payment_id,razorpay_signature",
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

        if (order.payment_status === "paid" && order.razorpay_payment_id) {
          return jsonResponse({
            success: true,
            recovered: true,
            already_reconciled: true,
            payment: {
              razorpay_order_id: razorpayOrderId,
              razorpay_payment_id: order.razorpay_payment_id,
            },
          });
        }

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

        const expectedAmountPaise = Math.round(Number(order.total) * 100);

        const payment = items.find(
          (candidate) =>
            candidate.order_id === razorpayOrderId &&
            candidate.currency === "INR" &&
            candidate.amount === expectedAmountPaise &&
            (candidate.status === "captured" || candidate.captured === true),
        );

        if (!payment) {
          return jsonResponse({
            success: false,
            recovered: false,
            captured: false,
            error: "No captured payment matching this Chalega order was found.",
          });
        }

        const { data: updatedOrder, error: updateError } = await admin
          .from("orders")
          .update({
            payment_status: "paid",
            razorpay_payment_id: payment.id,
          })
          .eq("id", order.id)
          .eq("user_id", userId)
          .eq("razorpay_order_id", razorpayOrderId)
          .neq("payment_status", "paid")
          .select("id,order_id,payment_status,razorpay_order_id,razorpay_payment_id")
          .maybeSingle();

        if (updateError) {
          console.error("Recovery failed to mark order paid.", {
            userId,
            chalegaOrderId,
            razorpayOrderId,
            paymentId: payment.id,
            error: updateError,
          });
          return jsonResponse(
            {
              success: false,
              recovered: false,
              error: "Payment was found but the order could not be updated.",
            },
            500,
          );
        }

        if (!updatedOrder) {
          const { data: currentOrder } = await admin
            .from("orders")
            .select("id,order_id,payment_status,razorpay_payment_id")
            .eq("id", order.id)
            .eq("user_id", userId)
            .maybeSingle();

          if (
            currentOrder?.payment_status !== "paid" ||
            currentOrder.razorpay_payment_id !== payment.id
          ) {
            return jsonResponse(
              {
                success: false,
                recovered: false,
                error: "Payment was found but order reconciliation could not be confirmed.",
              },
              500,
            );
          }
        }

        const { error: paymentRecordError } = await admin
          .from("payment_records")
          .upsert(
            {
              order_id: order.id,
              provider: "razorpay",
              razorpay_order_id: razorpayOrderId,
              razorpay_payment_id: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              payment_method: payment.method ?? null,
              status: payment.status,
            },
            { onConflict: "razorpay_payment_id" },
          );

        if (paymentRecordError) {
          console.error(
            "Payment recovered and order marked paid, but audit record needs reconciliation.",
            {
              userId,
              chalegaOrderId,
              razorpayOrderId,
              paymentId: payment.id,
              error: paymentRecordError,
            },
          );
        }

        return jsonResponse({
          success: true,
          recovered: true,
          captured: true,
          payment_record_saved: !paymentRecordError,
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
