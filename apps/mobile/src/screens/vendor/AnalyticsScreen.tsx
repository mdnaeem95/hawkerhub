// apps/mobile/src/screens/vendor/AnalyticsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Card,
  SegmentedButtons,
  ActivityIndicator,
  Surface,
  Divider,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CartesianChart,
  Line,
  Area,
  Bar,
} from 'victory-native';
import { Circle, useFont } from '@shopify/react-native-skia';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';

const screenWidth = Dimensions.get('window').width;

interface AnalyticsData {
  revenue: {
    total: number;
    data: Array<{ date: string; amount: number }>;
    growth: number;
  };
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    data: Array<{ date: string; count: number }>;
  };
  topItems: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  peakHours: Array<{
    hour: number;
    orders: number;
  }>;
  customerMetrics: {
    totalCustomers: number;
    repeatCustomers: number;
    averageOrderValue: number;
  };
  paymentMethods: Array<{
    method: string;
    count: number;
    percentage: number;
  }>;
}

export const AnalyticsScreen: React.FC = () => {
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/vendor/analytics?period=${period}`);
      if (response.data.success) {
        setAnalyticsData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check if we have any data
  if (!analyticsData || analyticsData.orders.total === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Icon name="chart-line" size={80} color={theme.colors.gray[300]} />
          <Text style={styles.emptyTitle}>No Analytics Data Yet</Text>
          <Text style={styles.emptyText}>
            Start taking orders to see your analytics here.
          </Text>
          <Text style={styles.emptySubtext}>
            Analytics will show revenue trends, popular items, and customer insights.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Format data for Victory Native charts
  const revenueData = analyticsData.revenue.data.map((d) => ({
    date: d.date,
    amount: d.amount,
  }));

  const ordersData = analyticsData.orders.data.map((d) => ({
    date: d.date,
    count: d.count,
  }));

  const peakHoursData = analyticsData.peakHours.map((h) => ({
    hour: `${h.hour}:00`,
    orders: h.orders,
  }));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Chip icon="trending-up" style={styles.growthChip}>
            +{analyticsData.revenue.growth}%
          </Chip>
        </View>

        <View style={styles.periodSelector}>
          <SegmentedButtons
            value={period}
            onValueChange={setPeriod}
            buttons={[
              { value: 'today', label: 'Today' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
          />
        </View>

        {/* Revenue Overview */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Revenue Trend</Text>
              <Text style={styles.totalAmount}>${analyticsData.revenue.total.toFixed(2)}</Text>
            </View>
            {revenueData.length > 0 && (
              <View style={styles.chartContainer}>
                <CartesianChart
                  data={revenueData}
                  xKey="date"
                  yKeys={["amount"]}
                  axisOptions={{
                    formatXLabel: (value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en', { weekday: 'short' });
                    },
                    formatYLabel: (value) => `$${value}`,
                  }}
                >
                  {({ points, chartBounds }) => (
                    <>
                      <Area
                        points={points.amount}
                        y0={chartBounds.bottom}
                        color={theme.colors.primary}
                        curveType="catmullRom"
                        animate={{ type: "timing", duration: 300 }}
                        opacity={0.2}
                      />
                      <Line
                        points={points.amount}
                        color={theme.colors.primary}
                        strokeWidth={2}
                        curveType="catmullRom"
                        animate={{ type: "timing", duration: 300 }}
                      />
                    </>
                  )}
                </CartesianChart>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Orders Summary */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Orders Summary</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Icon name="shopping" size={24} color={theme.colors.primary} />
                <Text style={styles.statValue}>{analyticsData.orders.total}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="check-circle" size={24} color={theme.colors.success} />
                <Text style={styles.statValue}>{analyticsData.orders.completed}</Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Icon name="close-circle" size={24} color={theme.colors.error} />
                <Text style={styles.statValue}>{analyticsData.orders.cancelled}</Text>
                <Text style={styles.statLabel}>Cancelled</Text>
              </View>
            </View>
            <Divider style={styles.divider} />
            {ordersData.length > 0 && (
              <View style={styles.chartContainer}>
                <CartesianChart
                  data={ordersData}
                  xKey="date"
                  yKeys={["count"]}
                  axisOptions={{
                    formatXLabel: (value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en', { weekday: 'short' });
                    },
                  }}
                  domainPadding={{ left: 20, right: 20, top: 30 }}
                >
                  {({ points, chartBounds }) => (
                    <Bar
                      points={points.count}
                      chartBounds={chartBounds}
                      color={theme.colors.secondary}
                      animate={{ type: "timing", duration: 300 }}
                    />
                  )}
                </CartesianChart>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Top Selling Items */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Top Selling Items</Text>
            <View style={styles.topItemsList}>
              {analyticsData.topItems.slice(0, 5).map((item, index) => {
                const colors = [
                  theme.colors.primary,
                  theme.colors.secondary,
                  theme.colors.accent,
                  theme.colors.info,
                  theme.colors.gray[400]
                ];
                const totalRevenue = analyticsData.topItems.slice(0, 5)
                  .reduce((sum, i) => sum + i.revenue, 0);
                const percentage = (item.revenue / totalRevenue) * 100;

                return (
                  <View key={index} style={styles.topItem}>
                    <View style={styles.topItemInfo}>
                      <View style={[styles.colorDot, { backgroundColor: colors[index] }]} />
                      <Text style={styles.topItemName} numberOfLines={1}>{item.name}</Text>
                    </View>
                    <View style={styles.topItemStats}>
                      <Text style={styles.topItemCount}>{item.count} sold</Text>
                      <View style={styles.topItemRevenueContainer}>
                        <Text style={styles.topItemRevenue}>${item.revenue.toFixed(2)}</Text>
                        <Text style={styles.topItemPercentage}>{percentage.toFixed(0)}%</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </Card.Content>
        </Card>

        {/* Peak Hours */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Peak Hours</Text>
            {peakHoursData.length > 0 && (
              <View style={styles.chartContainer}>
                <CartesianChart
                  data={peakHoursData}
                  xKey="hour"
                  yKeys={["orders"]}
                  axisOptions={{
                    axisSide: { x: "bottom", y: "left" },
                  }}
                  domainPadding={{ left: 20, right: 20, top: 30 }}
                >
                  {({ points, chartBounds }) => (
                    <Bar
                      points={points.orders}
                      chartBounds={chartBounds}
                      color={theme.colors.accent}
                      animate={{ type: "timing", duration: 300 }}
                    />
                  )}
                </CartesianChart>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Payment Methods */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Payment Methods</Text>
            <View style={styles.paymentMethods}>
              {analyticsData.paymentMethods.map((method, index) => (
                <View key={index} style={styles.paymentMethod}>
                  <View style={styles.paymentInfo}>
                    <Icon 
                      name={
                        method.method === 'PAYNOW' ? 'qrcode' : 
                        method.method === 'CASH' ? 'cash' : 
                        method.method === 'GRABPAY' ? 'wallet' :
                        'credit-card'
                      } 
                      size={24} 
                      color={theme.colors.primary} 
                    />
                    <Text style={styles.paymentName}>{method.method}</Text>
                  </View>
                  <View style={styles.paymentStats}>
                    <Text style={styles.paymentCount}>{method.count} orders</Text>
                    <Chip compact style={styles.paymentChip}>
                      {method.percentage.toFixed(1)}%
                    </Chip>
                  </View>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Customer Metrics */}
        <Card style={[styles.card, { marginBottom: spacing.xl * 2 }]}>
          <Card.Content>
            <Text style={styles.cardTitle}>Customer Insights</Text>
            <View style={styles.metricsGrid}>
              <Surface style={styles.metricCard}>
                <Icon name="account-group" size={32} color={theme.colors.primary} />
                <Text style={styles.metricValue}>{analyticsData.customerMetrics.totalCustomers}</Text>
                <Text style={styles.metricLabel}>Total Customers</Text>
              </Surface>
              <Surface style={styles.metricCard}>
                <Icon name="account-heart" size={32} color={theme.colors.success} />
                <Text style={styles.metricValue}>{analyticsData.customerMetrics.repeatCustomers}</Text>
                <Text style={styles.metricLabel}>Repeat Customers</Text>
                <Text style={styles.metricSubtext}>
                  {analyticsData.customerMetrics.totalCustomers > 0 
                    ? `${((analyticsData.customerMetrics.repeatCustomers / analyticsData.customerMetrics.totalCustomers) * 100).toFixed(0)}% retention`
                    : '0% retention'
                  }
                </Text>
              </Surface>
              <Surface style={styles.metricCard}>
                <Icon name="cash" size={32} color={theme.colors.warning} />
                <Text style={styles.metricValue}>${analyticsData.customerMetrics.averageOrderValue.toFixed(2)}</Text>
                <Text style={styles.metricLabel}>Avg Order Value</Text>
              </Surface>
            </View>
          </Card.Content>
        </Card>
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.gray[600],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.gray[500],
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
  },
  growthChip: {
    backgroundColor: theme.colors.success,
  },
  periodSelector: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  chartContainer: {
    height: 200,
    marginTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.gray[600],
    marginTop: spacing.xs,
  },
  divider: {
    marginVertical: spacing.md,
  },
  topItemsList: {
    marginTop: spacing.md,
  },
  topItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  topItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  topItemName: {
    fontSize: 14,
    color: theme.colors.gray[900],
    flex: 1,
  },
  topItemStats: {
    alignItems: 'flex-end',
  },
  topItemCount: {
    fontSize: 14,
    color: theme.colors.gray[600],
  },
  topItemRevenueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topItemRevenue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
  },
  topItemPercentage: {
    fontSize: 12,
    color: theme.colors.gray[500],
  },
  paymentMethods: {
    marginTop: spacing.md,
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentName: {
    fontSize: 16,
    color: theme.colors.gray[900],
    marginLeft: spacing.md,
  },
  paymentStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paymentCount: {
    fontSize: 14,
    color: theme.colors.gray[600],
  },
  paymentChip: {
    backgroundColor: theme.colors.primary,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  metricCard: {
    flex: 1,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    borderRadius: 12,
    elevation: 2,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
    marginTop: spacing.sm,
  },
  metricLabel: {
    fontSize: 12,
    color: theme.colors.gray[600],
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  metricSubtext: {
    fontSize: 10,
    color: theme.colors.gray[500],
    marginTop: spacing.xs,
  },
});