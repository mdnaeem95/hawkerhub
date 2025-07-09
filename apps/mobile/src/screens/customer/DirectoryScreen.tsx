// apps/mobile/src/screens/customer/DirectoryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  Image,
  Pressable,
} from 'react-native';
import {
  Text,
  Searchbar,
  Card,
  Chip,
  ActivityIndicator,
  Surface,
  IconButton,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';

interface HawkerCenter {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  activeStallCount: number;
}

interface PopularStall {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  orderCount: number;
  hawker: {
    id: string;
    name: string;
  };
}

interface Cuisine {
  name: string;
  stallCount: number;
}

export const DirectoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [hawkers, setHawkers] = useState<HawkerCenter[]>([]);
  const [popularStalls, setPopularStalls] = useState<PopularStall[]>([]);
  const [cuisines, setCuisines] = useState<Cuisine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [hawkersRes, popularRes, cuisinesRes] = await Promise.all([
        api.get('/directory/hawkers'),
        api.get('/directory/popular'),
        api.get('/directory/cuisines'),
      ]);

      if (hawkersRes.data.success) {
        setHawkers(hawkersRes.data.hawkers);
      }
      
      if (popularRes.data.success) {
        setPopularStalls(popularRes.data.stalls);
      }
      
      if (cuisinesRes.data.success) {
        setCuisines(cuisinesRes.data.cuisines);
      }
    } catch (error) {
      console.error('Error fetching directory data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('DirectorySearch', { 
        query: searchQuery,
        cuisine: selectedCuisine 
      });
    }
  };

  const renderHawkerCard = ({ item }: { item: HawkerCenter }) => (
    <Card 
      style={styles.hawkerCard}
      onPress={() => navigation.navigate('HawkerDetail', { hawkerId: item.id })}
    >
      <Card.Cover 
        source={{ 
          uri: item.imageUrl || 'https://via.placeholder.com/300x150' 
        }} 
        style={styles.hawkerImage}
      />
      <Card.Content style={styles.hawkerContent}>
        <Text variant="titleMedium" style={styles.hawkerName}>
          {item.name}
        </Text>
        <Text variant="bodySmall" style={styles.hawkerAddress} numberOfLines={1}>
          {item.address}
        </Text>
        <View style={styles.hawkerStats}>
          <Icon name="store" size={16} color={theme.colors.primary} />
          <Text variant="bodySmall" style={styles.stallCount}>
            {item.activeStallCount} stalls
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderPopularStall = ({ item }: { item: PopularStall }) => (
    <Pressable 
      onPress={() => navigation.navigate('StallDetail', { 
        stallId: item.id,
        fromDirectory: true 
      })}
    >
      <Surface style={styles.popularStallCard} elevation={2}>
        <Image 
          source={{ 
            uri: item.imageUrl || 'https://via.placeholder.com/120x120' 
          }} 
          style={styles.popularStallImage}
        />
        <View style={styles.popularStallInfo}>
          <Text variant="titleSmall" style={styles.popularStallName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={styles.popularHawkerName}>
            {item.hawker.name}
          </Text>
          <View style={styles.orderCount}>
            <Icon name="fire" size={14} color={theme.colors.warning} />
            <Text variant="bodySmall" style={styles.orderCountText}>
              {item.orderCount} orders
            </Text>
          </View>
        </View>
      </Surface>
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading directory...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text style={styles.title}>Explore Hawker Centers</Text>
          <Text style={styles.subtitle}>
            Browse menus and find your favorite food
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search food or stalls..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            onSubmitEditing={handleSearch}
            style={styles.searchBar}
            icon="magnify"
            onIconPress={handleSearch}
          />
        </View>

        {/* Cuisine Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Cuisine</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.cuisineScroll}
          >
            {cuisines.map((cuisine) => (
              <Chip
                key={cuisine.name}
                selected={selectedCuisine === cuisine.name}
                onPress={() => {
                  if (selectedCuisine === cuisine.name) {
                    setSelectedCuisine(null);
                  } else {
                    setSelectedCuisine(cuisine.name);
                    navigation.navigate('DirectorySearch', { 
                      cuisine: cuisine.name 
                    });
                  }
                }}
                style={styles.cuisineChip}
                mode="outlined"
              >
                {cuisine.name} ({cuisine.stallCount})
              </Chip>
            ))}
          </ScrollView>
        </View>

        {/* Popular Stalls */}
        {popularStalls.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Popular Right Now</Text>
              <IconButton
                icon="chevron-right"
                size={20}
                onPress={() => navigation.navigate('PopularStalls')}
              />
            </View>
            <FlatList
              data={popularStalls.slice(0, 5)}
              renderItem={renderPopularStall}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularList}
            />
          </View>
        )}

        {/* All Hawker Centers */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All Hawker Centers</Text>
          <FlatList
            data={hawkers}
            renderItem={renderHawkerCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.hawkerList}
          />
        </View>

        {/* Notice */}
        <Card style={styles.noticeCard}>
          <Card.Content>
            <View style={styles.noticeHeader}>
              <Icon name="information" size={20} color={theme.colors.info} />
              <Text style={styles.noticeTitle}>How to Order</Text>
            </View>
            <Text style={styles.noticeText}>
              To place an order, please visit the hawker center and scan the QR code at your table.
            </Text>
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
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.gray[600],
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.gray[900],
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  cuisineScroll: {
    paddingHorizontal: spacing.lg,
  },
  cuisineChip: {
    marginRight: spacing.sm,
  },
  popularList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  popularStallCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: spacing.sm,
    width: 140,
    marginRight: spacing.md,
  },
  popularStallImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  popularStallInfo: {
    flex: 1,
  },
  popularStallName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  popularHawkerName: {
    color: theme.colors.gray[600],
    marginBottom: spacing.xs,
  },
  orderCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  orderCountText: {
    color: theme.colors.gray[600],
    fontSize: 12,
  },
  hawkerList: {
    paddingHorizontal: spacing.lg,
  },
  hawkerCard: {
    marginBottom: spacing.md,
  },
  hawkerImage: {
    height: 150,
  },
  hawkerContent: {
    paddingTop: spacing.md,
  },
  hawkerName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  hawkerAddress: {
    color: theme.colors.gray[600],
    marginBottom: spacing.sm,
  },
  hawkerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  stallCount: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  noticeCard: {
    margin: spacing.lg,
    marginBottom: spacing.xl * 2,
    backgroundColor: theme.colors.info + '10',
    borderWidth: 1,
    borderColor: theme.colors.info + '30',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.info,
  },
  noticeText: {
    color: theme.colors.gray[700],
    lineHeight: 20,
  },
});