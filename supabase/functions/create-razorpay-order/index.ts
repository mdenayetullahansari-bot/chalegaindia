import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { withSupabase } from "jsr:@supabase/server";

interface CreateRazorpayOrderRequest {
  order_id: string;
}

interface ChalegaOrder {
  id: string;
  order_id: string;
  user_id: string | null;
  total: number;
  payment_status: string;
  payment_method: string;
  razorpay_order_id: string | null;
}

export default {
  fetch: withSupabase(
    { auth: "user" },
    async (req, ctx) => {
      if (req.method !== "POST") {
        return Response.json(
          {
            success: false,
            error: "Method not allowed",
          },
          { status: 405 }
        );
      }

      try {
        const body =
          (await req.json()) as Partial<CreateRazorpayOrderRequest>;

        const chalegaOrderId =
          body.order_id?.trim();

        if (!chalegaOrderId) {
          return Response.json(
            {
              success: false,
              error: "Chalega order ID is required.",
            },
            { status: 400 }
          );
        }

        const supabaseUrl =
          Deno.env.get("SUPABASE_URL");

        const serviceRoleKey =
          Deno.env.get(
            "SUPABASE_SERVICE_ROLE_KEY"
          );

        const keyId =
          Deno.env.get("RAZORPAY_KEY_ID");

        const keySecret =
          Deno.env.get("RAZORPAY_KEY_SECRET");

        if (
          !supabaseUrl ||
          !serviceRoleKey ||
          !keyId ||
          !keySecret
        ) {
          console.error(
            "Required Razorpay order secrets are missing."
          );

          return Response.json(
            {
              success: false,
              error:
                "Payment service is not configured.",
            },
            { status: 500 }
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
            }
          );

        const userId =
          ctx.userClaims.sub;

        /*
         * -------------------------------------------------------
         * 1. Load the Chalega order belonging to the caller.
         * -------------------------------------------------------
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
            ].join(",")
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
            }
          );

          return Response.json(
            {
              success: false,
              error:
                "Unable to load the order.",
            },
            { status: 500 }
          );
        }

        if (!order) {
          return Response.json(
            {
              success: false,
              error:
                "Chalega order not found.",
            },
            { status: 404 }
          );
        }

        const chalegaOrder =
          order as ChalegaOrder;

        /*
         * -------------------------------------------------------
         * 2. Validate the order before creating payment.
         * -------------------------------------------------------
         */

        if (
          chalegaOrder.payment_method !==
          "Razorpay"
        ) {
          return Response.json(
            {
              success: false,
              error:
                "This order is not configured for online payment.",
            },
            { status: 400 }
          );
        }

        if (
          chalegaOrder.payment_status ===
          "paid"
        ) {
          return Response.json(
            {
              success: false,
              error:
                "This order has already been paid.",
            },
            { status: 409 }
          );
        }

        /*
         * -------------------------------------------------------
         * 3. Reuse an existing Razorpay order when possible.
         * -------------------------------------------------------
         */

        if (
          chalegaOrder.razorpay_order_id
        ) {
          const existingResponse =
            await fetch(
              `https://api.razorpay.com/v1/orders/${encodeURIComponent(
                chalegaOrder.razorpay_order_id
              )}`,
              {
                method: "GET",
                headers: {
                  Authorization:
                    `Basic ${btoa(
                      `${keyId}:${keySecret}`
                    )}`,
                  Accept:
                    "application/json",
                },
              }
            );

          if (existingResponse.ok) {
            const existingOrder =
              await existingResponse.json();

            if (
              Number(
                existingOrder.amount
              ) ===
                Math.round(
                  Number(
                    chalegaOrder.total
                  ) * 100
                ) &&
              existingOrder.currency ===
                "INR"
            ) {
              return Response.json({
                success: true,
                id: existingOrder.id,
                amount:
                  existingOrder.amount,
                currency:
                  existingOrder.currency,
                receipt:
                  existingOrder.receipt,
                status:
                  existingOrder.status,
                key_id: keyId,
                chalega_order_id:
                  chalegaOrder.id,
                reused: true,
              });
            }
          }

          console.warn(
            "Existing Razorpay order could not be safely reused.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              razorpayOrderId:
                chalegaOrder.razorpay_order_id,
            }
          );
        }

        /*
         * -------------------------------------------------------
         * 4. Read the amount ONLY from the server-side order.
         * -------------------------------------------------------
         *
         * Chalega stores total in rupees.
         * Razorpay requires paise.
         */

        const orderTotalRupees =
          Number(
            chalegaOrder.total
          );

        if (
          !Number.isFinite(
            orderTotalRupees
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
            }
          );

          return Response.json(
            {
              success: false,
              error:
                "The order has an invalid total.",
            },
            { status: 400 }
          );
        }

        const amount =
          Math.round(
            orderTotalRupees * 100
          );

        if (amount < 100) {
          return Response.json(
            {
              success: false,
              error:
                "The payment amount is below the Razorpay minimum.",
            },
            { status: 400 }
          );
        }

        /*
         * -------------------------------------------------------
         * 5. Create Razorpay order.
         * -------------------------------------------------------
         */

        const receipt =
          `chalega_${chalegaOrder.order_id}`;

        const razorpayResponse =
          await fetch(
            "https://api.razorpay.com/v1/orders",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization:
                  `Basic ${btoa(
                    `${keyId}:${keySecret}`
                  )}`,
              },
              body: JSON.stringify({
                amount,
                currency: "INR",
                receipt,
                notes: {
                  app:
                    "Chalega India",
                  user_id:
                    userId,
                  chalega_order_id:
                    chalegaOrder.id,
                  public_order_id:
                    chalegaOrder.order_id,
                },
              }),
            }
          );

        const razorpayData =
          await razorpayResponse.json();

        if (!razorpayResponse.ok) {
          console.error(
            "Razorpay order creation failed.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              razorpayStatus:
                razorpayResponse.status,
              razorpayError:
                razorpayData,
            }
          );

          return Response.json(
            {
              success: false,
              error:
                "Unable to create Razorpay order.",
            },
            {
              status:
                razorpayResponse.status,
            }
          );
        }

        /*
         * -------------------------------------------------------
         * 6. Save Razorpay order ID against the exact
         *    authenticated Chalega order.
         * -------------------------------------------------------
         */

        const {
          data: updatedOrder,
          error:
            updateOrderError,
        } = await adminSupabase
          .from("orders")
          .update({
            razorpay_order_id:
              razorpayData.id,
          })
          .eq(
            "id",
            chalegaOrder.id
          )
          .eq(
            "user_id",
            userId
          )
          .eq(
            "payment_status",
            "pending"
          )
          .select(
            "id, order_id, razorpay_order_id"
          )
          .maybeSingle();

        if (updateOrderError) {
          console.error(
            "Failed to save Razorpay order ID.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              razorpayOrderId:
                razorpayData.id,
              error:
                updateOrderError,
            }
          );

          return Response.json(
            {
              success: false,
              error:
                "Razorpay order was created but could not be linked to the Chalega order.",
            },
            { status: 500 }
          );
        }

        if (!updatedOrder) {
          console.error(
            "Razorpay order was created but Chalega order could not be updated.",
            {
              userId,
              chalegaOrderId:
                chalegaOrder.id,
              razorpayOrderId:
                razorpayData.id,
            }
          );

          return Response.json(
            {
              success: false,
              error:
                "Razorpay order was created but could not be linked to the Chalega order.",
            },
            { status: 500 }
          );
        }

        return Response.json({
          success: true,
          id:
            razorpayData.id,
          amount:
            razorpayData.amount,
          currency:
            razorpayData.currency,
          receipt:
            razorpayData.receipt,
          status:
            razorpayData.status,
          key_id:
            keyId,
          chalega_order_id:
            chalegaOrder.id,
          reused: false,
        });
      } catch (error) {
        console.error(
          "create-razorpay-order error:",
          error
        );

        return Response.json(
          {
            success: false,
            error:
              "Unexpected error while creating payment order.",
          },
          { status: 500 }
        );
      }
    }
  ),
};