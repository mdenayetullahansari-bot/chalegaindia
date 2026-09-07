import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import {
  products,
  Product,
  ProductCategory,
} from '@/data/products';
import {
  addToCart as addCartItem,
  getCart,
  removeFromCart,
  removeProductFromCart,
} from '@/lib/cart';

const CATEGORIES: {
  name: 'All' | ProductCategory;
  emoji: string;
  subtitle: string;
}[] = [
  {
    name: 'All',
    emoji: '✨',
    subtitle: 'Everything fresh',
  },
  {
    name: 'Vegetables',
    emoji: '🥬',
    subtitle: 'Daily essentials',
  },
  {
    name: 'Fruits',
    emoji: '🍎',
    subtitle: 'Fresh every day',
  },
  {
    name: 'Breakfast & Dairy',
    emoji: '🥛',
    subtitle: 'Start your day',
  },
  {
    name: 'Seasonal',
    emoji: '🌱',
    subtitle: 'What is in season',
  },
  {
    name: "Today's Fresh Market",
    emoji: '⭐',
    subtitle: 'Picked for today',
  },
  {
    name: 'Wellness & Fitness',
    emoji: '🚶',
    subtitle: 'Walk & live better',
  },
];

export default function ShopScreen() {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<
    'All' | ProductCategory
  >('All');

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<Record<string, number>>({});
  const [showCart, setShowCart] = useState(false);
  const [cartLoading, setCartLoading] = useState(true);

  const loadCart = useCallback(async () => {
    try {
      const savedCart = await getCart();
      setCart(savedCart);
    } catch (error) {
      console.log('Failed to load Shop cart:', error);
      setCart({});
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [loadCart])
  );

  const filteredProducts = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return products.filter(product => {
      const categoryMatch =
        selectedCategory === 'All' ||
        product.category === selectedCategory;

      const searchMatch =
        !searchText ||
        product.name
          .toLowerCase()
          .includes(searchText) ||
        product.category
          .toLowerCase()
          .includes(searchText) ||
        product.description
          .toLowerCase()
          .includes(searchText);

      return (
        categoryMatch &&
        searchMatch &&
        product.available
      );
    });
  }, [selectedCategory, search]);

  const cartProducts = products.filter(
    product => (cart[product.id] || 0) > 0
  );

  const cartItemCount = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0
  );

  const cartSubtotal = cartProducts.reduce(
    (total, product) =>
      total +
      product.price *
        (cart[product.id] || 0),
    0
  );

  const deliveryFee =
    cartSubtotal >= 499
      ? 0
      : cartSubtotal >= 299
      ? 29
      : cartSubtotal > 0
      ? 49
      : 0;

  const cartTotal =
    cartSubtotal + deliveryFee;

  const addToCart = async (
    product: Product
  ) => {
    try {
      const nextCart = await addCartItem(
        product.id,
        1
      );

      setCart(nextCart);
    } catch (error) {
      console.log(
        'Failed to add product to cart:',
        error
      );

      Alert.alert(
        'Could not add to cart',
        'Please try again.'
      );
    }
  };

  const removeOne = async (
    productId: string
  ) => {
    try {
      const nextCart =
        await removeFromCart(
          productId,
          1
        );

      setCart(nextCart);
    } catch (error) {
      console.log(
        'Failed to remove item from cart:',
        error
      );

      Alert.alert(
        'Could not update cart',
        'Please try again.'
      );
    }
  };

  const removeProduct = async (
    productId: string
  ) => {
    try {
      const nextCart =
        await removeProductFromCart(
          productId
        );

      setCart(nextCart);
    } catch (error) {
      console.log(
        'Failed to remove product from cart:',
        error
      );

      Alert.alert(
        'Could not update cart',
        'Please try again.'
      );
    }
  };

  const goToCheckout = () => {
    if (cartItemCount === 0) {
      Alert.alert(
        'Your cart is empty',
        'Add something fresh before checkout.'
      );
      return;
    }

    router.push({
      pathname: '/checkout',
      params: {
        total: cartTotal.toString(),
        subtotal:
          cartSubtotal.toString(),
        deliveryFee:
          deliveryFee.toString(),
        items:
          cartItemCount.toString(),
        cart: JSON.stringify(cart),
      },
    });
  };

  const getFreeDeliveryMessage =
    () => {
      if (cartSubtotal >= 499) {
        return '✓ You unlocked FREE delivery';
      }

      const amountLeft =
        499 - cartSubtotal;

      return `Add ₹${amountLeft.toLocaleString(
        'en-IN'
      )} more for FREE delivery`;
    };

  if (showCart) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() =>
              setShowCart(false)
            }
          >
            <Text style={styles.backText}>
              ‹
            </Text>
          </TouchableOpacity>

          <View
            style={styles.headerCenter}
          >
            <Text
              style={styles.headerTitle}
            >
              Your Cart
            </Text>

            <Text
              style={styles.headerSubtitle}
            >
              Fresh for your family
            </Text>
          </View>

          <View
            style={styles.headerSpacer}
          />
        </View>

        <ScrollView
          contentContainerStyle={
            styles.cartContent
          }
          showsVerticalScrollIndicator={
            false
          }
        >
          {cartLoading ? (
            <View
              style={styles.emptyCart}
            >
              <Text
                style={styles.emptyCartTitle}
              >
                Loading your cart...
              </Text>
            </View>
          ) : cartProducts.length ===
            0 ? (
            <View
              style={styles.emptyCart}
            >
              <Text
                style={
                  styles.emptyCartEmoji
                }
              >
                🛒
              </Text>

              <Text
                style={styles.emptyCartTitle}
              >
                Your cart is empty
              </Text>

              <Text
                style={styles.emptyCartText}
              >
                Add fresh fruits,
                vegetables or breakfast
                essentials.
              </Text>

              <TouchableOpacity
                style={
                  styles.primaryButton
                }
                onPress={() =>
                  setShowCart(false)
                }
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  START SHOPPING
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View
                style={
                  styles.deliveryPromise
                }
              >
                <Text
                  style={
                    styles.deliveryPromiseEmoji
                  }
                >
                  🚚
                </Text>

                <View
                  style={
                    styles.deliveryPromiseBody
                  }
                >
                  <Text
                    style={
                      styles.deliveryPromiseTitle
                    }
                  >
                    CHALEGA 24-HOUR DELIVERY
                  </Text>

                  <Text
                    style={
                      styles.deliveryPromiseText
                    }
                  >
                    Your fresh order will
                    arrive within 24 hours.
                  </Text>
                </View>
              </View>

              <View
                style={styles.cartItemsCard}
              >
                {cartProducts.map(
                  product => {
                    const quantity =
                      cart[product.id] || 0;

                    return (
                      <View
                        key={product.id}
                        style={
                          styles.cartItem
                        }
                      >
                        <View
                          style={
                            styles.cartItemEmoji
                          }
                        >
                          <Text
                            style={
                              styles.cartItemEmojiText
                            }
                          >
                            {product.emoji}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.cartItemInfo
                          }
                        >
                          <Text
                            style={
                              styles.cartItemName
                            }
                          >
                            {product.name}
                          </Text>

                          <Text
                            style={
                              styles.cartItemUnit
                            }
                          >
                            ₹
                            {product.price.toLocaleString(
                              'en-IN'
                            )}{' '}
                            / {product.unit}
                          </Text>

                          <TouchableOpacity
                            onPress={() =>
                              removeProduct(
                                product.id
                              )
                            }
                          >
                            <Text
                              style={
                                styles.removeText
                              }
                            >
                              Remove
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View
                          style={
                            styles.cartItemRight
                          }
                        >
                          <Text
                            style={
                              styles.cartItemTotal
                            }
                          >
                            ₹
                            {(
                              product.price *
                              quantity
                            ).toLocaleString(
                              'en-IN'
                            )}
                          </Text>

                          <View
                            style={
                              styles.quantityRow
                            }
                          >
                            <TouchableOpacity
                              style={
                                styles.quantityButton
                              }
                              onPress={() =>
                                removeOne(
                                  product.id
                                )
                              }
                            >
                              <Text
                                style={
                                  styles.quantityButtonText
                                }
                              >
                                −
                              </Text>
                            </TouchableOpacity>

                            <Text
                              style={
                                styles.quantityNumber
                              }
                            >
                              {quantity}
                            </Text>

                            <TouchableOpacity
                              style={
                                styles.quantityButton
                              }
                              onPress={() =>
                                addToCart(
                                  product
                                )
                              }
                            >
                              <Text
                                style={
                                  styles.quantityButtonText
                                }
                              >
                                +
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  }
                )}
              </View>

              <View
                style={
                  styles.freeDeliveryCard
                }
              >
                <Text
                  style={
                    styles.freeDeliveryTitle
                  }
                >
                  {getFreeDeliveryMessage()}
                </Text>

                <Text
                  style={
                    styles.freeDeliveryText
                  }
                >
                  ₹499+ orders get free
                  delivery.
                </Text>
              </View>

              <View
                style={styles.summaryCard}
              >
                <View
                  style={styles.summaryRow}
                >
                  <Text
                    style={
                      styles.summaryLabel
                    }
                  >
                    Items
                  </Text>

                  <Text
                    style={
                      styles.summaryValue
                    }
                  >
                    ₹
                    {cartSubtotal.toLocaleString(
                      'en-IN'
                    )}
                  </Text>
                </View>

                <View
                  style={styles.summaryRow}
                >
                  <Text
                    style={
                      styles.summaryLabel
                    }
                  >
                    Delivery
                  </Text>

                  <Text
                    style={[
                      styles.summaryValue,
                      deliveryFee === 0 &&
                        styles.freeValue,
                    ]}
                  >
                    {deliveryFee === 0
                      ? 'FREE'
                      : `₹${deliveryFee}`}
                  </Text>
                </View>

                <View
                  style={
                    styles.summaryDivider
                  }
                />

                <View
                  style={styles.summaryRow}
                >
                  <Text
                    style={
                      styles.totalLabel
                    }
                  >
                    Total
                  </Text>

                  <Text
                    style={
                      styles.totalValue
                    }
                  >
                    ₹
                    {cartTotal.toLocaleString(
                      'en-IN'
                    )}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={
                  styles.checkoutButton
                }
                onPress={
                  goToCheckout
                }
                activeOpacity={0.85}
              >
                <Text
                  style={
                    styles.checkoutButtonText
                  }
                >
                  CHECKOUT
                </Text>

                <Text
                  style={
                    styles.checkoutButtonTotal
                  }
                >
                  ₹
                  {cartTotal.toLocaleString(
                    'en-IN'
                  )}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.content
        }
      >
        <View style={styles.hero}>
          <View
            style={styles.heroTopRow}
          >
            <View
              style={styles.heroBadge}
            >
              <Text
                style={styles.heroBadgeText}
              >
                SHOP TO FEED
              </Text>
            </View>

            <TouchableOpacity
              style={styles.cartButton}
              onPress={() =>
                setShowCart(true)
              }
            >
              <Text
                style={
                  styles.cartButtonEmoji
                }
              >
                🛒
              </Text>

              {cartItemCount > 0 && (
                <View
                  style={styles.cartBadge}
                >
                  <Text
                    style={
                      styles.cartBadgeText
                    }
                  >
                    {cartItemCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text
            style={styles.heroTitle}
          >
            Chalega Fresh
          </Text>

          <Text
            style={styles.heroSubtitle}
          >
            Fresh for your family.
            {'\n'}
            Good for the community.
          </Text>

          <View
            style={styles.heroPromise}
          >
            <Text
              style={
                styles.heroPromiseEmoji
              }
            >
              🚚
            </Text>

            <View
              style={
                styles.heroPromiseBody
              }
            >
              <Text
                style={
                  styles.heroPromiseTitle
                }
              >
                24-HOUR FRESH DELIVERY
              </Text>

              <Text
                style={
                  styles.heroPromiseText
                }
              >
                Order today. Get your fresh
                essentials within 24 hours.
              </Text>
            </View>
          </View>
        </View>

        <View
          style={styles.impactCard}
        >
          <View
            style={styles.impactIcon}
          >
            <Text
              style={
                styles.impactIconText
              }
            >
              ❤️
            </Text>
          </View>

          <View
            style={styles.impactBody}
          >
            <Text
              style={styles.impactTitle}
            >
              SHOP WITH PURPOSE
            </Text>

            <Text
              style={styles.impactText}
            >
              Your purchase supports
              Chalega's community food
              initiatives.
            </Text>
          </View>
        </View>

        <View
          style={styles.searchCard}
        >
          <Text
            style={styles.searchEmoji}
          >
            🔎
          </Text>

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search fruits, vegetables, milk..."
            placeholderTextColor="#7A8490"
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>

        <Text
          style={styles.sectionTitle}
        >
          Shop by category
        </Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.categoryRow
          }
        >
          {CATEGORIES.map(
            category => {
              const selected =
                selectedCategory ===
                category.name;

              return (
                <TouchableOpacity
                  key={category.name}
                  style={[
                    styles.category,
                    selected &&
                      styles.categorySelected,
                  ]}
                  onPress={() =>
                    setSelectedCategory(
                      category.name
                    )
                  }
                  activeOpacity={0.85}
                >
                  <Text
                    style={
                      styles.categoryEmoji
                    }
                  >
                    {category.emoji}
                  </Text>

                  <Text
                    style={[
                      styles.categoryText,
                      selected &&
                        styles.categoryTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>

                  <Text
                    style={[
                      styles.categorySubtitle,
                      selected &&
                        styles.categorySubtitleSelected,
                    ]}
                  >
                    {category.subtitle}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </ScrollView>

        {selectedCategory ===
          "Today's Fresh Market" && (
          <View
            style={styles.todayBanner}
          >
            <Text
              style={
                styles.todayBannerTitle
              }
            >
              ⭐ Today's Fresh Market
            </Text>

            <Text
              style={
                styles.todayBannerText
              }
            >
              A changing selection based
              on what is fresh and available
              today.
            </Text>
          </View>
        )}

        {selectedCategory ===
          'Seasonal' && (
          <View
            style={
              styles.seasonalBanner
            }
          >
            <Text
              style={
                styles.seasonalBannerTitle
              }
            >
              🌱 Seasonal Picks
            </Text>

            <Text
              style={
                styles.seasonalBannerText
              }
            >
              Seasonal availability can
              change with the local market
              supply.
            </Text>
          </View>
        )}

        <View
          style={styles.productHeader}
        >
          <View>
            <Text
              style={styles.sectionTitle}
            >
              {selectedCategory === 'All'
                ? 'Fresh picks'
                : selectedCategory}
            </Text>

            <Text
              style={styles.productCount}
            >
              {filteredProducts.length}{' '}
              available
            </Text>
          </View>
        </View>

        {filteredProducts.map(
          product => {
            const quantity =
              cart[product.id] || 0;

            return (
              <View
                key={product.id}
                style={
                  styles.productCard
                }
              >
                <TouchableOpacity
                  style={
                    styles.productImage
                  }
                  onPress={() =>
                    router.push({
                      pathname:
                        '/product',
                      params: {
                        id: product.id,
                      },
                    })
                  }
                  activeOpacity={0.85}
                >
                  <Text
                    style={
                      styles.productEmoji
                    }
                  >
                    {product.emoji}
                  </Text>
                </TouchableOpacity>

                <View
                  style={
                    styles.productInfo
                  }
                >
                  <View
                    style={
                      styles.productMetaRow
                    }
                  >
                    <Text
                      style={
                        styles.productCategory
                      }
                    >
                      {product.category.toUpperCase()}
                    </Text>

                    {product.seasonal && (
                      <View
                        style={
                          styles.seasonBadge
                        }
                      >
                        <Text
                          style={
                            styles.seasonBadgeText
                          }
                        >
                          SEASONAL
                        </Text>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname:
                          '/product',
                        params: {
                          id: product.id,
                        },
                      })
                    }
                  >
                    <Text
                      style={
                        styles.productName
                      }
                    >
                      {product.name}
                    </Text>
                  </TouchableOpacity>

                  <Text
                    style={
                      styles.productDescription
                    }
                  >
                    {product.description}
                  </Text>

                  <Text
                    style={
                      styles.productUnit
                    }
                  >
                    ₹
                    {product.price.toLocaleString(
                      'en-IN'
                    )}{' '}
                    / {product.unit}
                  </Text>

                  <View
                    style={
                      styles.productBottom
                    }
                  >
                    <Text
                      style={
                        styles.productPrice
                      }
                    >
                      ₹
                      {product.price.toLocaleString(
                        'en-IN'
                      )}
                    </Text>

                    {quantity === 0 ? (
                      <TouchableOpacity
                        style={
                          styles.addButton
                        }
                        onPress={() =>
                          addToCart(
                            product
                          )
                        }
                        activeOpacity={0.85}
                      >
                        <Text
                          style={
                            styles.addButtonText
                          }
                        >
                          + ADD
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View
                        style={
                          styles.miniQuantity
                        }
                      >
                        <TouchableOpacity
                          style={
                            styles.miniButton
                          }
                          onPress={() =>
                            removeOne(
                              product.id
                            )
                          }
                        >
                          <Text
                            style={
                              styles.miniButtonText
                            }
                          >
                            −
                          </Text>
                        </TouchableOpacity>

                        <Text
                          style={
                            styles.miniNumber
                          }
                        >
                          {quantity}
                        </Text>

                        <TouchableOpacity
                          style={
                            styles.miniButton
                          }
                          onPress={() =>
                            addToCart(
                              product
                            )
                          }
                        >
                          <Text
                            style={
                              styles.miniButtonText
                            }
                          >
                            +
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }
        )}

        {filteredProducts.length ===
          0 && (
          <View
            style={styles.noResults}
          >
            <Text
              style={
                styles.noResultsEmoji
              }
            >
              🔎
            </Text>

            <Text
              style={
                styles.noResultsTitle
              }
            >
              Nothing available right now
            </Text>

            <Text
              style={
                styles.noResultsText
              }
            >
              Try another category or
              search.
            </Text>
          </View>
        )}

        <View
          style={styles.footerCard}
        >
          <Text
            style={styles.footerTitle}
          >
            Fresh for your family.
          </Text>

          <Text
            style={styles.footerText}
          >
            Chalega Fresh connects
            everyday shopping with
            healthy living and community
            impact.
          </Text>
        </View>

        <Text style={styles.footer}>
          C H A L E G A  I N D I A 🇮🇳
        </Text>
      </ScrollView>

      {cartItemCount > 0 && (
        <TouchableOpacity
          style={styles.floatingCart}
          onPress={() =>
            setShowCart(true)
          }
          activeOpacity={0.9}
        >
          <View>
            <Text
              style={
                styles.floatingCartTitle
              }
            >
              {cartItemCount} item
              {cartItemCount === 1
                ? ''
                : 's'} · ₹
              {cartTotal.toLocaleString(
                'en-IN'
              )}
            </Text>

            <Text
              style={
                styles.floatingCartSubtitle
              }
            >
              {deliveryFee === 0
                ? 'FREE 24-hour delivery'
                : `Delivery ₹${deliveryFee} · 24-hour delivery`}
            </Text>
          </View>

          <Text
            style={
              styles.floatingCartAction
            }
          >
            CART →
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  content: {
    paddingBottom: 140,
  },

  hero: {
    backgroundColor: '#123B2A',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#E9F6EE',
  },

  heroBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#123B2A',
  },

  cartButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cartButtonEmoji: {
    fontSize: 23,
  },

  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 19,
    height: 19,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5484D',
  },

  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },

  heroTitle: {
    marginTop: 14,
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.6,
  },

  heroSubtitle: {
    marginTop: 7,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    color: '#E5F4EB',
  },

  heroPromise: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },

  heroPromiseEmoji: {
    fontSize: 24,
    marginRight: 11,
  },

  heroPromiseBody: {
    flex: 1,
  },

  heroPromiseTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#123B2A',
    letterSpacing: 0.5,
  },

  heroPromiseText: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
    color: '#52606D',
    fontWeight: '600',
  },

  impactCard: {
    marginHorizontal: 18,
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6EAF0',
  },

  impactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FCECEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  impactIconText: {
    fontSize: 19,
  },

  impactBody: {
    flex: 1,
  },

  impactTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#7B1E27',
  },

  impactText: {
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    color: '#53606C',
  },

  searchCard: {
    marginHorizontal: 18,
    marginTop: 14,
    height: 52,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E6EC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },

  searchEmoji: {
    fontSize: 18,
    marginRight: 9,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#13202B',
  },

  sectionTitle: {
    marginHorizontal: 18,
    marginTop: 20,
    fontSize: 20,
    fontWeight: '900',
    color: '#152330',
  },

  categoryRow: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 4,
  },

  category: {
    width: 142,
    minHeight: 92,
    marginRight: 10,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E7EC',
  },

  categorySelected: {
    backgroundColor: '#EAF6EE',
    borderColor: '#2FA84F',
  },

  categoryEmoji: {
    fontSize: 24,
  },

  categoryText: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: '900',
    color: '#1B2935',
  },

  categoryTextSelected: {
    color: '#14582B',
  },

  categorySubtitle: {
    marginTop: 3,
    fontSize: 10,
    lineHeight: 14,
    color: '#71808D',
    fontWeight: '600',
  },

  categorySubtitleSelected: {
    color: '#39704D',
  },

  todayBanner: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#F2D48D',
  },

  todayBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#6C4A00',
  },

  todayBannerText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#775E2A',
  },

  seasonalBanner: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#EDF8F0',
    borderWidth: 1,
    borderColor: '#C8E6D0',
  },

  seasonalBannerTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#175B2E',
  },

  seasonalBannerText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#4F7058',
  },

  productHeader: {
    marginTop: 8,
    marginBottom: 10,
  },

  productCount: {
    marginHorizontal: 18,
    marginTop: 3,
    fontSize: 12,
    color: '#7A8793',
    fontWeight: '600',
  },

  productCard: {
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 13,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9EE',
    flexDirection: 'row',
  },

  productImage: {
    width: 82,
    height: 82,
    borderRadius: 19,
    backgroundColor: '#F2F7F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  productEmoji: {
    fontSize: 39,
  },

  productInfo: {
    flex: 1,
  },

  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  productCategory: {
    fontSize: 9,
    letterSpacing: 0.7,
    fontWeight: '900',
    color: '#71808D',
  },

  seasonBadge: {
    marginLeft: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: '#E8F5EB',
  },

  seasonBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#2E7D43',
  },

  productName: {
    marginTop: 3,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    color: '#1A2732',
  },

  productDescription: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 16,
    color: '#6D7A86',
  },

  productUnit: {
    marginTop: 7,
    fontSize: 12,
    fontWeight: '800',
    color: '#4D5B67',
  },

  productBottom: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  productPrice: {
    fontSize: 17,
    fontWeight: '900',
    color: '#123B2A',
  },

  addButton: {
    minWidth: 76,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: '#1976F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  addButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  miniQuantity: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    backgroundColor: '#EEF4FF',
  },

  miniButton: {
    width: 31,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  miniButtonText: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1D6FF2',
  },

  miniNumber: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
    color: '#1F2B36',
  },

  noResults: {
    marginHorizontal: 18,
    marginTop: 28,
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EAF0',
  },

  noResultsEmoji: {
    fontSize: 28,
  },

  noResultsTitle: {
    marginTop: 9,
    fontSize: 17,
    fontWeight: '900',
    color: '#1C2935',
  },

  noResultsText: {
    marginTop: 4,
    fontSize: 13,
    color: '#71808D',
  },

  footerCard: {
    marginHorizontal: 18,
    marginTop: 24,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#123B2A',
  },

  footerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  footerText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: '#DCEEE2',
  },

  footer: {
    marginTop: 18,
    textAlign: 'center',
    fontSize: 11,
    letterSpacing: 3,
    color: '#8B98A4',
  },

  floatingCart: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    minHeight: 66,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 18,
    backgroundColor: '#123B2A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  floatingCartTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  floatingCartSubtitle: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: '#D6E8DC',
  },

  floatingCartAction: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  header: {
    height: 72,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#F0F4F2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  backText: {
    fontSize: 34,
    lineHeight: 38,
    color: '#123B2A',
  },

  headerCenter: {
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#152330',
  },

  headerSubtitle: {
    marginTop: 2,
    fontSize: 10,
    color: '#7A8793',
    fontWeight: '700',
  },

  headerSpacer: {
    width: 43,
  },

  cartContent: {
    paddingBottom: 35,
  },

  deliveryPromise: {
    marginHorizontal: 18,
    marginTop: 16,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#EAF6EE',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBE6D2',
  },

  deliveryPromiseEmoji: {
    fontSize: 24,
    marginRight: 12,
  },

  deliveryPromiseBody: {
    flex: 1,
  },

  deliveryPromiseTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
    color: '#175A2D',
  },

  deliveryPromiseText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 17,
    color: '#4B6A54',
  },

  cartItemsCard: {
    marginHorizontal: 18,
    marginTop: 14,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9EE',
    overflow: 'hidden',
  },

  cartItem: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F4',
  },

  cartItemEmoji: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F3F7F4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  cartItemEmojiText: {
    fontSize: 26,
  },

  cartItemInfo: {
    flex: 1,
    paddingRight: 8,
  },

  cartItemName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1C2934',
  },

  cartItemUnit: {
    marginTop: 3,
    fontSize: 11,
    color: '#74818C',
    fontWeight: '700',
  },

  removeText: {
    marginTop: 7,
    fontSize: 10,
    color: '#B23A48',
    fontWeight: '800',
  },

  cartItemRight: {
    alignItems: 'flex-end',
  },

  cartItemTotal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#173E2A',
  },

  quantityRow: {
    marginTop: 8,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#EEF4FF',
  },

  quantityButton: {
    width: 31,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1D6FF2',
  },

  quantityNumber: {
    minWidth: 23,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
    color: '#1C2934',
  },

  freeDeliveryCard: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#FFF9E9',
    borderWidth: 1,
    borderColor: '#F1DA9C',
  },

  freeDeliveryTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#6B4A00',
  },

  freeDeliveryText: {
    marginTop: 3,
    fontSize: 11,
    color: '#7B6430',
  },

  summaryCard: {
    marginHorizontal: 18,
    marginTop: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E9EE',
  },

  summaryRow: {
    minHeight: 29,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  summaryLabel: {
    fontSize: 13,
    color: '#6D7985',
    fontWeight: '700',
  },

  summaryValue: {
    fontSize: 13,
    color: '#1B2934',
    fontWeight: '800',
  },

  freeValue: {
    color: '#2B7A42',
  },

  summaryDivider: {
    height: 1,
    marginVertical: 5,
    backgroundColor: '#E9EDF1',
  },

  totalLabel: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A2731',
  },

  totalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#123B2A',
  },

  checkoutButton: {
    marginHorizontal: 18,
    marginTop: 16,
    minHeight: 58,
    paddingHorizontal: 18,
    borderRadius: 17,
    backgroundColor: '#1976F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  checkoutButtonText: {
    fontSize: 14,
    letterSpacing: 0.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  checkoutButtonTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  emptyCart: {
    marginHorizontal: 18,
    marginTop: 80,
    padding: 30,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E9EE',
  },

  emptyCartEmoji: {
    fontSize: 45,
  },

  emptyCartTitle: {
    marginTop: 15,
    fontSize: 22,
    fontWeight: '900',
    color: '#152330',
  },

  emptyCartText: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: '#6F7C87',
  },

  primaryButton: {
    marginTop: 18,
    minHeight: 46,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: '#1976F3',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});