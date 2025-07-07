import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
  imageUrl: string;
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
    checkForReorderAndNavigate();
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

  const checkForReorderAndNavigate = async () => {
    try {
      // Check if we have reorder info
      const reorderInfoStr = await AsyncStorage.getItem('reorderInfo');
      if (!reorderInfoStr) return;

      const reorderInfo = JSON.parse(reorderInfoStr);
      
      // Clear the reorder info
      await AsyncStorage.removeItem('reorderInfo');

      // Navigate directly to the menu
      navigation.navigate('Menu', {
        stallId: reorderInfo.stallId,
        stallName: reorderInfo.stallName,
        reorderItems: reorderInfo.items
      });
    } catch (error) {
      console.error('Error checking reorder:', error);
    }
  };

  const fetchStalls = async () => {
    try {
      setLoading(true);

      console.log('Fetching stalls for hawker:', hawkerId);

      const response = await api.get(`/hawkers/${hawkerId}/stalls`);
      
      if (response.data.stalls) {
        // Add cuisine based on stall names (since it's not in the DB schema)
        const stallsWithCuisine = response.data.stalls.map((stall: any) => {
          let cuisine = 'Local';
          
          // Determine cuisine based on stall name or description
          if (stall.name.toLowerCase().includes('chicken rice') || 
              stall.name.toLowerCase().includes('char kway teow') ||
              stall.description?.toLowerCase().includes('chinese')) {
            cuisine = 'Chinese';
          } else if (stall.name.toLowerCase().includes('nasi') || 
                     stall.name.toLowerCase().includes('malay') ||
                     stall.description?.toLowerCase().includes('malay')) {
            cuisine = 'Malay';
          } else if (stall.name.toLowerCase().includes('briyani') || 
                     stall.name.toLowerCase().includes('indian') ||
                     stall.description?.toLowerCase().includes('indian')) {
            cuisine = 'Indian';
          } else if (stall.name.toLowerCase().includes('drink') || 
                     stall.name.toLowerCase().includes('juice')) {
            cuisine = 'Beverages';
          }
          
          return {
            ...stall,
            cuisine,
            rating: 4.0 + Math.random() * 0.8 // Mock rating between 4.0-4.8
          };
        });
        
        setStalls(stallsWithCuisine);
        setFilteredStalls(stallsWithCuisine);
        
        console.log(`Loaded ${stallsWithCuisine.length} stalls`);
      }
    } catch (error: any) {
      console.error('Error fetching stalls:', error);
      console.error('Error response:', error.response?.data);
      
      Alert.alert(
        'Error Loading Stalls',
        'Unable to load stalls. Please check your connection and try again.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: fetchStalls }
        ]
      );
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
              uri: item.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=C73E3A&color=fff&size=80`
            }}
            style={styles.stallImage}
            resizeMode='cover'
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
                    {item.rating.toFixed(1)}
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
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
          inputStyle={styles.searchInput}
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
    paddingBottom: spacing.sm,
    justifyContent: 'center'
  },
  searchbar: {
    elevation: 0,
    backgroundColor: theme.colors.surfaceVariant,
  },
  searchInput: {
    fontSize: 16,
    paddingLeft: 0,
  },
  filterWrapper: {
    height: 48,
    backgroundColor: theme.colors.surface,
    marginBottom: spacing.sm,
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
    paddingBottom: spacing.xl * 4, // Add extra padding for tab bar
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
    alignItems: 'stretch'
  },
  stallImage: {
    width: 80,
    aspectRatio: 1,
    borderRadius: 8,
    alignSelf: 'stretch',
    marginRight: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
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
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
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