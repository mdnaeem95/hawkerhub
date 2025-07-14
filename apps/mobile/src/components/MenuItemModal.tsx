import React, { useState } from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextInput, Button, Menu } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';

const CATEGORIES = [
  { key: 'Mains', label: 'Mains', icon: 'food-variant' },
  { key: 'Noodles', label: 'Noodles', icon: 'noodles' },
  { key: 'Rice', label: 'Rice', icon: 'rice' },
  { key: 'Snacks', label: 'Snacks', icon: 'food-apple' },
  { key: 'Beverages', label: 'Drinks', icon: 'cup' },
  { key: 'Desserts', label: 'Desserts', icon: 'cupcake' },
  { key: 'Add-on', label: 'Add-ons', icon: 'plus-circle-outline' },
];

interface MenuItemModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  formData: {
    name: string;
    description: string;
    price: string;
    category: string;
  };
  setFormData: (data: any) => void;
  isEdit?: boolean;
}

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  visible,
  onClose,
  onSave,
  title,
  formData,
  setFormData,
  isEdit = false,
}) => {
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.colors.gray[600]} />
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView style={styles.content}>
            <TextInput
              label="Item Name *"
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              mode="outlined"
              style={styles.input}
            />
            
            <TextInput
              label="Description"
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.input}
            />
            
            <View style={styles.row}>
              <TextInput
                label="Price *"
                value={formData.price}
                onChangeText={(text) => setFormData({ ...formData, price: text })}
                mode="outlined"
                keyboardType="decimal-pad"
                left={<TextInput.Affix text="$" />}
                style={[styles.input, styles.priceInput]}
              />
              
              <View style={styles.categoryContainer}>
                <Menu
                  visible={showCategoryMenu}
                  onDismiss={() => setShowCategoryMenu(false)}
                  anchor={
                    <TouchableOpacity
                      style={styles.categorySelector}
                      onPress={() => setShowCategoryMenu(true)}
                    >
                      <Text style={styles.categorySelectorLabel}>Category</Text>
                      <Text style={styles.categorySelectorValue}>{formData.category}</Text>
                      <Icon name="chevron-down" size={20} color={theme.colors.gray[600]} />
                    </TouchableOpacity>
                  }
                >
                  {CATEGORIES.map(cat => (
                    <Menu.Item
                      key={cat.key}
                      onPress={() => {
                        setFormData({ ...formData, category: cat.key });
                        setShowCategoryMenu(false);
                      }}
                      title={cat.label}
                      leadingIcon={cat.icon}
                    />
                  ))}
                </Menu>
              </View>
            </View>
            
            {/* Let's add more fields one by one after testing */}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onClose}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={onSave}
              style={styles.saveButton}
              buttonColor={theme.colors.primary}
            >
              {isEdit ? 'Save Changes' : 'Add Item'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.gray[900],
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    padding: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: 'white',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  priceInput: {
    flex: 1,
    marginBottom: 0,
  },
  categoryContainer: {
    flex: 1,
  },
  categorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.gray[400],
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
    backgroundColor: 'white',
    height: 56, // Match TextInput height
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
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
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