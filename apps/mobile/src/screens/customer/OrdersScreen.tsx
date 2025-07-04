import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  SectionList,
  Image,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  ProgressBar,
  List,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  menuItem: {
    id: string;
    name: string;
    nameZh?: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  paymentMode: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  stall: {
    id: string;
    name: string;
    phoneNumber: string;
  };
  table: {
    number: string;
  };
}

interface OrderSection {
  title: string;
  data: Order[];
}

const OrdersScreen: React.FC = () => {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch orders
  const fetchOrders = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const response = await api.get('/orders/my-orders');
      
      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh orders when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
      
      // Set up polling for active orders
      const activeOrdersExist = orders.some(
        order => ['PENDING', 'PREPARING', 'READY'].includes(order.status)
      );
      
      let interval: NodeJS.Timeout;
      if (activeOrdersExist) {
        interval = setInterval(() => {
          fetchOrders(false);
        }, 10000); // Poll every 10 seconds
      }
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }, [])
  );

  // Group orders by status
  const groupOrdersByStatus = (): OrderSection[] => {
    const active = orders.filter(order => 
      ['PENDING', 'PREPARING', 'READY'].includes(order.status)
    );
    const completed = orders.filter(order => 
      ['COMPLETED', 'CANCELLED'].includes(order.status)
    );

    const sections: OrderSection[] = [];
    
    if (active.length > 0) {
      sections.push({ title: 'Active Orders', data: active });
    }
    
    if (completed.length > 0) {
      sections.push({ title: 'Past Orders', data: completed });
    }
    
    return sections;
  };

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { 
          color: theme.colors.warning, 
          icon: 'clock-outline',
          text: 'Order Placed',
          progress: 0.25
        };
      case 'PREPARING':
        return { 
          color: theme.colors.info, 
          icon: 'chef-hat',
          text: 'Preparing',
          progress: 0.5
        };
      case 'READY':
        return { 
          color: theme.colors.success, 
          icon: 'check-circle',
          text: 'Ready for Pickup',
          progress: 0.75
        };
      case 'COMPLETED':
        return { 
          color: theme.colors.primary, 
          icon: 'check-all',
          text: 'Completed',
          progress: 1
        };
      case 'CANCELLED':
        return { 
          color: theme.colors.error, 
          icon: 'close-circle',
          text: 'Cancelled',
          progress: 0
        };
      default:
        return { 
          color: theme.colors.onSurfaceVariant, 
          icon: 'help-circle',
          text: status,
          progress: 0
        };
    }
  };

  // Calculate estimated time
  const getEstimatedTime = (order: Order) => {
    const created = new Date(order.createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / 60000);
    
    switch (order.status) {
      case 'PENDING':
        return '10-15 mins';
      case 'PREPARING':
        return '5-10 mins';
      case 'READY':
        return 'Ready now!';
      default:
        return null;
    }
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  const renderOrder = ({ item: order }: { item: Order }) => {
    const statusInfo = getStatusInfo(order.status);
    const estimatedTime = getEstimatedTime(order);
    const isActive = ['PENDING', 'PREPARING', 'READY'].includes(order.status);
    
    return (
      <Card style={styles.orderCard}>
        {/* Order Header */}
        <Card.Content>
          <View style={styles.orderHeader}>
            <View style={styles.orderInfo}>
              <Text variant="titleMedium" style={styles.orderNumber}>
                Order #{order.orderNumber}
              </Text>
              <Text variant="bodySmall" style={styles.stallName}>
                {order.stall.name} • Table {order.table.number}
              </Text>
            </View>
            <Chip
              icon={statusInfo.icon}
              style={[styles.statusChip, { backgroundColor: statusInfo.color }]}
              textStyle={styles.statusText}
            >
              {statusInfo.text}
            </Chip>
          </View>

          {/* Progress Bar for Active Orders */}
          {isActive && (
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={statusInfo.progress}
                color={statusInfo.color}
                style={styles.progressBar}
              />
              {estimatedTime && (
                <Text variant="bodySmall" style={styles.estimatedTime}>
                  Est. {estimatedTime}
                </Text>
              )}
            </View>
          )}

          <Divider style={styles.divider} />

          {/* Order Items */}
          <View style={styles.itemsContainer}>
            {order.items.map((item, index) => (
              <View key={item.id} style={styles.orderItem}>
                <Text variant="bodyMedium">
                  {item.quantity}x {item.menuItem.name}
                </Text>
                {item.specialInstructions && (
                  <Text variant="bodySmall" style={styles.specialInstructions}>
                    Note: {item.specialInstructions}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Order Footer */}
          <View style={styles.orderFooter}>
            <View>
              <Text variant="bodySmall" style={styles.footerLabel}>
                Total: ${order.totalAmount.toFixed(2)}
              </Text>
              <Text variant="bodySmall" style={styles.footerLabel}>
                {formatTimeAgo(order.createdAt)}
              </Text>
            </View>
            
            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {order.status === 'READY' && (
                <Button
                  mode="contained"
                  compact
                  onPress={() => {
                    // TODO: Mark as collected
                  }}
                  style={styles.collectButton}
                >
                  Mark as Collected
                </Button>
              )}
              {order.status === 'COMPLETED' && (
                <Button
                  mode="outlined"
                  compact
                  onPress={() => {
                    // TODO: Reorder
                  }}
                >
                  Reorder
                </Button>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderSectionHeader = ({ section }: { section: OrderSection }) => (
    <Text variant="titleMedium" style={styles.sectionHeader}>
      {section.title}
    </Text>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyMedium" style={styles.loadingText}>
            Loading orders...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const sections = groupOrdersByStatus();

  if (sections.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchOrders();
            }} />
          }
        >
          <Icon name="receipt" size={80} color={theme.colors.onSurfaceVariant} />
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            No Orders Yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Your orders will appear here once you place them
          </Text>
          <Button
            mode="contained"
            onPress={() => {
              // Navigate to scan screen
            }}
            style={styles.scanButton}
          >
            Scan Table to Order
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={sections}
        renderItem={renderOrder}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchOrders();
          }} />
        }
        stickySectionHeadersEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  loadingText: {
    marginTop: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  sectionHeader: {
    fontWeight: '600',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: theme.colors.background,
  },
  orderCard: {
    marginHorizontal: spacing.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  stallName: {
    color: theme.colors.onSurfaceVariant,
  },
  statusChip: {
    height: 28,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: spacing.xs,
  },
  estimatedTime: {
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: spacing.sm,
  },
  itemsContainer: {
    marginBottom: spacing.md,
  },
  orderItem: {
    marginBottom: spacing.xs,
  },
  specialInstructions: {
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginLeft: spacing.md,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    color: theme.colors.onSurfaceVariant,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  collectButton: {
    backgroundColor: theme.colors.success,
  },
  separator: {
    height: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xl,
  },
  scanButton: {
    paddingHorizontal: spacing.xl,
  },
});

export default OrdersScreen;