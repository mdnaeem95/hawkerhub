// apps/mobile/src/screens/vendor/AnalyticsScreen.tsx
import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Text,
  Card,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme, spacing } from '@/constants/theme';

export const AnalyticsScreen: React.FC = () => {
  const [period, setPeriod] = React.useState('today');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
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

        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Revenue Overview</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>$523.50</Text>
                <Text style={styles.statLabel}>Total Revenue</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>45</Text>
                <Text style={styles.statLabel}>Orders</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.cardTitle}>Top Selling Items</Text>
            <View style={styles.topItem}>
              <Text style={styles.topItemName}>1. Chicken Rice</Text>
              <Text style={styles.topItemCount}>12 orders</Text>
            </View>
            <View style={styles.topItem}>
              <Text style={styles.topItemName}>2. Iced Kopi</Text>
              <Text style={styles.topItemCount}>8 orders</Text>
            </View>
            <View style={styles.topItem}>
              <Text style={styles.topItemName}>3. Char Kway Teow</Text>
              <Text style={styles.topItemCount}>6 orders</Text>
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.gray[900],
  },
  periodSelector: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statsCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
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
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.gray[600],
    marginTop: 4,
  },
  topItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray[200],
  },
  topItemName: {
    fontSize: 16,
    color: theme.colors.gray[800],
  },
  topItemCount: {
    fontSize: 14,
    color: theme.colors.gray[600],
  },
});