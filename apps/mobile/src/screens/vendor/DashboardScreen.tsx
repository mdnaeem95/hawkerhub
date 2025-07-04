// apps/mobile/src/screens/vendor/DashboardScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Surface,
  IconButton,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { VendorTabParamList } from '@/navigation/VendorNavigator';

type DashboardNavigationProp = BottomTabNavigationProp<VendorTabParamList, 'Dashboard'>;

interface DashboardStats {
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  averageOrderValue: number;
  popularItems: Array<{
    name: string;
    count: number;
  }>;
}

export const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavigationProp>();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual vendor stats endpoint
      // const response = await api.get('/vendor/dashboard-stats');
      
      // Mock data for now
      setStats({
        todayOrders: 45,
        todayRevenue: 523.50,
        pendingOrders: 3,
        completedOrders: 42,
        averageOrderValue: 11.63,
        popularItems: [
          { name: 'Chicken Rice', count: 12 },
          { name: 'Iced Kopi', count: 8 },
          { name: 'Char Kway Teow', count: 6 },
        ]
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const QuickAction = ({ icon, label, onPress, color = theme.colors.primary }: any) => (
    <Surface style={styles.quickAction} elevation={1}>
      <IconButton
        icon={icon}
        iconColor={color}
        size={28}
        onPress={onPress}
      />
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.stallName}>{user?.name || 'Stall Owner'}</Text>
          </View>
          <IconButton
            icon="bell"
            size={24}
            onPress={() => {}}
            style={styles.notificationBtn}
          />
        </View>

        {/* Today's Summary */}
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Today's Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.todayOrders || 0}</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${stats?.todayRevenue.toFixed(2) || '0.00'}</Text>
                <Text style={styles.statLabel}>Revenue</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.warning }]}>
                  {stats?.pendingOrders || 0}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickAction
              icon="clipboard-list"
              label="Orders"
              onPress={() => navigation.navigate('Orders')}
              color={theme.colors.primary}
            />
            <QuickAction
              icon="food"
              label="Menu"
              onPress={() => navigation.navigate('Menu')}
              color={theme.colors.secondary}
            />
            <QuickAction
              icon="chart-line"
              label="Analytics"
              onPress={() => navigation.navigate('Analytics')}
              color={theme.colors.info}
            />
            <QuickAction
              icon="cog"
              label="Settings"
              onPress={() => navigation.navigate('Profile')}
              color={theme.colors.gray[600]}
            />
          </View>
        </View>

        {/* Popular Items */}
        <Card style={styles.popularCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Popular Today</Text>
              <Button
                mode="text"
                compact
                onPress={() => navigation.navigate('Analytics' as any)}
              >
                View All
              </Button>
            </View>
            {stats?.popularItems.map((item, index) => (
              <View key={index} style={styles.popularItem}>
                <Text style={styles.popularItemName}>{item.name}</Text>
                <Text style={styles.popularItemCount}>{item.count} orders</Text>
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Active Order Alert */}
        {stats?.pendingOrders! > 0 && (
          <Card style={[styles.alertCard, { backgroundColor: theme.colors.warning }]}>
            <Card.Content style={styles.alertContent}>
              <Icon name="alert-circle" size={24} color={theme.colors.warning} />
              <View style={styles.alertText}>
                <Text style={styles.alertTitle}>
                  {stats?.pendingOrders || 0} pending orders
                </Text>
                <Text style={styles.alertSubtitle}>
                  Tap to view and update order status
                </Text>
              </View>
              <IconButton
                icon="chevron-right"
                size={20}
                onPress={() => navigation.navigate('Orders' as any)}
              />
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  greeting: {
    fontSize: 16,
    color: theme.colors.gray[600],
  },
  stallName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.gray[900],
    marginTop: 4,
  },
  notificationBtn: {
    margin: 0,
  },
  summaryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.gray[900],
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.gray[600],
    marginTop: 4,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'white',
  },
  quickActionLabel: {
    fontSize: 12,
    color: theme.colors.gray[700],
    marginTop: 4,
  },
  popularCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  popularItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  popularItemName: {
    fontSize: 16,
    color: theme.colors.gray[800],
  },
  popularItemCount: {
    fontSize: 14,
    color: theme.colors.gray[600],
  },
  alertCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[900],
  },
  alertSubtitle: {
    fontSize: 14,
    color: theme.colors.gray[700],
    marginTop: 2,
  },
});