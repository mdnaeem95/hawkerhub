// apps/mobile/src/screens/customer/MenuScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  IconButton,
  Chip,
  FAB,
  Modal,
  Portal,
  TextInput,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';
import { useCartStore } from '@/store/cartStore';
import { CustomerStackParamList } from '@/navigation/CustomerNavigator';

type MenuScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'Menu'>;
type MenuScreenRouteProp = RouteProp<CustomerStackParamList, 'Menu'>;

interface MenuItem {
  id: string;
  name: string;
  nameZh?: string;
  nameMy?: string;
  nameTa?: string;
  description?: string;
  price: number | string | { toString(): string }; // Handle Prisma Decimal type
  imageUrl?: string;
  isAvailable: boolean;
  category: string;
}

interface GroupedMenu {
  [category: string]: MenuItem[];
}

export const MenuScreen: React.FC = () => {
  const navigation = useNavigation<MenuScreenNavigationProp>();
  const route = useRoute<MenuScreenRouteProp>();
  const { stallId, stallName } = route.params;
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [groupedMenu, setGroupedMenu] = useState<GroupedMenu>({});
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');
  
  const cartItemCount = useCartStore(state => state.getTotalItems());
  const addToCart = useCartStore(state => state.addItem);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/stalls/${stallId}/menu`);
      const items = response.data.menuItems;
      setMenuItems(items);
      
      // Group items by category
      const grouped = items.reduce((acc: GroupedMenu, item: MenuItem) => {
        if (!acc[item.category]) {
          acc[item.category] = [];
        }
        acc[item.category].push(item);
        return acc;
      }, {});
      
      setGroupedMenu(grouped);
      
      // Set first category as selected
      const categories = Object.keys(grouped);
      if (categories.length > 0) {
        setSelectedCategory(categories[0]);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      Alert.alert(
        'Error',
        'Failed to load menu items. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    setSelectedItem(item);
    setQuantity(1);
    setSpecialInstructions('');
    setShowAddModal(true);
  };

  const confirmAddToCart = () => {
    if (!selectedItem) return;
    
    addToCart({
      menuItemId: selectedItem.id,
      stallId,
      stallName,
      name: selectedItem.name,
      price: Number(selectedItem.price),
      quantity,
      specialInstructions: specialInstructions.trim() || undefined,
      imageUrl: selectedItem.imageUrl,
    });
    
    setShowAddModal(false);
    
    Alert.alert(
      'Added to Cart',
      `${quantity}x ${selectedItem.name} added to cart`,
      [{ text: 'OK' }],
      { cancelable: true }
    );
  };

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <Card 
      style={[styles.menuCard, !item.isAvailable && styles.unavailableCard]}
      onPress={() => item.isAvailable && handleAddToCart(item)}
    >
      <Card.Content style={styles.menuCardContent}>
        <View style={styles.menuItemInfo}>
          <Text variant="titleMedium" style={styles.itemName}>
            {item.name}
          </Text>
          {item.nameZh && (
            <Text variant="bodySmall" style={styles.itemNameAlt}>
              {item.nameZh}
            </Text>
          )}
          {item.description && (
            <Text variant="bodySmall" style={styles.itemDescription}>
              {item.description}
            </Text>
          )}
          <Text variant="titleMedium" style={styles.itemPrice}>
            ${typeof item.price === 'number' ? item.price.toFixed(2) : Number(item.price).toFixed(2)}
          </Text>
        </View>
        
        {item.imageUrl && (
          <Image 
            source={{ uri: item.imageUrl }}
            style={styles.itemImage}
          />
        )}
        
        {!item.isAvailable && (
          <View style={styles.unavailableOverlay}>
            <Text style={styles.unavailableText}>Sold Out</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <>
          {/* Category Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryTabs}
            contentContainerStyle={styles.categoryTabsContent}
          >
            {Object.keys(groupedMenu).map((category) => (
              <Chip
                key={category}
                selected={selectedCategory === category}
                onPress={() => setSelectedCategory(category)}
                style={styles.categoryChip}
                mode="flat"
                compact
              >
                {category} ({groupedMenu[category].length})
              </Chip>
            ))}
          </ScrollView>

          {/* Menu Items */}
          <FlatList
            data={selectedCategory ? groupedMenu[selectedCategory] : []}
            renderItem={renderMenuItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.menuList}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text>No items in this category</Text>
              </View>
            }
          />

          {/* Cart FAB */}
          {cartItemCount > 0 && (
            <FAB
              icon="cart"
              label={`Cart (${cartItemCount})`}
              onPress={() => navigation.navigate('Cart')}
              style={styles.fab}
            />
          )}

          {/* Add to Cart Modal */}
          <Portal>
            <Modal
              visible={showAddModal}
              onDismiss={() => setShowAddModal(false)}
              contentContainerStyle={styles.modalContent}
            >
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                {selectedItem && (
                  <>
                    <Text variant="titleLarge" style={styles.modalTitle}>
                      {selectedItem.name}
                    </Text>
                    
                    <Divider style={styles.modalDivider} />
                    
                    {/* Quantity Selector */}
                    <View style={styles.quantityContainer}>
                      <Text variant="titleMedium">Quantity</Text>
                      <View style={styles.quantitySelector}>
                        <IconButton
                          icon="minus"
                          onPress={() => setQuantity(Math.max(1, quantity - 1))}
                          mode="contained"
                          disabled={quantity <= 1}
                        />
                        <Text variant="titleLarge" style={styles.quantityText}>
                          {quantity}
                        </Text>
                        <IconButton
                          icon="plus"
                          onPress={() => setQuantity(quantity + 1)}
                          mode="contained"
                        />
                      </View>
                    </View>
                    
                    {/* Special Instructions */}
                    <View style={styles.instructionsContainer}>
                      <Text variant="titleMedium" style={styles.instructionsLabel}>
                        Special Instructions (Optional)
                      </Text>
                      <TextInput
                        mode="outlined"
                        placeholder="E.g., less spicy, no onions"
                        value={specialInstructions}
                        onChangeText={setSpecialInstructions}
                        multiline
                        numberOfLines={3}
                        style={styles.instructionsInput}
                      />
                    </View>
                    
                    {/* Price Summary */}
                    <View style={styles.priceSummary}>
                      <Text variant="titleMedium">Total</Text>
                      <Text variant="titleLarge" style={styles.totalPrice}>
                        ${(Number(selectedItem.price) * quantity).toFixed(2)}
                      </Text>
                    </View>
                    
                    {/* Action Buttons */}
                    <View style={styles.modalActions}>
                      <Button
                        mode="outlined"
                        onPress={() => setShowAddModal(false)}
                        style={styles.modalButton}
                      >
                        Cancel
                      </Button>
                      <Button
                        mode="contained"
                        onPress={confirmAddToCart}
                        style={styles.modalButton}
                      >
                        Add to Cart
                      </Button>
                    </View>
                  </>
                )}
              </KeyboardAvoidingView>
            </Modal>
          </Portal>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTabs: {
    backgroundColor: theme.colors.surface,
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  categoryTabsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  categoryChip: {
    marginRight: spacing.sm,
    height: 36,
  },
  menuList: {
    padding: spacing.md,
    paddingBottom: 80, // Space for FAB
  },
  menuCard: {
    marginBottom: spacing.sm,
    elevation: 2,
  },
  unavailableCard: {
    opacity: 0.7,
  },
  menuCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  menuItemInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  itemName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  itemNameAlt: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  itemDescription: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  itemPrice: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  unavailableOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  unavailableText: {
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  separator: {
    height: spacing.sm,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: theme.borderRadius.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  modalDivider: {
    marginBottom: spacing.lg,
  },
  quantityContainer: {
    marginBottom: spacing.lg,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  quantityText: {
    marginHorizontal: spacing.lg,
    fontWeight: '600',
  },
  instructionsContainer: {
    marginBottom: spacing.lg,
  },
  instructionsLabel: {
    marginBottom: spacing.sm,
  },
  instructionsInput: {
    backgroundColor: theme.colors.surface,
  },
  priceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
  },
  totalPrice: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});

export default MenuScreen;