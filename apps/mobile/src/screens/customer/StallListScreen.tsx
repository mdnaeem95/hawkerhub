import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  Text,
  Card,
  Searchbar,
  Chip,
  FAB,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';
import { useCartStore } from '@/store/cartStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomerStackParamList } from '@/navigation/CustomerNavigator';

interface Stall {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  cuisine?: string;
  rating?: number;
}

type StallListScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'StallList'>;
type StallListScreenRouteProp = RouteProp<CustomerStackParamList, 'StallList'>;

export const StallListScreen: React.FC = () => {
  const navigation = useNavigation<StallListScreenNavigationProp>();
  const route = useRoute<StallListScreenRouteProp>();
  const { hawkerId, tableNumber } = route.params;
  
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [filteredStalls, setFilteredStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);
  
  const cartItemCount = useCartStore(state => state.getTotalItems());

  useEffect(() => {
    fetchStalls();
    // Store session info
    storeSessionInfo();
  }, []);

  useEffect(() => {
    filterStalls();
  }, [searchQuery, selectedCuisine, stalls]);

  const storeSessionInfo = async () => {
    await AsyncStorage.setItem('currentSession', JSON.stringify({
      hawkerId,
      tableNumber,
      timestamp: Date.now(),
    }));
  };

  const fetchStalls = async () => {
    try {
      setLoading(true);

      // Debug logging
      console.log('API Base URL:', api.defaults.baseURL);
      console.log('Fetching from:', `/api/hawkers/${hawkerId}/stalls`);
      console.log('Full URL:', `${api.defaults.baseURL}/api/hawkers/${hawkerId}/stalls`);

      const response = await api.get(`/hawkers/${hawkerId}/stalls`);
      setStalls(response.data.stalls);
      setFilteredStalls(response.data.stalls);
    } catch (error: any) {
      console.error('Error fetching stalls:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error config:', error.config?.url);
      // For now, use mock data
      const mockStalls: Stall[] = [
        {
          id: '1',
          name: 'Hainanese Chicken Rice',
          description: 'Famous for tender chicken and fragrant rice',
          isActive: true,
          cuisine: 'Chinese',
          rating: 4.5,
        },
        {
          id: '2',
          name: 'Char Kway Teow',
          description: 'Wok-fried flat rice noodles with prawns',
          isActive: true,
          cuisine: 'Chinese',
          rating: 4.3,
        },
        {
          id: '3',
          name: 'Nasi Lemak Corner',
          description: 'Coconut rice with sambal and sides',
          isActive: true,
          cuisine: 'Malay',
          rating: 4.6,
        },
        {
          id: '4',
          name: 'Indian Rojak',
          description: 'Mixed fritters with special sauce',
          isActive: false,
          cuisine: 'Indian',
          rating: 4.2,
        },
      ];
      setStalls(mockStalls);
      setFilteredStalls(mockStalls);
    } finally {
      setLoading(false);
    }
  };

  const filterStalls = () => {
    let filtered = stalls;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(stall =>
        stall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stall.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by cuisine
    if (selectedCuisine) {
      filtered = filtered.filter(stall => stall.cuisine === selectedCuisine);
    }

    setFilteredStalls(filtered);
  };

  const cuisineTypes = [...new Set(stalls.map(s => s.cuisine).filter((c): c is string => Boolean(c)))];

  const renderStall = ({ item }: { item: Stall }) => (
    <TouchableOpacity
      onPress={() => {
        if (item.isActive) {
          navigation.navigate('Menu', { 
            stallId: item.id, 
            stallName: item.name 
          });
        }
      }}
      disabled={!item.isActive}
    >
      <Card style={[styles.stallCard, !item.isActive && styles.inactiveCard]}>
        <Card.Content style={styles.cardContent}>
          <Image
            source={{ 
              uri: 'https://via.placeholder.com/80x80?text=Stall' 
            }}
            style={styles.stallImage}
          />
          <View style={styles.stallInfo}>
            <Text variant="titleMedium" style={styles.stallName}>
              {item.name}
            </Text>
            {item.description && (
              <Text variant="bodySmall" style={styles.stallDescription}>
                {item.description}
              </Text>
            )}
            <View style={styles.stallMeta}>
              {item.cuisine && (
                <Chip compact style={styles.cuisineChip} textStyle={{ fontSize: 12 }}>
                  {item.cuisine}
                </Chip>
              )}
              {item.rating && (
                <View style={styles.rating}>
                  <Icon name="star" size={16} color="#FFC107" />
                  <Text variant="bodySmall" style={styles.ratingText}>
                    {item.rating}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {!item.isActive && (
            <View style={styles.closedOverlay}>
              <Text style={styles.closedText}>CLOSED</Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Table Info */}
      <View style={styles.tableInfo}>
        <Icon name="table-furniture" size={20} color={theme.colors.primary} />
        <Text variant="bodyMedium" style={styles.tableText}>
          Table {tableNumber}
        </Text>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search stalls..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {/* Cuisine Filter */}
      {cuisineTypes.length > 0 && (
        <View style={styles.filterWrapper}>
          <FlatList
            horizontal
            data={['All', ...cuisineTypes]}
            renderItem={({ item }) => (
              <Chip
                selected={item === 'All' ? !selectedCuisine : selectedCuisine === item}
                onPress={() => setSelectedCuisine(item === 'All' ? null : item as string)}
                style={styles.filterChip}
                mode="flat"
                compact
                textStyle={{ fontSize: 14 }}
              >
                {item}
              </Chip>
            )}
            keyExtractor={(item) => item || 'unknown'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          />
        </View>
      )}

      {/* Stall List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredStalls}
          renderItem={renderStall}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="store-off" size={64} color={theme.colors.onSurfaceVariant} />
              <Text variant="titleMedium" style={styles.emptyText}>
                No stalls found
              </Text>
            </View>
          }
        />
      )}

      {/* Cart FAB */}
      {cartItemCount > 0 && (
        <FAB
          icon="cart"
          label={`Cart (${cartItemCount})`}
          onPress={() => navigation.navigate('Cart')}
          style={styles.fab}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  tableInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.primaryContainer,
  },
  tableText: {
    marginLeft: spacing.sm,
    color: theme.colors.onPrimaryContainer,
    fontWeight: '500',
  },
  searchContainer: {
    padding: spacing.md,
    paddingBottom: 0,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: theme.colors.surfaceVariant,
    height: 48,
  },
  filterWrapper: {
    height: 48,
    backgroundColor: theme.colors.surface,
  },
  filterContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  filterChip: {
    marginRight: spacing.sm,
    height: 32,
  },
  listContent: {
    padding: spacing.md,
  },
  stallCard: {
    marginBottom: spacing.md,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  cardContent: {
    flexDirection: 'row',
    position: 'relative',
  },
  stallImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  stallInfo: {
    flex: 1,
  },
  stallName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  stallDescription: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  stallMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cuisineChip: {
    height: 24,
    backgroundColor: theme.colors.primaryContainer,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: '500',
  },
  closedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  closedText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    marginTop: spacing.md,
    color: theme.colors.onSurfaceVariant,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});