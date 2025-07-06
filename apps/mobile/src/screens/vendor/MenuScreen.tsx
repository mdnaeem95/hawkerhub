// apps/mobile/src/screens/vendor/MenuScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  FAB,
  IconButton,
  Searchbar,
  Menu,
  Divider,
  Chip,
  Switch,
  Portal,
  Modal,
  TextInput,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

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

export const MenuManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
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

  const categories = ['All', 'Mains', 'Noodles', 'Rice', 'Snacks', 'Beverages', 'Desserts'];

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
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }
    
    // Filter by search query
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
      // In a real app, you would upload this to a server
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

  const renderMenuItem = (item: MenuItem) => (
    <Card key={item.id} style={styles.menuCard}>
      <Card.Content>
        <View style={styles.menuItem}>
          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
          )}
          <View style={styles.itemDetails}>
            <View style={styles.itemHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description && (
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Switch
                value={item.isAvailable}
                onValueChange={() => toggleItemAvailability(item.id, item.isAvailable)}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.itemFooter}>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
              <Chip compact style={styles.categoryChip}>
                {item.category}
              </Chip>
              <View style={styles.itemActions}>
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={() => openEditModal(item)}
                />
                <IconButton
                  icon="delete"
                  size={20}
                  onPress={() => handleDeleteItem(item)}
                />
              </View>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderItemForm = () => (
    <ScrollView style={styles.formContainer}>
      <Button
        mode="outlined"
        onPress={pickImage}
        icon="camera"
        style={styles.imageButton}
      >
        {formData.imageUrl ? 'Change Image' : 'Add Image'}
      </Button>
      
      {formData.imageUrl && (
        <Image source={{ uri: formData.imageUrl }} style={styles.previewImage} />
      )}

      <TextInput
        label="Item Name *"
        value={formData.name}
        onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Chinese Name"
        value={formData.nameZh}
        onChangeText={(text) => setFormData(prev => ({ ...prev, nameZh: text }))}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Malay Name"
        value={formData.nameMy}
        onChangeText={(text) => setFormData(prev => ({ ...prev, nameMy: text }))}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Tamil Name"
        value={formData.nameTa}
        onChangeText={(text) => setFormData(prev => ({ ...prev, nameTa: text }))}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Description"
        value={formData.description}
        onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      <TextInput
        label="Price *"
        value={formData.price}
        onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
        mode="outlined"
        keyboardType="decimal-pad"
        left={<TextInput.Affix text="$" />}
        style={styles.input}
      />

      <Menu
        visible={showCategoryMenu}
        onDismiss={() => setShowCategoryMenu(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setShowCategoryMenu(true)}
            style={styles.input}
          >
            Category: {formData.category}
          </Button>
        }
      >
        {categories.slice(1).map(cat => (
          <Menu.Item
            key={cat}
            onPress={() => {
              setFormData(prev => ({ ...prev, category: cat }));
              setShowCategoryMenu(false);
            }}
            title={cat}
          />
        ))}
      </Menu>
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
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Menu Management</Text>
        <Chip icon="food" style={styles.itemCount}>
          {menuItems.length} items
        </Chip>
      </View>

      <Searchbar
        placeholder="Search menu items..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
      >
        {categories.map(category => (
          <Chip
            key={category}
            selected={selectedCategory === category}
            onPress={() => setSelectedCategory(category)}
            style={styles.categoryChip}
          >
            {category}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView 
        style={styles.menuList}
        showsVerticalScrollIndicator={false}
      >
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="food-off" size={64} color={theme.colors.gray[300]} />
            <Text style={styles.emptyText}>No menu items found</Text>
          </View>
        ) : (
          filteredItems.map(renderMenuItem)
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
      />

      {/* Add Item Modal */}
      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={() => {
            setShowAddModal(false);
            resetForm();
          }}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Add New Item</Text>
          {renderItemForm()}
          <View style={styles.modalActions}>
            <Button onPress={() => {
              setShowAddModal(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleAddItem}>
              Add Item
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Edit Item Modal */}
      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={() => {
            setShowEditModal(false);
            setEditingItem(null);
            resetForm();
          }}
          contentContainerStyle={styles.modalContent}
        >
          <Text style={styles.modalTitle}>Edit Item</Text>
          {renderItemForm()}
          <View style={styles.modalActions}>
            <Button onPress={() => {
              setShowEditModal(false);
              setEditingItem(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleEditItem}>
              Save Changes
            </Button>
          </View>
        </Modal>
      </Portal>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
  },
  itemCount: {
    backgroundColor: theme.colors.primary,
  },
  searchBar: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  categoryFilter: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  categoryChip: {
    marginRight: spacing.sm,
  },
  menuList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  menuCard: {
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  itemDetails: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
  },
  itemDescription: {
    fontSize: 14,
    color: theme.colors.gray[600],
    marginTop: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginRight: spacing.md,
  },
  itemActions: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: theme.colors.gray[500],
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
    margin: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    padding: 20,
    paddingBottom: 10,
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  input: {
    marginBottom: spacing.md,
  },
  imageButton: {
    marginBottom: spacing.md,
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 10,
    gap: spacing.sm,
  },
});