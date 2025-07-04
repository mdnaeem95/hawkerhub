import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Card, Avatar, List, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { theme, spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: logout
        },
      ]
    );
  };

  const handleClearData = async () => {
    Alert.alert(
      'Clear App Data',
      'This will clear all app data and log you out. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear Data', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all AsyncStorage
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.clear();
              // Force logout
              logout();
              Alert.alert('Success', 'App data cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear app data');
            }
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Avatar.Text 
            size={80} 
            label={user?.name?.charAt(0) || 'G'} 
            style={styles.avatar}
          />
          <Text variant="headlineSmall" style={styles.name}>
            {user?.name || 'Guest User'}
          </Text>
          <Text variant="bodyMedium" style={styles.phone}>
            {user?.phoneNumber || 'No phone number'}
          </Text>
          <Text variant="bodySmall" style={styles.userType}>
            {user?.userType === 'vendor' ? 'Vendor Account' : 'Customer Account'}
          </Text>
        </View>

        {/* Account Info */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Account Information
            </Text>
            <List.Item
              title="Phone Number"
              description={user?.phoneNumber || 'Not set'}
              left={props => <List.Icon {...props} icon="phone" />}
            />
            <Divider />
            <List.Item
              title="User ID"
              description={user?.id || 'Not available'}
              left={props => <List.Icon {...props} icon="identifier" />}
            />
          </Card.Content>
        </Card>

        {/* Settings */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Settings
            </Text>
            <List.Item
              title="Language"
              description="English"
              left={props => <List.Icon {...props} icon="translate" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => Alert.alert('Coming Soon', 'Language settings coming soon!')}
            />
            <Divider />
            <List.Item
              title="Notifications"
              description="Manage notification preferences"
              left={props => <List.Icon {...props} icon="bell" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => Alert.alert('Coming Soon', 'Notification settings coming soon!')}
            />
          </Card.Content>
        </Card>

        {/* Support */}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Support
            </Text>
            <List.Item
              title="Help Center"
              left={props => <List.Icon {...props} icon="help-circle" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => Alert.alert('Help', 'Visit our help center at hawkerhub.sg/help')}
            />
            <Divider />
            <List.Item
              title="Contact Support"
              left={props => <List.Icon {...props} icon="message-text" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => Alert.alert('Support', 'Email us at support@hawkerhub.sg')}
            />
          </Card.Content>
        </Card>

        {/* Developer Options (for debugging) */}
        {__DEV__ && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.error }]}>
                Developer Options
              </Text>
              <List.Item
                title="Clear App Data"
                description="Remove all stored data and logout"
                left={props => <List.Icon {...props} icon="delete" color={theme.colors.error} />}
                onPress={handleClearData}
              />
            </Card.Content>
          </Card>
        )}

        {/* Logout Button */}
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          buttonColor={theme.colors.error}
          icon="logout"
        >
          Logout
        </Button>

        {/* App Version */}
        <Text variant="bodySmall" style={styles.version}>
          HawkerHub v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: theme.colors.surface,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    marginBottom: spacing.md,
  },
  name: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  phone: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  userType: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  card: {
    margin: spacing.lg,
    marginBottom: 0,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  logoutButton: {
    margin: spacing.lg,
    marginTop: spacing.xl,
  },
  version: {
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.lg,
  },
});
