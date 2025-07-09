// apps/mobile/src/screens/customer/DirectorySearchScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import {
  Text,
  Searchbar,
  Card,
  Chip,
  ActivityIndicator,
  SegmentedButtons,
  Surface,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';

type DirectorySearchRouteProp = RouteProp<{
  DirectorySearch: { query?: string; cuisine?: string };
}, 'DirectorySearch'>;

interface SearchResult {
  stalls: Array<{
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    hawker: {
      id: string;
      name: string;
    };
    menuItemCount: number;
  }>;
  menuItems: Array<{
    id: string;
    name: string;
    description?: string;
    price: number;
    category: string;
    stall: {
      id: string;
      name: string;
      hawker: {
        id: string;
        name: string;
      };
    };
  }>;
}

export const DirectorySearchScreen: React.FC = () => {
  const route = useRoute<DirectorySearchRouteProp>();
  const navigation = useNavigation<any>();
  const initialQuery = route.params?.query || '';
  const initialCuisine = route.params?.cuisine || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult>({ stalls: [], menuItems: [] });
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (initialQuery || initialCuisine) {
      performSearch();
    }
  }, []);

  const performSearch = async (loadMore = false) => {
    if (!searchQuery.trim() && !initialCuisine) return;
    
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        q: searchQuery || '',
        cuisine: initialCuisine || '',
        page: loadMore ? (page + 1).toString() : '1',
        limit: '20',
      });
      
      const response = await api.get(`/directory/search?${params}`);
      
      if (response.data.success) {
        if (loadMore) {
          setResults(prev => ({
            stalls: [...prev.stalls, ...response.data.results.stalls],
            menuItems: [...prev.menuItems, ...response.data.results.menuItems],
          }));
          setPage(page + 1);
        } else {
          setResults(response.data.results);
          setPage(1);
        }
        
        setHasMore(response.data.pagination.page < response.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStallItem = ({ item }: { item: any }) => (
    <Card 
      style={styles.resultCard}
      onPress={() => navigation.navigate('StallDetail', { 
        stallId: item.id,
        fromDirectory: true 
      })}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.resultInfo}>
          <Text variant="titleMedium" style={styles.resultName}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={styles.resultLocation}>
            {item.hawker.name}
          </Text>
          {item.description && (
            <Text variant="bodySmall" style={styles.resultDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.resultMeta}>
            <Icon name="silverware-fork-knife" size={14} color={theme.colors.gray[600]} />
            <Text variant="bodySmall" style={styles.metaText}>
              {item.menuItemCount} items
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderMenuItem = ({ item }: { item: any }) => (
    <Card 
      style={styles.resultCard}
      onPress={() => navigation.navigate('StallDetail', { 
        stallId: item.stall.id,
        fromDirectory: true 
      })}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.resultInfo}>
          <Text variant="titleMedium" style={styles.resultName}>
            {item.name}
          </Text>
          <Text variant="bodySmall" style={styles.resultLocation}>
            {item.stall.name} • {item.stall.hawker.name}
          </Text>
          {item.description && (
            <Text variant="bodySmall" style={styles.resultDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.priceRow}>
            <Chip compact style={styles.categoryChip}>
              {item.category}
            </Chip>
            <Text variant="titleMedium" style={styles.price}>
              ${item.price.toFixed(2)}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const getFilteredResults = () => {
    if (selectedTab === 'stalls') return results.stalls;
    if (selectedTab === 'dishes') return results.menuItems;
    return [...results.stalls, ...results.menuItems];
  };

  const filteredResults = getFilteredResults();

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={theme.colors.gray[900]} />
          </Pressable>
          <Searchbar
            placeholder="Search food or stalls..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            onSubmitEditing={() => performSearch()}
            style={styles.searchBar}
            autoFocus={!initialCuisine}
          />
        </View>
        
        {initialCuisine && (
          <Surface style={styles.cuisineTag} elevation={1}>
            <Icon name="tag" size={16} color={theme.colors.primary} />
            <Text style={styles.cuisineText}>{initialCuisine}</Text>
            <Pressable 
              onPress={() => navigation.setParams({ cuisine: undefined })}
              style={styles.clearCuisine}
            >
              <Icon name="close" size={16} color={theme.colors.gray[600]} />
            </Pressable>
          </Surface>
        )}
      </View>

      {/* Result Tabs */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={selectedTab}
          onValueChange={setSelectedTab}
          buttons={[
            { 
              value: 'all', 
              label: `All (${results.stalls.length + results.menuItems.length})` 
            },
            { 
              value: 'stalls', 
              label: `Stalls (${results.stalls.length})` 
            },
            { 
              value: 'dishes', 
              label: `Dishes (${results.menuItems.length})` 
            },
          ]}
        />
      </View>

      {/* Results */}
      {loading && page === 1 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : filteredResults.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="magnify-close" size={64} color={theme.colors.gray[400]} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptyText}>
            Try searching with different keywords
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          renderItem={selectedTab === 'dishes' ? renderMenuItem : renderStallItem}
          keyExtractor={(item) => `${selectedTab}-${item.id}`}
          contentContainerStyle={styles.resultsList}
          onEndReached={() => {
            if (hasMore && !loading) {
              performSearch(true);
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loading && page > 1 ? (
              <ActivityIndicator 
                size="small" 
                color={theme.colors.primary} 
                style={styles.loadingMore}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.gray[50],
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
  },
  searchBar: {
    flex: 1,
    elevation: 0,
    backgroundColor: theme.colors.gray[100],
  },
  cuisineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + '10',
    gap: spacing.xs,
  },
  cuisineText: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  clearCuisine: {
    marginLeft: spacing.xs,
  },
  tabContainer: {
    backgroundColor: 'white',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[200],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    color: theme.colors.gray[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.gray[800],
    marginTop: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.gray[600],
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  resultsList: {
    padding: spacing.lg,
  },
  resultCard: {
    marginBottom: spacing.md,
    backgroundColor: 'white',
  },
  cardContent: {
    flexDirection: 'row',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  resultLocation: {
    color: theme.colors.gray[600],
    marginBottom: spacing.xs,
  },
  resultDescription: {
    color: theme.colors.gray[600],
    marginBottom: spacing.sm,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: theme.colors.gray[600],
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  categoryChip: {
    backgroundColor: theme.colors.gray[100],
  },
  price: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  loadingMore: {
    paddingVertical: spacing.lg,
  },
});