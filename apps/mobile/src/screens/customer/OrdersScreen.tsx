import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Card, Chip, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, spacing } from '@/constants/theme';

export default function OrdersScreen() {
  // Mock data for now
  const orders = [
    {
      id: '1',
      orderNumber: '2024-001',
      status: 'COMPLETED',
      stallName: 'Hainanese Chicken Rice',
      totalAmount: 12.50,
      createdAt: new Date().toISOString(),
      items: [
        { name: 'Chicken Rice', quantity: 2, price: 5.50 },
        { name: 'Iced Lemon Tea', quantity: 1, price: 1.50 },
      ]
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return theme.colors.pending;
      case 'PREPARING': return theme.colors.pending;
      case 'READY': return theme.colors.ready;
      case 'COMPLETED': return theme.colors.primary;
      case 'CANCELLED': return theme.colors.error;
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const renderOrder = ({ item }: { item: typeof orders[0] }) => (
    <Card style={styles.orderCard}>
      <Card.Content>
        <View style={styles.orderHeader}>
          <Text variant="titleMedium" style={styles.orderNumber}>
            Order #{item.orderNumber}
          </Text>
          <Chip
            mode="flat"
            textStyle={{ fontSize: 12 }}
            style={{ backgroundColor: getStatusColor(item.status) }}
          >
            {item.status}
          </Chip>
        </View>
        
        <Text variant="bodyMedium" style={styles.stallName}>
          {item.stallName}
        </Text>
        
        <View style={styles.items}>
          {item.items.map((orderItem, index) => (
            <Text key={index} variant="bodySmall" style={styles.itemText}>
              {orderItem.quantity}x {orderItem.name} - ${orderItem.price.toFixed(2)}
            </Text>
          ))}
        </View>
        
        <View style={styles.orderFooter}>
          <Text variant="titleMedium">
            Total: ${item.totalAmount.toFixed(2)}
          </Text>
          <Button mode="outlined" compact>
            View Details
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No Orders Yet
      </Text>
      <Text variant="bodyMedium" style={styles.emptyText}>
        Your order history will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          My Orders
        </Text>
      </View>
      
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={EmptyState}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceVariant,
  },
  title: {
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.lg,
  },
  orderCard: {
    marginBottom: spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderNumber: {
    fontWeight: '600',
  },
  stallName: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  items: {
    marginBottom: spacing.md,
  },
  itemText: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceVariant,
    paddingTop: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    marginBottom: spacing.sm,
    color: theme.colors.onSurfaceVariant,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
  },
});