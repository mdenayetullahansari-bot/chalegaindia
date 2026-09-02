import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const categories = [
  {
    icon: '🥗',
    title: 'Healthy Food',
    subtitle: 'Better choices for everyday life',
  },
  {
    icon: '🚶',
    title: 'Walking & Fitness',
    subtitle: 'Everything for your daily walk',
  },
  {
    icon: '💧',
    title: 'Hydration',
    subtitle: 'Bottles, sippers & more',
  },
  {
    icon: '👕',
    title: 'Chalega India',
    subtitle: 'Official merchandise',
  },
  {
    icon: '🏠',
    title: 'Home Health',
    subtitle: 'Simple healthy living',
  },
  {
    icon: '🎁',
    title: 'Health Combos',
    subtitle: 'Great products together',
  },
];

const products = [
  {
    icon: '💧',
    name: 'Chalega India Water Bottle',
    price: '₹399',
  },
  {
    icon: '👕',
    name: 'Chalega India Walking T-Shirt',
    price: '₹699',
  },
  {
    icon: '🥜',
    name: 'Healthy Snack Pack',
    price: '₹249',
  },
];

export default function ShopScreen() {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.smallTitle}>CHALEGA INDIA</Text>
      <Text style={styles.title}>Health Shop</Text>

      <Text style={styles.subtitle}>
        Products that help you move, eat and live better.
      </Text>

      <View style={styles.banner}>
        <Text style={styles.bannerIcon}>🛒</Text>

        <View style={styles.bannerContent}>
          <Text style={styles.bannerTitle}>
            Shop for a healthier you
          </Text>

          <Text style={styles.bannerText}>
            Discover healthy food, walking essentials and Chalega India
            merchandise.
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Shop by category</Text>

      <View style={styles.categoryGrid}>
        {categories.map((category) => (
          <TouchableOpacity
            key={category.title}
            style={styles.categoryCard}
            activeOpacity={0.8}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>

            <Text style={styles.categoryTitle}>
              {category.title}
            </Text>

            <Text style={styles.categorySubtitle}>
              {category.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Featured</Text>

        <Text style={styles.viewAll}>View all</Text>
      </View>

      {products.map((product) => (
        <View style={styles.productCard} key={product.name}>
          <View style={styles.productImage}>
            <Text style={styles.productIcon}>{product.icon}</Text>
          </View>

          <View style={styles.productInfo}>
            <Text style={styles.productName}>
              {product.name}
            </Text>

            <Text style={styles.productPrice}>
              {product.price}
            </Text>

            <TouchableOpacity
              style={styles.addButton}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>
                ADD TO CART
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>
          Chalo Health Banaye 🇮🇳
        </Text>

        <Text style={styles.footerText}>
          Walk more. Eat better. Live healthier.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FC',
  },

  content: {
    padding: 22,
    paddingBottom: 45,
  },

  smallTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#1976F3',
    marginTop: 10,
  },

  title: {
    fontSize: 38,
    fontWeight: '900',
    color: '#111111',
    marginTop: 5,
  },

  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 20,
  },

  banner: {
    backgroundColor: '#1976F3',
    borderRadius: 25,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },

  bannerIcon: {
    fontSize: 42,
    marginRight: 15,
  },

  bannerContent: {
    flex: 1,
  },

  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },

  bannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },

  sectionTitle: {
    fontSize: 25,
    fontWeight: '900',
    color: '#111111',
    marginBottom: 14,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    minHeight: 145,
  },

  categoryIcon: {
    fontSize: 34,
    marginBottom: 10,
  },

  categoryTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#111111',
  },

  categorySubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: '#777777',
    marginTop: 5,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
  },

  viewAll: {
    color: '#1976F3',
    fontSize: 15,
    fontWeight: '800',
  },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 23,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
  },

  productImage: {
    width: 105,
    height: 105,
    borderRadius: 18,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  productIcon: {
    fontSize: 45,
  },

  productInfo: {
    flex: 1,
    paddingLeft: 15,
    justifyContent: 'center',
  },

  productName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111111',
  },

  productPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1976F3',
    marginTop: 6,
  },

  addButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#111111',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },

  addButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },

  footerCard: {
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 25,
    marginTop: 20,
    alignItems: 'center',
  },

  footerTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },

  footerText: {
    color: '#CBD5E1',
    fontSize: 14,
    marginTop: 7,
  },
});