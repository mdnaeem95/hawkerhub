import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Animated,
  TouchableOpacity,
  Dimensions,
  Vibration,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  Button,
  ActivityIndicator,
  Badge,
  IconButton,
  Portal,
  Modal,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';
import { useSocket, useSocketConnection } from '@/hooks/useSocket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
  menuItem: {
    id: string;
    name: string;
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
  table: {
    id: string;
    number: string;
  };
  customer?: {
    id: string;
    name: string;
    phoneNumber: string;
  };
}

// Tab configuration
const TABS = [
  { key: 'PENDING', label: 'New', icon: 'bell-ring', color: theme.colors.warning },
  { key: 'PREPARING', label: 'Preparing', icon: 'chef-hat', color: theme.colors.info },
  { key: 'READY', label: 'Ready', icon: 'check-circle', color: theme.colors.success },
  { key: 'HISTORY', label: 'History', icon: 'history', color: theme.colors.gray[600] },
];

export const VendorOrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Initialize socket connection
  useSocketConnection();

  // Real-time order updates with animation
  useSocket('new-order', useCallback((newOrder: Order) => {
    console.log('[VendorOrders] New order received:', newOrder);
    setOrders(prev => [newOrder, ...prev]);
    
    // Vibrate and animate
    Vibration.vibrate([0, 200, 100, 200]);
    
    // Animate new order entry
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Auto-switch to pending tab for new orders
    setActiveTab('PENDING');
  }, []));

  useSocket('order:updated', useCallback((updatedOrder: Order) => {
    setOrders(prev => prev.map(order => 
      order.id === updatedOrder.id ? updatedOrder : order
    ));
  }, []));

  // Fetch vendor orders
  const fetchOrders = async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      
      const response = await api.get('/vendor/orders');
      
      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (error: any) {
      console.error('Error fetching vendor orders:', error);
      
      if (error.response?.status === 403) {
        Alert.alert(
          'Access Denied',
          'You need vendor access to view orders',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(false);
  };

  // Quick action handlers
  const handleQuickAccept = async (order: Order) => {
    try {
      const response = await api.patch(`/orders/${order.id}/status`, { 
        status: 'PREPARING' 
      });
      
      if (response.data.success) {
        // Play success sound
        Vibration.vibrate(100);
        
        setOrders(prev => prev.map(o => 
          o.id === order.id ? { ...o, status: 'PREPARING' } : o
        ));
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to accept order');
    }
  };

  const handleQuickReady = async (order: Order) => {
    try {
      const response = await api.patch(`/orders/${order.id}/status`, { 
        status: 'READY' 
      });
      
      if (response.data.success) {
        Vibration.vibrate(100);
        
        setOrders(prev => prev.map(o => 
          o.id === order.id ? { ...o, status: 'READY' } : o
        ));
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to mark order as ready');
    }
  };

  const handleQuickComplete = async (order: Order) => {
    try {
      const response = await api.patch(`/orders/${order.id}/status`, { 
        status: 'COMPLETED' 
      });
      
      if (response.data.success) {
        Vibration.vibrate(100);
        
        setOrders(prev => prev.map(o => 
          o.id === order.id ? { ...o, status: 'COMPLETED' } : o
        ));
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to complete order');
    }
  };

  const handleRejectOrder = async (order: Order) => {
    Alert.alert(
      'Reject Order',
      'Are you sure you want to reject this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.patch(`/orders/${order.id}/status`, { 
                status: 'CANCELLED' 
              });
              
              if (response.data.success) {
                setOrders(prev => prev.map(o => 
                  o.id === order.id ? { ...o, status: 'CANCELLED' } : o
                ));
                setModalVisible(false);
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to reject order');
            }
          },
        },
      ]
    );
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    if (activeTab === 'HISTORY') {
      return ['COMPLETED', 'CANCELLED'].includes(order.status);
    }
    return order.status === activeTab;
  });

  // Get order counts for badges
  const getOrderCount = (status: string) => {
    if (status === 'HISTORY') {
      return orders.filter(o => ['COMPLETED', 'CANCELLED'].includes(o.status)).length;
    }
    return orders.filter(o => o.status === status).length;
  };

  // Calculate time elapsed
  const getTimeElapsed = (createdAt: string) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffMinutes = Math.floor((now.getTime() - orderTime.getTime()) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ${diffMinutes % 60}m ago`;
  };

  // Render compact order card
  const renderOrderCard = (order: Order) => {
    const isPending = order.status === 'PENDING';
    const isPreparing = order.status === 'PREPARING';
    const isReady = order.status === 'READY';
    const isHistory = ['COMPLETED', 'CANCELLED'].includes(order.status);
    
    return (
      <Animated.View
        key={order.id}
        style={[
          styles.orderCard,
          isPending && styles.pendingCard,
          {
            opacity: isPending ? fadeAnim : 1,
            transform: [{ translateY: isPending ? slideAnim : 0 }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            setSelectedOrder(order);
            setModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          {/* Order Header */}
          <View style={styles.cardHeader}>
            <View style={styles.orderInfo}>
              <View style={styles.orderNumberRow}>
                <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
                <View style={styles.tableChip}>
                  <Icon name="table-furniture" size={14} color={theme.colors.gray[600]} />
                  <Text style={styles.tableText}>{order.table.number}</Text>
                </View>
              </View>
              <Text style={styles.timeText}>{getTimeElapsed(order.createdAt)}</Text>
            </View>
            <Text style={styles.priceText}>${order.totalAmount.toFixed(2)}</Text>
          </View>

          {/* Items Summary */}
          <View style={styles.itemsSummary}>
            {order.items.slice(0, 2).map((item, index) => (
              <Text key={item.id} style={styles.itemText} numberOfLines={1}>
                {item.quantity}x {item.menuItem.name}
              </Text>
            ))}
            {order.items.length > 2 && (
              <Text style={styles.moreItemsText}>
                +{order.items.length - 2} more items
              </Text>
            )}
          </View>

          {/* Quick Actions */}
          {!isHistory && (
            <View style={styles.quickActions}>
              {isPending && (
                <>
                  <Button
                    mode="outlined"
                    onPress={(e) => {
                      e.stopPropagation();
                      handleRejectOrder(order);
                    }}
                    style={styles.rejectButton}
                    labelStyle={styles.rejectButtonText}
                    compact
                  >
                    Reject
                  </Button>
                  <Button
                    mode="contained"
                    onPress={(e) => {
                      e.stopPropagation();
                      handleQuickAccept(order);
                    }}
                    style={styles.acceptButton}
                    labelStyle={styles.acceptButtonText}
                    icon="check"
                    compact
                  >
                    Accept
                  </Button>
                </>
              )}
              
              {isPreparing && (
                <Button
                  mode="contained"
                  onPress={(e) => {
                    e.stopPropagation();
                    handleQuickReady(order);
                  }}
                  style={styles.readyButton}
                  labelStyle={styles.actionButtonText}
                  icon="check-all"
                  compact
                >
                  Mark Ready
                </Button>
              )}
              
              {isReady && (
                <Button
                  mode="contained"
                  onPress={(e) => {
                    e.stopPropagation();
                    handleQuickComplete(order);
                  }}
                  style={styles.completeButton}
                  labelStyle={styles.actionButtonText}
                  icon="check-circle"
                  compact
                >
                  Complete
                </Button>
              )}
            </View>
          )}
          
          {isHistory && (
            <View style={styles.historyStatus}>
              <Chip
                mode="flat"
                style={[
                  styles.statusChip,
                  order.status === 'COMPLETED' ? styles.completedChip : styles.cancelledChip
                ]}
                textStyle={styles.statusChipText}
              >
                {order.status}
              </Chip>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render order detail modal
  const renderOrderModal = () => (
    <Portal>
      <Modal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        contentContainerStyle={styles.modalContent}
        dismissable={true}
        dismissableBackButton={true}
      >
        {selectedOrder && (
          <>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalTitle}>Order #{selectedOrder.orderNumber}</Text>
                <Text style={styles.modalSubtitle}>Table {selectedOrder.table.number}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color={theme.colors.gray[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Order Items Detail */}
              <View style={styles.itemsDetail}>
                <Text style={styles.sectionTitle}>Order Items</Text>
                {selectedOrder.items.map((item) => (
                  <View key={item.id} style={styles.itemDetail}>
                    <View style={styles.itemDetailLeft}>
                      <Text style={styles.itemQuantityDetail}>{item.quantity}x</Text>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemNameDetail}>{item.menuItem.name}</Text>
                        {item.specialInstructions && (
                          <Text style={styles.specialNote}>
                            Note: {item.specialInstructions}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={styles.itemPriceDetail}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Order Summary */}
              <View style={styles.orderSummarySection}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Payment Method</Text>
                  <Text style={styles.summaryValue}>{selectedOrder.paymentMode}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Order Time</Text>
                  <Text style={styles.summaryValue}>
                    {new Date(selectedOrder.createdAt).toLocaleTimeString([], { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    })}
                  </Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>${selectedOrder.totalAmount.toFixed(2)}</Text>
                </View>
              </View>

              {/* Action Buttons for Modal */}
              {!['COMPLETED', 'CANCELLED'].includes(selectedOrder.status) && (
                <View style={styles.modalActions}>
                  {selectedOrder.status === 'PENDING' && (
                    <>
                      <Button
                        mode="outlined"
                        onPress={() => {
                          handleRejectOrder(selectedOrder);
                        }}
                        style={styles.modalRejectButton}
                        labelStyle={styles.rejectButtonText}
                      >
                        Reject Order
                      </Button>
                      <Button
                        mode="contained"
                        onPress={() => {
                          handleQuickAccept(selectedOrder);
                          setModalVisible(false);
                        }}
                        style={styles.modalAcceptButton}
                        labelStyle={styles.acceptButtonText}
                      >
                        Accept Order
                      </Button>
                    </>
                  )}
                  
                  {selectedOrder.status === 'PREPARING' && (
                    <Button
                      mode="contained"
                      onPress={() => {
                        handleQuickReady(selectedOrder);
                        setModalVisible(false);
                      }}
                      style={styles.modalFullButton}
                      buttonColor={theme.colors.info}
                    >
                      Mark as Ready
                    </Button>
                  )}
                  
                  {selectedOrder.status === 'READY' && (
                    <Button
                      mode="contained"
                      onPress={() => {
                        handleQuickComplete(selectedOrder);
                        setModalVisible(false);
                      }}
                      style={styles.modalFullButton}
                      buttonColor={theme.colors.success}
                    >
                      Complete Order
                    </Button>
                  )}
                </View>
              )}
            </ScrollView>
          </>
        )}
      </Modal>
    </Portal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = getOrderCount(tab.key);
          
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <View style={styles.tabContent}>
                <Icon
                  name={tab.icon}
                  size={24}
                  color={isActive ? tab.color : theme.colors.gray[500]}
                />
                <Text style={[styles.tabLabel, isActive && { color: tab.color }]}>
                  {tab.label}
                </Text>
                {count > 0 && tab.key !== 'HISTORY' && (
                  <Badge
                    size={20}
                    style={[styles.badge, { backgroundColor: tab.color }]}
                  >
                    {count}
                  </Badge>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Orders List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.ordersContent}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon 
              name={TABS.find(t => t.key === activeTab)?.icon || 'receipt'} 
              size={80} 
              color={theme.colors.gray[300]} 
            />
            <Text style={styles.emptyTitle}>No orders</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'PENDING' && 'New orders will appear here'}
              {activeTab === 'PREPARING' && 'Orders you\'re preparing will show here'}
              {activeTab === 'READY' && 'Orders ready for pickup will show here'}
              {activeTab === 'HISTORY' && 'Your completed orders will show here'}
            </Text>
          </View>
        ) : (
          filteredOrders.map(renderOrderCard)
        )}
      </ScrollView>

      {renderOrderModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[100],
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
  
  // Tab Bar Styles
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.primary,
  },
  tabContent: {
    alignItems: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    color: theme.colors.gray[600],
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -12,
  },
  
  // Order Card Styles
  ordersContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: spacing.sm,
    padding: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warning,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.gray[900],
  },
  tableChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  tableText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.gray[700],
  },
  timeText: {
    fontSize: 12,
    color: theme.colors.gray[500],
    marginTop: 2,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  
  // Items Summary
  itemsSummary: {
    marginBottom: spacing.md,
  },
  itemText: {
    fontSize: 14,
    color: theme.colors.gray[700],
    marginBottom: 2,
  },
  moreItemsText: {
    fontSize: 12,
    color: theme.colors.gray[500],
    fontStyle: 'italic',
  },
  
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  rejectButton: {
    flex: 1,
    borderColor: theme.colors.error,
  },
  rejectButtonText: {
    color: theme.colors.error,
    fontSize: 14,
  },
  acceptButton: {
    flex: 2,
    backgroundColor: theme.colors.success,
  },
  acceptButtonText: {
    fontSize: 14,
  },
  readyButton: {
    flex: 1,
    backgroundColor: theme.colors.info,
  },
  completeButton: {
    flex: 1,
    backgroundColor: theme.colors.success,
  },
  actionButtonText: {
    fontSize: 14,
  },
  
  // History Status
  historyStatus: {
    marginTop: spacing.sm,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  completedChip: {
    backgroundColor: theme.colors.success + '20',
  },
  cancelledChip: {
    backgroundColor: theme.colors.error + '20',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.gray[800],
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.gray[500],
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  
  // Modal Styles
  modalContent: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 100,
    borderRadius: 16,
    overflow: 'hidden',
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
  },
  modalHeaderLeft: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.gray[900],
  },
  modalSubtitle: {
    fontSize: 16,
    color: theme.colors.gray[600],
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalBody: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[800],
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  itemsDetail: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  itemDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  itemDetailLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: spacing.sm,
  },
  itemQuantityDetail: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[700],
    minWidth: 30,
  },
  itemInfo: {
    flex: 1,
  },
  itemNameDetail: {
    fontSize: 16,
    color: theme.colors.gray[800],
  },
  specialNote: {
    fontSize: 14,
    color: theme.colors.gray[600],
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemPriceDetail: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.gray[700],
  },
  orderSummarySection: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: 14,
    color: theme.colors.gray[600],
  },
  summaryValue: {
    fontSize: 14,
    color: theme.colors.gray[800],
    fontWeight: '500',
  },
  totalRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[800],
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  modalRejectButton: {
    flex: 1,
    borderColor: theme.colors.error,
  },
  modalAcceptButton: {
    flex: 2,
    backgroundColor: theme.colors.success,
  },
  modalFullButton: {
    flex: 1,
  },
});