// apps/mobile/src/screens/vendor/MenuManagementScreen.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Text,
  FAB,
  Card,
  Switch,
  IconButton,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, spacing } from '@/constants/theme';

export const MenuManagementScreen: React.FC = () => {
  // Mock data
  const menuItems = [
    {
      id: '1',
      name: 'Chicken Rice',
      price: 4.50,
      category: 'Main',
      available: true,
      image: null,
    },
    {
      id: '2',
      name: 'Iced Kopi',
      price: 2.20,
      category: 'Drinks',
      available: true,
      image: null,
    },
    {
      id: '3',
      name: 'Char Kway Teow',
      price: 5.00,
      category: 'Main',
      available: false,
      image: null,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Menu Management</Text>
          <Text style={styles.subtitle}>{menuItems.length} items</Text>
        </View>

        {menuItems.map((item) => (
          <Card key={item.id} style={styles.menuCard}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                <Chip mode="outlined" compact style={styles.categoryChip}>
                  {item.category}
                </Chip>
              </View>
              <View style={styles.itemActions}>
                <Switch
                  value={item.available}
                  onValueChange={() => {}}
                  color={theme.colors.primary}
                />
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={() => {}}
                />
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {}}
        label="Add Item"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.gray[900],
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.gray[600],
    marginTop: 4,
  },
  menuCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.gray[900],
  },
  itemPrice: {
    fontSize: 16,
    color: theme.colors.primary,
    marginTop: 4,
  },
  categoryChip: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: theme.colors.primary,
  },
});