import AsyncStorage from '@react-native-async-storage/async-storage';

export type Cart = Record<string, number>;

export const CART_KEY = 'chalega_cart';

export async function getCart(): Promise<Cart> {
  try {
    const saved = await AsyncStorage.getItem(CART_KEY);

    if (!saved) {
      return {};
    }

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return {};
    }

    const cart: Cart = {};

    for (const [productId, quantity] of Object.entries(
      parsed
    )) {
      if (
        typeof quantity === 'number' &&
        Number.isFinite(quantity) &&
        quantity > 0
      ) {
        cart[productId] = Math.floor(quantity);
      }
    }

    return cart;
  } catch (error) {
    console.log('Failed to load cart:', error);
    return {};
  }
}

export async function saveCart(cart: Cart): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CART_KEY,
      JSON.stringify(cart)
    );
  } catch (error) {
    console.log('Failed to save cart:', error);
    throw error;
  }
}

export async function addToCart(
  productId: string,
  quantity = 1
): Promise<Cart> {
  const current = await getCart();

  const safeQuantity =
    Number.isFinite(quantity) && quantity > 0
      ? Math.floor(quantity)
      : 1;

  const next: Cart = {
    ...current,
    [productId]:
      (current[productId] || 0) + safeQuantity,
  };

  await saveCart(next);

  return next;
}

export async function removeFromCart(
  productId: string,
  quantity = 1
): Promise<Cart> {
  const current = await getCart();

  const safeQuantity =
    Number.isFinite(quantity) && quantity > 0
      ? Math.floor(quantity)
      : 1;

  const currentQuantity =
    current[productId] || 0;

  const next = {
    ...current,
  };

  const remaining =
    currentQuantity - safeQuantity;

  if (remaining > 0) {
    next[productId] = remaining;
  } else {
    delete next[productId];
  }

  await saveCart(next);

  return next;
}

export async function removeProductFromCart(
  productId: string
): Promise<Cart> {
  const current = await getCart();

  const next = {
    ...current,
  };

  delete next[productId];

  await saveCart(next);

  return next;
}

export async function clearCart(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CART_KEY);
  } catch (error) {
    console.log('Failed to clear cart:', error);
    throw error;
  }
}