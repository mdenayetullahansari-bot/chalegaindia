import React, { useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  emoji: string;
  description: string;
};

const products: Product[] = [
  {
    id: '1',
    name: 'Chalega India Water Bottle',
    price: 399,
    category: 'Hydration',
    emoji: '💧',
    description: 'Reusable bottle for everyday hydration.',
  },
  {
    id: '2',
    name: 'Chalega India Walking T-Shirt',
    price: 699,
    category: 'Fitness',
    emoji: '👕',
    description: 'Comfortable T-shirt for walking and exercise.',
  },
  {
    id: '3',
    name: 'Healthy Snack Pack',
    price: 249,
    category: 'Healthy Food',
    emoji: '🥜',
    description: 'A convenient everyday healthy snack option.',
  },
  {
    id: '4',
    name: 'Fresh Fruit Box',
    price: 499,
    category: 'Fruits',
    emoji: '🍎',
    description: 'Seasonal fresh fruits packed for your home.',
  },
  {
    id: '5',
    name: 'Dry Fruits Wellness Pack',
    price: 599,
    category: 'Healthy Food',
    emoji: '🥜',
    description: 'A selection of dry fruits for everyday snacking.',
  },
  {
    id: '6',
    name: 'Morning Fruit Basket',
    price: 699,
    category: 'Fruits',
    emoji: '🍊',
    description: 'A family-friendly selection of fresh fruits.',
  },
  {
    id: '7',
    name: 'Walking Cap',
    price: 299,
    category: 'Fitness',
    emoji: '🧢',
    description: 'Lightweight cap for outdoor walks.',
  },
  {
    id: '8',
    name: 'Healthy Home Kit',
    price: 899,
    category: 'Home Health',
    emoji: '🏠',
    description: 'Simple essentials for a healthier home.',
  },
  {
    id: '9',
    name: 'Family Health Combo',
    price: 999,
    category: 'Health Combos',
    emoji: '🎁',
    description: 'A useful combination of everyday wellness products.',
  },
  {
    id: '10',
    name: 'Walking Starter Combo',
    price: 1199,
    category: 'Health Combos',
    emoji: '🚶',
    description: 'Everything you need to get started with walking.',
  },
];

const categories = [
  { name: 'All', emoji: '✨' },
  { name: 'Healthy Food', emoji: '🥗' },
  { name: 'Fruits', emoji: '🍎' },
  { name: 'Hydration', emoji: '💧' },
  { name: 'Fitness', emoji: '🚶' },
  { name: 'Home Health', emoji: '🏠' },
  { name: 'Health Combos', emoji: '🎁' },
];

export default function ShopScreen() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCart, setShowCart] = useState(false);

  const filteredProducts = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    return products.filter((product) => {
      const categoryMatch =
        selectedCategory === 'All' ||
        product.category === selectedCategory;

      const searchMatch =
        !searchText ||
        product.name.toLowerCase().includes(searchText) ||
        product.category.toLowerCase().includes(searchText);

      return categoryMatch && searchMatch;
    });
  }, [selectedCategory, search]);

  const cartProducts = products.filter(
    (product) => (cart[product.id] || 0) > 0
  );

  const cartItemCount = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0
  );

  const cartTotal = cartProducts.reduce(
    (total, product) =>
      total + product.price * (cart[product.id] || 0),
    0
  );

  const addToCart = (product: Product) => {
    setCart((current) => ({
      ...current,
      [product.id]: (current[product.id] || 0) + 1,
    }));
  };

  const removeOne = (productId: string) => {
    setCart((current) => {
      const quantity = current[productId] || 0;

      if (quantity <= 1) {
        const next = { ...current };
        delete next[productId];
        return next;
      }

      return {
        ...current,
        [productId]: quantity - 1,
      };
    });
  };

  const removeProduct = (productId: string) => {
    setCart((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  };

  const goToCheckout = () => {
    if (cartItemCount === 0) {
      Alert.alert(
        'Your cart is empty',
        'Please add a product before checkout.'
      );
      return;
    }

    router.push({
      pathname: '/checkout',
      params: {
        total: cartTotal.toString(),
        items: cartItemCount.toString(),
        cart: JSON.stringify(cart),
      },
    });
  };

  /*
   * CART SCREEN
   */

  if (showCart) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cartHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowCart(false)}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.cartTitle}>Your Cart</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cartContent}
        >
          {cartProducts.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyEmoji}>🛒</Text>

              <Text style={styles.emptyTitle}>
                Your cart is empty
              </Text>

              <Text style={styles.emptyText}>
                Add some healthy products to continue.
              </Text>

              <TouchableOpacity
                style={styles.shopButton}
                onPress={() => setShowCart(false)}
              >
                <Text style={styles.shopButtonText}>
                  CONTINUE SHOPPING
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {cartProducts.map((product) => {
                const quantity = cart[product.id] || 0;

                return (
                  <View
                    key={product.id}
                    style={styles.cartProduct}
                  >
                    <View style={styles.cartEmojiBox}>
                      <Text style={styles.cartEmoji}>
                        {product.emoji}
                      </Text>
                    </View>

                    <View style={styles.cartProductInfo}>
                      <Text style={styles.cartProductName}>
                        {product.name}
                      </Text>

                      <Text style={styles.cartProductPrice}>
                        ₹{product.price.toLocaleString('en-IN')}
                      </Text>

                      <View style={styles.quantityRow}>
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            removeOne(product.id)
                          }
                        >
                          <Text style={styles.quantityButtonText}>
                            −
                          </Text>
                        </TouchableOpacity>

                        <Text style={styles.quantityNumber}>
                          {quantity}
                        </Text>

                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() =>
                            addToCart(product)
                          }
                        >
                          <Text style={styles.quantityButtonText}>
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() =>
                        removeProduct(product.id)
                      }
                    >
                      <Text style={styles.removeText}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}

              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>
                  {cartItemCount} item
                  {cartItemCount === 1 ? '' : 's'}
                </Text>

                <Text style={styles.totalAmount}>
                  ₹{cartTotal.toLocaleString('en-IN')}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutButton}
                onPress={goToCheckout}
              >
                <Text style={styles.checkoutText}>
                  PROCEED TO CHECKOUT →
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  /*
   * MAIN SHOP SCREEN
   */

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >

        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerBrandBox}>
            <Text style={styles.brand}>
              C H A L E G A  I N D I A
            </Text>

            <Text style={styles.title}>
              Health Shop
            </Text>

            <Text style={styles.subtitle}>
              Healthy choices for everyday life.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.cartIcon}
            onPress={() => setShowCart(true)}
          >
            <Text style={styles.cartIconEmoji}>
              🛒
            </Text>

            {cartItemCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>
                  {cartItemCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* MY ORDERS BUTTON */}

        <TouchableOpacity
          style={styles.ordersButton}
          onPress={() => router.push('/customer-orders')}
        >
          <View style={styles.ordersButtonIcon}>
            <Text style={styles.ordersButtonIconText}>
              📦
            </Text>
          </View>

          <View style={styles.ordersButtonContent}>
            <Text style={styles.ordersButtonTitle}>
              My Orders
            </Text>

            <Text style={styles.ordersButtonSubtitle}>
              View and track your previous orders
            </Text>
          </View>

          <Text style={styles.ordersArrow}>
            →
          </Text>
        </TouchableOpacity>

        {/* SEARCH */}

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search health products..."
            placeholderTextColor="#999999"
            style={styles.searchInput}
          />
        </View>

        {/* CATEGORIES */}

        <Text style={styles.sectionTitle}>
          Shop by category
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          {categories.map((category) => {
            const selected =
              selectedCategory === category.name;

            return (
              <TouchableOpacity
                key={category.name}
                style={[
                  styles.category,
                  selected && styles.categorySelected,
                ]}
                onPress={() =>
                  setSelectedCategory(category.name)
                }
              >
                <Text style={styles.categoryEmoji}>
                  {category.emoji}
                </Text>

                <Text
                  style={[
                    styles.categoryText,
                    selected && styles.categoryTextSelected,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* BANNER */}

        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>
            ❤️
          </Text>

          <View style={styles.bannerTextBox}>
            <Text style={styles.bannerSmall}>
              HEALTHY LIVING
            </Text>

            <Text style={styles.bannerTitle}>
              Har kadam zaroori hai.
              {'\n'}
              Har choice bhi.
            </Text>
          </View>
        </View>

        {/* PRODUCTS */}

        <View style={styles.productsHeader}>
          <Text style={styles.sectionTitle}>
            Products
          </Text>

          <Text style={styles.productCount}>
            {filteredProducts.length} products
          </Text>
        </View>

        {filteredProducts.map((product) => {
          const quantity = cart[product.id] || 0;

          return (
            <View
              key={product.id}
              style={styles.productCard}
            >
              <TouchableOpacity
                style={styles.productImage}
                onPress={() =>
                  router.push({
                    pathname: '/product',
                    params: {
                      id: product.id,
                    },
                  })
                }
              >
                <Text style={styles.productEmoji}>
                  {product.emoji}
                </Text>
              </TouchableOpacity>

              <View style={styles.productInfo}>
                <Text style={styles.productCategory}>
                  {product.category.toUpperCase()}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/product',
                      params: {
                        id: product.id,
                      },
                    })
                  }
                >
                  <Text style={styles.productName}>
                    {product.name}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.productDescription}>
                  {product.description}
                </Text>

                <View style={styles.productBottom}>
                  <Text style={styles.productPrice}>
                    ₹{product.price.toLocaleString('en-IN')}
                  </Text>

                  {quantity === 0 ? (
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() =>
                        addToCart(product)
                      }
                    >
                      <Text style={styles.addButtonText}>
                        + ADD
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.miniQuantity}>
                      <TouchableOpacity
                        style={styles.miniButton}
                        onPress={() =>
                          removeOne(product.id)
                        }
                      >
                        <Text style={styles.miniButtonText}>
                          −
                        </Text>
                      </TouchableOpacity>

                      <Text style={styles.miniNumber}>
                        {quantity}
                      </Text>

                      <TouchableOpacity
                        style={styles.miniButton}
                        onPress={() =>
                          addToCart(product)
                        }
                      >
                        <Text style={styles.miniButtonText}>
                          +
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* NO RESULTS */}

        {filteredProducts.length === 0 && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsEmoji}>
              🔎
            </Text>

            <Text style={styles.noResultsTitle}>
              No products found
            </Text>

            <Text style={styles.noResultsText}>
              Try another search or category.
            </Text>
          </View>
        )}

        {/* FLOATING CART */}

        {cartItemCount > 0 && (
          <TouchableOpacity
            style={styles.floatingCart}
            onPress={() => setShowCart(true)}
          >
            <Text style={styles.floatingCartText}>
              VIEW CART • {cartItemCount} ITEMS
            </Text>

            <Text style={styles.floatingCartTotal}>
              ₹{cartTotal.toLocaleString('en-IN')}
            </Text>
          </TouchableOpacity>
        )}

        {/* FOOTER */}

        <Text style={styles.footer}>
          C H A L E G A  I N D I A 🇮🇳
        </Text>

        <Text style={styles.footerSmall}>
          Chalo Health Banaye
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 100,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  headerBrandBox: {
    flex: 1,
    paddingRight: 10,
  },

  brand: {
    color: '#1976F3',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 4,
  },

  title: {
    color: '#111111',
    fontSize: 40,
    fontWeight: '900',
    marginTop: 7,
  },

  subtitle: {
    color: '#777777',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 3,
  },

  cartIcon: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cartIconEmoji: {
    fontSize: 28,
  },

  cartBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    minWidth: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: '#1976F3',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },

  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  /*
   * MY ORDERS
   */

  ordersButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginTop: 22,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  ordersButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ordersButtonIconText: {
    fontSize: 24,
  },

  ordersButtonContent: {
    flex: 1,
    paddingLeft: 12,
  },

  ordersButtonTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
  },

  ordersButtonSubtitle: {
    color: '#888888',
    fontSize: 11,
    marginTop: 3,
  },

  ordersArrow: {
    color: '#1976F3',
    fontSize: 25,
    fontWeight: '900',
    paddingHorizontal: 8,
  },

  /*
   * SEARCH
   */

  searchBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    height: 58,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  searchIcon: {
    fontSize: 28,
    color: '#777777',
  },

  searchInput: {
    flex: 1,
    color: '#111111',
    fontSize: 16,
    marginLeft: 8,
  },

  sectionTitle: {
    color: '#111111',
    fontSize: 25,
    fontWeight: '900',
  },

  categoryRow: {
    paddingVertical: 15,
    gap: 10,
  },

  category: {
    minWidth: 105,
    height: 105,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },

  categorySelected: {
    backgroundColor: '#1976F3',
  },

  categoryEmoji: {
    fontSize: 27,
  },

  categoryText: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 7,
  },

  categoryTextSelected: {
    color: '#FFFFFF',
  },

  /*
   * BANNER
   */

  banner: {
    backgroundColor: '#1976F3',
    borderRadius: 25,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },

  bannerEmoji: {
    fontSize: 50,
    marginRight: 20,
  },

  bannerTextBox: {
    flex: 1,
  },

  bannerSmall: {
    color: '#DDEAFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 3,
  },

  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 29,
    fontWeight: '900',
    marginTop: 7,
  },

  /*
   * PRODUCTS
   */

  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 15,
  },

  productCount: {
    color: '#1976F3',
    fontSize: 15,
    fontWeight: '900',
  },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    flexDirection: 'row',
  },

  productImage: {
    width: 150,
    height: 170,
    borderRadius: 20,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productEmoji: {
    fontSize: 65,
  },

  productInfo: {
    flex: 1,
    paddingLeft: 15,
    justifyContent: 'space-between',
  },

  productCategory: {
    color: '#1976F3',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },

  productName: {
    color: '#111111',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
    marginTop: 7,
  },

  productDescription: {
    color: '#777777',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  productBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },

  productPrice: {
    color: '#1976F3',
    fontSize: 21,
    fontWeight: '900',
  },

  addButton: {
    backgroundColor: '#111111',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 13,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  miniQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 14,
    overflow: 'hidden',
  },

  miniButton: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  miniButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  miniNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    minWidth: 20,
    textAlign: 'center',
  },

  /*
   * FLOATING CART
   */

  floatingCart: {
    backgroundColor: '#111111',
    borderRadius: 18,
    padding: 17,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  floatingCartText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  floatingCartTotal: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },

  /*
   * NO RESULTS
   */

  noResults: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 35,
    alignItems: 'center',
  },

  noResultsEmoji: {
    fontSize: 40,
  },

  noResultsTitle: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 10,
  },

  noResultsText: {
    color: '#777777',
    marginTop: 5,
  },

  /*
   * FOOTER
   */

  footer: {
    color: '#1976F3',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 40,
  },

  footerSmall: {
    color: '#999999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },

  /*
   * CART
   */

  cartHeader: {
    height: 75,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    color: '#1976F3',
    fontSize: 38,
    lineHeight: 40,
  },

  cartTitle: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '900',
  },

  headerSpacer: {
    width: 45,
  },

  cartContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },

  emptyCart: {
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    padding: 40,
    alignItems: 'center',
    marginTop: 25,
  },

  emptyEmoji: {
    fontSize: 55,
  },

  emptyTitle: {
    color: '#111111',
    fontSize: 23,
    fontWeight: '900',
    marginTop: 12,
  },

  emptyText: {
    color: '#777777',
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },

  shopButton: {
    backgroundColor: '#111111',
    borderRadius: 15,
    padding: 16,
    marginTop: 20,
  },

  shopButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },

  cartProduct: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },

  cartEmojiBox: {
    width: 75,
    height: 75,
    borderRadius: 17,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cartEmoji: {
    fontSize: 38,
  },

  cartProductInfo: {
    flex: 1,
    paddingLeft: 13,
  },

  cartProductName: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '900',
  },

  cartProductPrice: {
    color: '#1976F3',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },

  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },

  quantityNumber: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '900',
    marginHorizontal: 12,
  },

  removeText: {
    color: '#E53935',
    fontSize: 10,
    fontWeight: '800',
  },

  totalCard: {
    backgroundColor: '#1976F3',
    borderRadius: 22,
    padding: 20,
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  totalLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  totalAmount: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
  },

  checkoutButton: {
    backgroundColor: '#111111',
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
  },

  checkoutText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});