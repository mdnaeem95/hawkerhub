// apps/mobile/src/screens/customer/PaymentScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Linking,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Chip,
  List,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';
import { useSocket, useSocketConnection } from '@/hooks/useSocket';

type PaymentScreenRouteProp = RouteProp<{
  Payment: {
    orderId: string;
    orderNumber: string;
    amount: number;
    paymentMode: string;
    stallName: string;
  };
}, 'Payment'>;

type PaymentScreenNavigationProp = StackNavigationProp<any>;

export const PaymentScreen: React.FC = () => {
  const route = useRoute<PaymentScreenRouteProp>();
  const navigation = useNavigation<PaymentScreenNavigationProp>();
  const { orderId, orderNumber, amount, paymentMode, stallName } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [checkingStatus, setCheckingStatus] = useState(false);

  useSocketConnection();

  // Listen for payment completion
  useSocket('payment:completed', (data: { orderId: string; transactionId: string }) => {
    if (data.orderId === orderId) {
      setPaymentStatus('COMPLETED');
      Alert.alert(
        '✅ Payment Successful!',
        'Your payment has been confirmed.',
        [
          {
            text: 'View Order',
            onPress: () => navigation.navigate('Orders')
          }
        ]
      );
    }
  });

  useEffect(() => {
    if (paymentMode !== 'CASH') {
      fetchPaymentQR();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchPaymentQR = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/payments/qr/${orderId}`);
      
      if (response.data.success) {
        setQrCode(response.data.qrCode);
      }
    } catch (error) {
      console.error('Error fetching payment QR:', error);
      Alert.alert('Error', 'Failed to generate payment QR code');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      setCheckingStatus(true);
      const response = await api.get(`/payments/status/${orderId}`);
      
      if (response.data.success && response.data.paid) {
        setPaymentStatus('COMPLETED');
        Alert.alert(
          '✅ Payment Confirmed!',
          'Your payment has been successfully processed.',
          [
            {
              text: 'View Order',
              onPress: () => navigation.navigate('Orders')
            }
          ]
        );
      } else {
        Alert.alert('Payment Pending', 'Payment has not been received yet.');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const openPaymentApp = (app: 'paynow' | 'paylah' | 'grab') => {
    const schemes = {
      paynow: 'paynow://',
      paylah: 'paylah://',
      grab: 'grab://'
    };
    
    Linking.openURL(schemes[app]).catch(() => {
      Alert.alert('App Not Found', `Please install the ${app} app to continue.`);
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Generating payment QR...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.orderNumber}>Order #{orderNumber}</Text>
            <Text style={styles.stallName}>{stallName}</Text>
            <Divider style={styles.divider} />
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>${amount.toFixed(2)}</Text>
            </View>
            <Chip 
              mode="flat" 
              style={[
                styles.statusChip,
                { backgroundColor: paymentStatus === 'COMPLETED' ? theme.colors.success : theme.colors.warning }
              ]}
            >
              {paymentStatus === 'COMPLETED' ? 'Paid' : 'Payment Pending'}
            </Chip>
          </Card.Content>
        </Card>

        {/* Payment Instructions */}
        {paymentMode === 'CASH' ? (
          <Card style={styles.instructionCard}>
            <Card.Content>
              <View style={styles.iconRow}>
                <Icon name="cash" size={48} color={theme.colors.primary} />
              </View>
              <Text style={styles.instructionTitle}>Cash Payment</Text>
              <Text style={styles.instructionText}>
                Please pay ${amount.toFixed(2)} in cash when collecting your order.
              </Text>
              <Text style={styles.instructionText}>
                Show this order number to the stall owner: {orderNumber}
              </Text>
            </Card.Content>
          </Card>
        ) : (
          <>
            {/* QR Code */}
            {qrCode && paymentStatus !== 'COMPLETED' && (
              <Card style={styles.qrCard}>
                <Card.Content>
                  <Text style={styles.qrTitle}>Scan QR Code to Pay</Text>
                  <Image
                    source={{ uri: qrCode }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.qrAmount}>${amount.toFixed(2)}</Text>
                  <Text style={styles.qrMerchant}>{stallName}</Text>
                </Card.Content>
              </Card>
            )}

            {/* Payment App Shortcuts */}
            <Card style={styles.appsCard}>
              <Card.Title title="Or pay using:" />
              <Card.Content>
                <View style={styles.appButtons}>
                  <Button
                    mode="outlined"
                    onPress={() => openPaymentApp('paynow')}
                    style={styles.appButton}
                  >
                    PayNow
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => openPaymentApp('paylah')}
                    style={styles.appButton}
                  >
                    PayLah!
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => openPaymentApp('grab')}
                    style={styles.appButton}
                  >
                    GrabPay
                  </Button>
                </View>
              </Card.Content>
            </Card>
          </>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          {paymentStatus === 'PENDING' && paymentMode !== 'CASH' && (
            <Button
              mode="contained"
              onPress={checkPaymentStatus}
              loading={checkingStatus}
              disabled={checkingStatus}
              style={styles.checkButton}
            >
              Check Payment Status
            </Button>
          )}
          
          <Button
            mode={paymentStatus === 'COMPLETED' ? 'contained' : 'outlined'}
            onPress={() => navigation.navigate('Orders')}
            style={styles.viewOrderButton}
          >
            {paymentStatus === 'COMPLETED' ? 'View Order' : 'I\'ll Pay Later'}
          </Button>
        </View>
      </ScrollView>
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
  summaryCard: {
    margin: spacing.lg,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.gray[900],
  },
  stallName: {
    fontSize: 16,
    color: theme.colors.gray[700],
    marginTop: 4,
  },
  divider: {
    marginVertical: spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  amountLabel: {
    fontSize: 16,
    color: theme.colors.gray[700],
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  instructionCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  iconRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  instructionText: {
    fontSize: 16,
    color: theme.colors.gray[700],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  qrCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  qrTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  qrImage: {
    width: 250,
    height: 250,
    alignSelf: 'center',
  },
  qrAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  qrMerchant: {
    fontSize: 16,
    color: theme.colors.gray[600],
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  appsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  appButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  appButton: {
    flex: 1,
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  checkButton: {
    marginBottom: spacing.sm,
  },
  viewOrderButton: {
    marginBottom: spacing.lg,
  },
});