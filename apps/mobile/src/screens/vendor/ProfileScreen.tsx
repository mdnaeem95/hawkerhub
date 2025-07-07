// apps/mobile/src/screens/shared/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import {
  Text,
  Card,
  List,
  Button,
  Portal,
  Modal,
  TextInput,
  Avatar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { theme, spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { StackNavigationProp } from '@react-navigation/stack';
import { VendorStackParamList } from '@/navigation/VendorNavigator';
import { pushNotificationService } from '@/services/pushNotification.service';

type VendorProfileScreenNavigationProp = StackNavigationProp<VendorStackParamList, 'EditMenuItem'>;

interface StallInfo {
  id: string;
  name: string;
  phoneNumber: string;
  isActive: boolean;
  openTime?: string;
  closeTime?: string;
}

interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  newFeatures: boolean;
}

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<VendorProfileScreenNavigationProp>();
  const { user, userRole, logout } = useAuthStore();
  const [stallInfo, setStallInfo] = useState<StallInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedPhone, setEditedPhone] = useState('');
  const [sendingTestNotification, setSendingTestNotification] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    orderUpdates: true,
    promotions: true,
    newFeatures: true,
  });

  useEffect(() => {
    if (userRole === 'vendor') {
      fetchVendorInfo();
    }
    fetchNotificationPreferences();
  }, [userRole]);

  const fetchVendorInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vendor/profile');
      if (response.data.success) {
        setStallInfo(response.data.stall);
        setEditedPhone(response.data.stall.phoneNumber);
      }
    } catch (error) {
      console.error('Error fetching vendor info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationPreferences = async () => {
    try {
      const response = await api.get('/notifications/preferences');
      if (response.data.success && response.data.preferences) {
        setNotificationPrefs(response.data.preferences);
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
    }
  };

  const updateNotificationPreference = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      const newPrefs = { ...notificationPrefs, [key]: value };
      setNotificationPrefs(newPrefs);
      
      await api.put('/notifications/preferences', newPrefs);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      // Revert on error
      setNotificationPrefs(prev => ({ ...prev, [key]: !value }));
    }
  };

  const toggleStallStatus = async () => {
    if (!stallInfo) return;

    try {
      const response = await api.patch(`/vendor/stall/status`, {
        isActive: !stallInfo.isActive
      });
      
      if (response.data.success) {
        setStallInfo(prev => prev ? { ...prev, isActive: !prev.isActive } : null);
        Alert.alert(
          'Success',
          `Stall is now ${!stallInfo.isActive ? 'open' : 'closed'}`
        );
      }
    } catch (error) {
      console.error('Error toggling stall status:', error);
      Alert.alert('Error', 'Failed to update stall status');
    }
  };

  const updatePhoneNumber = async () => {
    try {
      const response = await api.patch('/vendor/profile', {
        phoneNumber: editedPhone
      });
      
      if (response.data.success) {
        setStallInfo(prev => prev ? { ...prev, phoneNumber: editedPhone } : null);
        setEditModalVisible(false);
        Alert.alert('Success', 'Phone number updated');
      }
    } catch (error) {
      console.error('Error updating phone number:', error);
      Alert.alert('Error', 'Failed to update phone number');
    }
  };

  const testNotification = async () => {
    try {
      setSendingTestNotification(true);
      
      // First ensure we have push permissions
      const token = await pushNotificationService.registerForPushNotifications();
      
      if (!token) {
        Alert.alert(
          'Notifications Disabled',
          'Please enable notifications in your device settings to receive test notifications.'
        );
        return;
      }
      
      // Send test notification
      await api.post('/notifications/test');
      
      Alert.alert(
        'Test Sent', 
        'Check your notifications! If you don\'t see it, make sure notifications are enabled for HawkerHub in your device settings.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      
      let errorMessage = 'Failed to send test notification';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSendingTestNotification(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const renderVendorSection = () => (
    <>
      <Card style={styles.stallCard}>
        <Card.Content>
          <View style={styles.stallHeader}>
            <View>
              <Text style={styles.stallName}>{stallInfo?.name || 'Loading...'}</Text>
              <Text style={styles.stallPhone}>{stallInfo?.phoneNumber}</Text>
            </View>
            <Switch
              value={stallInfo?.isActive || false}
              onValueChange={toggleStallStatus}
            />
          </View>
          <Text style={styles.stallStatus}>
            Status: {stallInfo?.isActive ? 'Open' : 'Closed'}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.section}>
        <List.Section>
          <List.Subheader>Business Settings</List.Subheader>
          <List.Item
            title="Edit Phone Number"
            description={stallInfo?.phoneNumber}
            left={props => <List.Icon {...props} icon="phone" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setEditModalVisible(true)}
          />
          <List.Item
            title="Operating Hours"
            description="Set your business hours"
            left={props => <List.Icon {...props} icon="clock-outline" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => Alert.alert('Coming Soon', 'Operating hours feature coming soon!')}
          />
          <List.Item
            title="Menu Management"
            description="Edit your menu items"
            left={props => <List.Icon {...props} icon="food" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('EditMenuItem' as any)}
          />
          <List.Item
            title="POS Integration"
            description="Connect your POS system"
            left={props => <List.Icon {...props} icon="link" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('POSIntegration' as any)}
          />
        </List.Section>
      </Card>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <Card style={styles.userCard}>
          <Card.Content style={styles.userContent}>
            <Avatar.Icon 
              size={80} 
              icon="account" 
              style={styles.avatar}
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
              <Text style={styles.userPhone}>{user?.phoneNumber}</Text>
              <Text style={styles.userRole}>
                {userRole === 'vendor' ? 'Vendor Account' : 'Customer Account'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Vendor-specific section */}
        {userRole === 'vendor' && stallInfo && renderVendorSection()}

        {/* Notifications */}
        <Card style={styles.section}>
          <List.Section>
            <List.Subheader>Notifications</List.Subheader>
            <List.Item
              title="Order Updates"
              description="Get notified about order status"
              left={props => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={notificationPrefs.orderUpdates}
                  onValueChange={(value) => updateNotificationPreference('orderUpdates', value)}
                />
              )}
            />
            <List.Item
              title="Promotions"
              description="Receive promotional updates"
              left={props => <List.Icon {...props} icon="tag" />}
              right={() => (
                <Switch
                  value={notificationPrefs.promotions}
                  onValueChange={(value) => updateNotificationPreference('promotions', value)}
                />
              )}
            />
            <List.Item
              title="Test Notification"
              description="Send a test push notification"
              left={props => <List.Icon {...props} icon="send" />}
              onPress={testNotification}
            />
          </List.Section>
        </Card>

        {/* App Settings */}
        <Card style={styles.section}>
          <List.Section>
            <List.Subheader>App Settings</List.Subheader>
            <List.Item
              title="Language"
              description="English"
              left={props => <List.Icon {...props} icon="translate" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => Alert.alert('Coming Soon', 'Language selection coming soon!')}
            />
            <List.Item
              title="Privacy Policy"
              left={props => <List.Icon {...props} icon="shield-check" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            <List.Item
              title="Terms of Service"
              left={props => <List.Icon {...props} icon="file-document" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
            <List.Item
              title="About"
              left={props => <List.Icon {...props} icon="information" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {}}
            />
          </List.Section>
        </Card>

        {/* Logout */}
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor={theme.colors.error}
          icon="logout"
        >
          Logout
        </Button>

        {/* Edit Phone Modal */}
        <Portal>
          <Modal
            visible={editModalVisible}
            onDismiss={() => setEditModalVisible(false)}
            contentContainerStyle={styles.modalContent}
          >
            <Text style={styles.modalTitle}>Edit Phone Number</Text>
            <TextInput
              label="Phone Number"
              value={editedPhone}
              onChangeText={setEditedPhone}
              mode="outlined"
              keyboardType="phone-pad"
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button
                mode="text"
                onPress={() => setEditModalVisible(false)}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={updatePhoneNumber}
              >
                Save
              </Button>
            </View>
          </Modal>
        </Portal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  userCard: {
    margin: spacing.lg,
  },
  userContent: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    marginBottom: spacing.md,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.gray[900],
  },
  userPhone: {
    fontSize: 16,
    color: theme.colors.gray[600],
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stallCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  stallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stallName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.gray[900],
  },
  stallPhone: {
    fontSize: 14,
    color: theme.colors.gray[600],
    marginTop: 4,
  },
  stallStatus: {
    fontSize: 14,
    color: theme.colors.gray[700],
    marginTop: spacing.sm,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  logoutButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl * 2,
    borderColor: theme.colors.error,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: spacing.lg,
    margin: spacing.lg,
    borderRadius: theme.borderRadius.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  modalInput: {
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
});

export default ProfileScreen;