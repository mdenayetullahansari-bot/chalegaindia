alter table public.orders
  add constraint orders_subtotal_nonnegative
    check (subtotal >= 0),
  add constraint orders_delivery_fee_nonnegative
    check (delivery_fee >= 0),
  add constraint orders_total_nonnegative
    check (total >= 0),
  add constraint orders_total_matches_components
    check (total = subtotal + delivery_fee),
  add constraint orders_status_valid
    check (status in (
      'Order Received',
      'Preparing',
      'Out for Delivery',
      'Delivered',
      'Completed'
    )),
  add constraint orders_payment_method_valid
    check (payment_method in (
      'COD',
      'Razorpay'
    )),
  add constraint orders_payment_status_valid
    check (payment_status in (
      'pending',
      'paid',
      'failed',
      'refunded'
    ));
