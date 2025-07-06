// apps/mobile/src/screens/customer/CartScreen.tsx
import React, { useState } from 'react';
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
  Button,
  IconButton,
  Divider,
  RadioButton,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { useCartStore, CartItem } from '@/store/cartStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '@/services/api';
import { CustomerStackParamList } from '@/navigation/CustomerNavigator';

type CartScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'Cart'>;

interface SessionInfo {
  hawkerId: string;
  tableNumber: string;
  timestamp: number;
}

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<CartScreenNavigationProp>();
  
  const items = useCartStore(state => state.items);
  const updateQuantity = useCartStore(state => state.updateQuantity);
  const removeItem = useCartStore(state => state.removeItem);
  const clearCart = useCartStore(state => state.clearCart);
  const getTotalPrice = useCartStore(state => state.getTotalPrice);
  const getGroupedByStall = useCartStore(state => state.getGroupedByStall);
  
  const [selectedPayment, setSelectedPayment] = useState<string>('PAYNOW');
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStallId, setSelectedStallId] = useState<string>('');
  
  const groupedItems = getGroupedByStall();
  const totalPrice = getTotalPrice();

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      Alert.alert(
        'Remove Item',
        'Are you sure you want to remove this item from your cart?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => removeItem(itemId) }
        ]
      );
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleCheckout = async (stallId: string, stallItems: CartItem[]) => {
    try {
      setLoading(true);
      
      // Get session info
      const sessionStr = await AsyncStorage.getItem('currentSession');
      if (!sessionStr) {
        Alert.alert('Error', 'Session expired. Please scan the table QR code again.');
        navigation.navigate('ScanTable');
        return;
      }
      
      const session: SessionInfo = JSON.parse(sessionStr);
      
      // Calculate stall total
      const stallTotal = stallItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Create order
      const orderData = {
        tableId: session.tableNumber,
        stallId,
        paymentMode: selectedPayment,
        items: stallItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
        })),
        totalAmount: stallTotal,
      };
      
      console.log('Sending order data:', orderData);
      
      const response = await api.post('/orders', orderData);
      
      if (response.data.success) {
        // Clear the cart items for this stall
        const clearStallItems = useCartStore.getState().clearStallItems;
        clearStallItems(stallId);
        
        // Close payment modal
        setShowPaymentModal(false);
        
        // Navigate to payment screen for non-cash payments
        if (selectedPayment !== 'CASH') {
          navigation.navigate('Payment', {
            orderId: response.data.order.id,
            orderNumber: response.data.order.orderNumber,
            amount: stallTotal,
            paymentMode: selectedPayment,
            stallName: stallItems[0].stallName
          });
        } else {
          // For cash payments, show success and go to orders
          Alert.alert(
            '✅ Order Placed Successfully!',
            `Order #${response.data.order.orderNumber} has been sent to ${stallItems[0].stallName}. Please pay in cash when collecting.`,
            [
              { 
                text: 'View Order', 
                onPress: () => {
                  navigation.getParent()?.navigate('Orders');
                }
              }
            ],
            { cancelable: false }
          );
        }
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      console.error('Error response:', error.response?.data);
      
      // Check if order was actually created despite the error
      if (error.response?.status === 500 && error.response?.data?.message?.includes('notification')) {
        // Order was created but notification failed
        const clearStallItems = useCartStore.getState().clearStallItems;
        clearStallItems(stallId);
        setShowPaymentModal(false);
        
        Alert.alert(
          '✅ Order Placed',
          'Your order has been placed successfully!',
          [
            { 
              text: 'View Orders', 
              onPress: () => {
                navigation.getParent()?.navigate('Orders');
              }
            }
          ]
        );
      } else {
        // Actual order creation failure
        Alert.alert(
          'Order Failed',
          error.response?.data?.message || 'Failed to place order. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const initiateCheckout = (stallId: string) => {
    setSelectedStallId(stallId);
    setShowPaymentModal(true);
  };

  const renderCartItem = (item: CartItem) => (
    <Card key={item.id} style={styles.itemCard}>
      <Card.Content style={styles.itemContent}>
        <View style={styles.itemDetails}>
          <Text variant="titleMedium" style={styles.itemName}>
            {item.name}
          </Text>
          {item.specialInstructions && (
            <Text variant="bodySmall" style={styles.specialInstructions}>
              Note: {item.specialInstructions}
            </Text>
          )}
          <Text variant="titleMedium" style={styles.itemPrice}>
            ${(item.price * item.quantity).toFixed(2)}
          </Text>
        </View>
        
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
        )}
        
        <View style={styles.quantityControls}>
          <IconButton
            icon="minus"
            size={20}
            onPress={() => handleQuantityChange(item.id, item.quantity - 1)}
            mode="outlined"
          />
          <Text variant="titleMedium" style={styles.quantity}>
            {item.quantity}
          </Text>
          <IconButton
            icon="plus"
            size={20}
            onPress={() => handleQuantityChange(item.id, item.quantity + 1)}
            mode="outlined"
          />
        </View>
      </Card.Content>
    </Card>
  );

  const renderStallGroup = (stallId: string, stallItems: CartItem[]) => {
    const stallName = stallItems[0]?.stallName || 'Unknown Stall';
    const stallTotal = stallItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    return (
      <Card key={stallId} style={styles.stallCard}>
        <Card.Title 
          title={stallName}
          titleStyle={styles.stallTitle}
          right={(props) => (
            <Text {...props} style={styles.stallTotal}>
              ${stallTotal.toFixed(2)}
            </Text>
          )}
        />
        <Card.Content>
          {stallItems.map(renderCartItem)}
        </Card.Content>
        <Card.Actions>
          <Button
            mode="contained"
            onPress={() => initiateCheckout(stallId)}
            loading={loading}
            disabled={loading}
            style={styles.checkoutButton}
          >
            Checkout from {stallName}
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyCart}>
          <Icon name="cart-outline" size={80} color={theme.colors.onSurfaceVariant} />
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            Your cart is empty
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Add some delicious food from the stalls!
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.browseButton}
          >
            Browse Stalls
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cart Items by Stall */}
        {Object.entries(groupedItems).map(([stallId, stallItems]) => 
          renderStallGroup(stallId, stallItems)
        )}
        
        {/* Total Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <View style={styles.summaryRow}>
              <Text variant="titleMedium">Total Items</Text>
              <Text variant="titleMedium">
                {items.reduce((sum, item) => sum + item.quantity, 0)}
              </Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text variant="titleLarge" style={styles.totalLabel}>
                Total Amount
              </Text>
              <Text variant="titleLarge" style={styles.totalAmount}>
                ${totalPrice.toFixed(2)}
              </Text>
            </View>
          </Card.Content>
        </Card>
        
        {/* Clear Cart */}
        <Button
          mode="outlined"
          onPress={() => {
            Alert.alert(
              'Clear Cart',
              'Are you sure you want to remove all items?',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Clear All', 
                  style: 'destructive',
                  onPress: clearCart
                }
              ]
            );
          }}
          style={styles.clearButton}
          textColor={theme.colors.error}
        >
          Clear All Items
        </Button>
      </ScrollView>
      
      {/* Payment Modal */}
      <Portal>
        <Modal
          visible={showPaymentModal}
          onDismiss={() => setShowPaymentModal(false)}
          contentContainerStyle={styles.modalContent}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Select Payment Method
          </Text>
          
          <RadioButton.Group
            onValueChange={setSelectedPayment}
            value={selectedPayment}
          >
            <RadioButton.Item 
              label="PayNow" 
              value="PAYNOW"
              labelStyle={styles.radioLabel}
            />
            <RadioButton.Item 
              label="Cash" 
              value="CASH"
              labelStyle={styles.radioLabel}
            />
            <RadioButton.Item 
              label="GrabPay" 
              value="GRABPAY"
              labelStyle={styles.radioLabel}
            />
            <RadioButton.Item 
              label="PayLah!" 
              value="PAYLAH"
              labelStyle={styles.radioLabel}
            />
          </RadioButton.Group>
          
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowPaymentModal(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={() => {
                const stallItems = groupedItems[selectedStallId];
                if (stallItems) {
                  handleCheckout(selectedStallId, stallItems);
                }
              }}
              loading={loading}
              disabled={loading}
              style={styles.modalButton}
            >
              Confirm Order
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
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  stallCard: {
    marginBottom: spacing.lg,
  },
  stallTitle: {
    fontWeight: '600',
  },
  stallTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
    marginRight: spacing.md,
  },
  itemCard: {
    marginBottom: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontWeight: '500',
    marginBottom: spacing.xs,
  },
  specialInstructions: {
    color: theme.colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  itemPrice: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginHorizontal: spacing.sm,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantity: {
    marginHorizontal: spacing.xs,
    minWidth: 30,
    textAlign: 'center',
  },
  checkoutButton: {
    marginTop: spacing.sm,
  },
  summaryCard: {
    marginVertical: spacing.lg,
    backgroundColor: theme.colors.primaryContainer,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontWeight: '600',
  },
  totalAmount: {
    fontWeight: '700',
    color: theme.colors.primary,
  },
  clearButton: {
    marginTop: spacing.md,
    borderColor: theme.colors.error,
  },
  emptyCart: {
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
  browseButton: {
    paddingHorizontal: spacing.xl,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  modalTitle: {
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  radioLabel: {
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
});

export default CartScreen;