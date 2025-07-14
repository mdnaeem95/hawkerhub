import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Text,
  FAB,
  Searchbar,
  Menu,
  Switch,
  ActivityIndicator,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { MenuItemModal } from '@/components/MenuItemModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MenuItem {
  id: string;
  name: string;
  nameZh?: string;
  nameMy?: string;
  nameTa?: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category: string;
  isAvailable: boolean;
}

const CATEGORIES = [
  { key: 'All', label: 'All', icon: 'food' },
  { key: 'Mains', label: 'Mains', icon: 'food-variant' },
  { key: 'Noodles', label: 'Noodles', icon: 'noodles' },
  { key: 'Rice', label: 'Rice', icon: 'rice' },
  { key: 'Snacks', label: 'Snacks', icon: 'food-apple' },
  { key: 'Beverages', label: 'Drinks', icon: 'cup' },
  { key: 'Desserts', label: 'Desserts', icon: 'cupcake' },
  { key: 'Add-on', label: 'Add-ons', icon: 'plus-circle-outline' },
];

export const MenuManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    nameZh: '',
    nameMy: '',
    nameTa: '',
    description: '',
    price: '',
    category: 'Mains',
    imageUrl: '',
  });

  useEffect(() => {
    fetchMenuItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [searchQuery, selectedCategory, menuItems]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vendor/menu');
      if (response.data.success) {
        setMenuItems(response.data.menu);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      Alert.alert('Error', 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = menuItems;
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredItems(filtered);
  };

  const toggleItemAvailability = async (itemId: string, currentStatus: boolean) => {
    try {
      const response = await api.patch(`/vendor/menu/${itemId}/availability`, {
        isAvailable: !currentStatus
      });
      
      if (response.data.success) {
        setMenuItems(prev =>
          prev.map(item =>
            item.id === itemId ? { ...item, isAvailable: !currentStatus } : item
          )
        );
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      Alert.alert('Error', 'Failed to update item availability');
    }
  };

  const handleAddItem = async () => {
    try {
      if (!formData.name || !formData.price) {
        Alert.alert('Error', 'Please fill in required fields');
        return;
      }

      const response = await api.post('/vendor/menu', {
        ...formData,
        price: parseFloat(formData.price),
      });

      if (response.data.success) {
        Alert.alert('Success', 'Menu item added successfully');
        setShowAddModal(false);
        resetForm();
        fetchMenuItems();
      }
    } catch (error) {
      console.error('Error adding menu item:', error);
      Alert.alert('Error', 'Failed to add menu item');
    }
  };

  const handleEditItem = async () => {
    if (!editingItem) return;

    try {
      const response = await api.put(`/vendor/menu/${editingItem.id}`, {
        ...formData,
        price: parseFloat(formData.price),
      });

      if (response.data.success) {
        Alert.alert('Success', 'Menu item updated successfully');
        setShowEditModal(false);
        setEditingItem(null);
        resetForm();
        fetchMenuItems();
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      Alert.alert('Error', 'Failed to update menu item');
    }
  };

  const handleDeleteItem = (item: MenuItem) => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/vendor/menu/${item.id}`);
              if (response.data.success) {
                fetchMenuItems();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setFormData(prev => ({ ...prev, imageUrl: result.assets[0].uri }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      nameZh: '',
      nameMy: '',
      nameTa: '',
      description: '',
      price: '',
      category: 'Mains',
      imageUrl: '',
    });
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      nameZh: item.nameZh || '',
      nameMy: item.nameMy || '',
      nameTa: item.nameTa || '',
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      imageUrl: item.imageUrl || '',
    });
    setShowEditModal(true);
  };

  const getCategoryCount = (category: string) => {
    if (category === 'All') return menuItems.length;
    return menuItems.filter(item => item.category === category).length;
  };

  const renderMenuItem = (item: MenuItem) => (
    <View key={item.id} style={styles.menuCard}>
      <View style={styles.cardContent}>
        {/* Item Image */}
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        ) : (
          <View style={[styles.itemImage, styles.imagePlaceholder]}>
            <Icon name="image-off" size={24} color={theme.colors.gray[400]} />
          </View>
        )}
        
        {/* Item Details */}
        <View style={styles.itemDetails}>
          <View style={styles.itemHeader}>
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            <Switch
              value={item.isAvailable}
              onValueChange={() => toggleItemAvailability(item.id, item.isAvailable)}
              color={theme.colors.primary}
              style={styles.availableSwitch}
            />
          </View>
          
          {item.description && (
            <Text style={styles.itemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          <View style={styles.itemFooter}>
            <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            
            <View style={styles.itemActions}>
              <TouchableOpacity
                onPress={() => openEditModal(item)}
                style={styles.actionButton}
              >
                <Icon name="pencil" size={20} color={theme.colors.gray[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeleteItem(item)}
                style={styles.actionButton}
              >
                <Icon name="delete" size={20} color={theme.colors.gray[600]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderItemForm = () => (
    <ScrollView 
      style={styles.formContainer} 
      showsVerticalScrollIndicator={true}
      contentContainerStyle={styles.formContentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Image Section */}
      <TouchableOpacity onPress={pickImage} style={styles.imageSection}>
        {formData.imageUrl ? (
          <Image source={{ uri: formData.imageUrl }} style={styles.formImage} />
        ) : (
          <View style={[styles.imagePlaceholder, styles.formImage]}>
            <Icon name="camera-plus" size={32} color={theme.colors.gray[400]} />
            <Text style={styles.imageText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <TextInput
        label="Item Name *"
        value={formData.name}
        onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
        mode="outlined"
        style={styles.input}
        outlineColor={theme.colors.gray[300]}
        activeOutlineColor={theme.colors.primary}
      />

      <TextInput
        label="Description"
        value={formData.description}
        onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
        outlineColor={theme.colors.gray[300]}
        activeOutlineColor={theme.colors.primary}
      />

      <View style={styles.priceRow}>
        <TextInput
          label="Price *"
          value={formData.price}
          onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
          mode="outlined"
          keyboardType="decimal-pad"
          left={<TextInput.Affix text="$" />}
          style={[styles.input, styles.priceInput]}
          outlineColor={theme.colors.gray[300]}
          activeOutlineColor={theme.colors.primary}
        />

        <TouchableOpacity
          style={styles.categorySelector}
          onPress={() => setShowCategoryDropdown(true)}
        >
          <Text style={styles.categorySelectorLabel}>Category</Text>
          <Text style={styles.categorySelectorValue}>{formData.category}</Text>
          <Icon name="chevron-down" size={20} color={theme.colors.gray[600]} />
        </TouchableOpacity>
      </View>

      {/* Language Names Section */}
      <View style={styles.languageSection}>
        <Text style={styles.sectionTitle}>Multi-language Names (Optional)</Text>
        
        <TextInput
          label="Chinese Name 中文"
          value={formData.nameZh}
          onChangeText={(text) => setFormData(prev => ({ ...prev, nameZh: text }))}
          mode="outlined"
          style={styles.input}
          outlineColor={theme.colors.gray[300]}
          activeOutlineColor={theme.colors.primary}
        />

        <TextInput
          label="Malay Name"
          value={formData.nameMy}
          onChangeText={(text) => setFormData(prev => ({ ...prev, nameMy: text }))}
          mode="outlined"
          style={styles.input}
          outlineColor={theme.colors.gray[300]}
          activeOutlineColor={theme.colors.primary}
        />

        <TextInput
          label="Tamil Name தமிழ்"
          value={formData.nameTa}
          onChangeText={(text) => setFormData(prev => ({ ...prev, nameTa: text }))}
          mode="outlined"
          style={styles.input}
          outlineColor={theme.colors.gray[300]}
          activeOutlineColor={theme.colors.primary}
        />
      </View>

      {/* Extra padding at bottom */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Menu Management</Text>
        <View style={styles.itemCountBadge}>
          <Icon name="food" size={16} color="white" />
          <Text style={styles.itemCountText}>{menuItems.length} items</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search menu items..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {CATEGORIES.map(category => {
          const isSelected = selectedCategory === category.key;
          const count = getCategoryCount(category.key);
          
          return (
            <TouchableOpacity
              key={category.key}
              style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
              onPress={() => setSelectedCategory(category.key)}
              activeOpacity={0.7}
            >
              <Icon 
                name={category.icon} 
                size={16} 
                color={isSelected ? theme.colors.primary : theme.colors.gray[600]} 
              />
              <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                {category.label}
              </Text>
              {count > 0 && (
                <Text style={[styles.categoryCount, isSelected && styles.categoryCountSelected]}>
                  {count}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Menu Items List */}
      <ScrollView 
        style={styles.menuList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuListContent}
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="food-off" size={64} color={theme.colors.gray[300]} />
            <Text style={styles.emptyTitle}>No items found</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different search' : 'Add your first menu item'}
            </Text>
          </View>
        ) : (
          filteredItems.map(renderMenuItem)
        )}
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        color="white"
      />

      {/* Add Item Modal */}
      <MenuItemModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        onSave={handleAddItem}
        title="Add New Item"
        formData={formData}
        setFormData={setFormData}
        isEdit={false}
      />

      {/* Edit Item Modal */}
      <MenuItemModal
        visible={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
          resetForm();
        }}
        onSave={handleEditItem}
        title="Edit Item"
        formData={formData}
        setFormData={setFormData}
        isEdit={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: theme.colors.gray[600],
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.gray[900],
  },
  itemCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  itemCountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Search
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: theme.colors.gray[100],
    borderRadius: 12,
  },
  searchInput: {
    fontSize: 14,
  },
  
  // Category Filter
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 20,
    backgroundColor: 'white',
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  categoryLabel: {
    fontSize: 14,
    color: theme.colors.gray[700],
    fontWeight: '500',
  },
  categoryLabelSelected: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  categoryCount: {
    fontSize: 12,
    color: theme.colors.gray[500],
    marginLeft: 2,
  },
  categoryCountSelected: {
    color: theme.colors.primary,
  },
  
  // Menu List
  menuList: {
    flex: 1,
    marginTop: spacing.md,
  },
  menuListContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  
  // Menu Card
  menuCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: spacing.sm,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardContent: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  imagePlaceholder: {
    backgroundColor: theme.colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[900],
    flex: 1,
    marginRight: spacing.sm,
  },
  availableSwitch: {
    transform: [{ scale: 0.8 }],
  },
  itemDescription: {
    fontSize: 13,
    color: theme.colors.gray[600],
    marginBottom: spacing.xs,
    lineHeight: 18,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  categoryTag: {
    backgroundColor: theme.colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: spacing.sm,
  },
  categoryText: {
    fontSize: 11,
    color: theme.colors.gray[600],
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  actionButton: {
    padding: spacing.xs,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.gray[800],
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.gray[500],
    marginTop: spacing.xs,
  },
  
  // FAB
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalKeyboardAvoidingView: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '85%',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    maxHeight: '100%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.gray[900],
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalBody: {
    flex: 1,
    minHeight: 200,
    maxHeight: 400,
  },
  
  // Form
  formContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  formContentContainer: {
    paddingBottom: spacing.xl,
  },
  imageSection: {
    alignSelf: 'center',
    marginBottom: spacing.lg,
    width: 120,
    height: 120,
  },
  formImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  imageText: {
    fontSize: 14,
    color: theme.colors.gray[600],
    marginTop: spacing.xs,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: 'white',
  },
  priceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  priceInput: {
    flex: 1,
  },
  categorySelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.gray[400],
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    backgroundColor: 'white',
  },
  categorySelectorLabel: {
    fontSize: 12,
    color: theme.colors.gray[600],
    position: 'absolute',
    top: -8,
    left: 12,
    backgroundColor: 'white',
    paddingHorizontal: 4,
  },
  categorySelectorValue: {
    fontSize: 16,
    color: theme.colors.gray[800],
  },
  languageSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.gray[700],
    marginBottom: spacing.sm,
  },
  dropdownMenu: {
    marginTop: 40,
  },
  
  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
});