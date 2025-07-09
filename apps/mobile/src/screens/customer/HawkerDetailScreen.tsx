// apps/mobile/src/screens/customer/HawkerDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Image,
  Pressable,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Searchbar,
  Surface,
  Button,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';

type HawkerDetailRouteProp = RouteProp<{
  HawkerDetail: { hawkerId: string };
}, 'HawkerDetail'>;

interface Stall {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  phoneNumber: string;
  menuItemCount: number;
}

interface HawkerDetail {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  stalls: Stall[];
  cuisines: string[];
}

export const HawkerDetailScreen: React.FC = () => {
  const route = useRoute<HawkerDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { hawkerId } = route.params;
  
  const [hawker, setHawker] = useState<HawkerDetail | null>(null);
  const [filteredStalls, setFilteredStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState<string | null>(null);

  useEffect(() => {
    fetchHawkerDetails();
  }, [hawkerId]);

  useEffect(() => {
    if (hawker) {
      filterStalls();
    }
  }, [searchQuery, selectedCuisine, hawker]);

  const fetchHawkerDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/directory/hawkers/${hawkerId}`);
      
      if (response.data.success) {
        setHawker(response.data.hawker);
        setFilteredStalls(response.data.hawker.stalls);
      }
    } catch (error) {
      console.error('Error fetching hawker details:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStalls = () => {
    if (!hawker) return;
    
    let filtered = hawker.stalls;
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(stall =>
        stall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stall.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filter by cuisine (would need to be implemented with menu data)
    if (selectedCuisine) {
      // This would require checking menu items for each stall
      // For now, we'll just show all stalls
    }
    
    setFilteredStalls(filtered);
  };

  const renderStallCard = ({ item }: { item: Stall }) => (
    <Card 
      style={styles.stallCard}
      onPress={() => navigation.navigate('StallDetail', { 
        stallId: item.id,
        fromDirectory: true 
      })}
    >
      <Card.Content style={styles.stallContent}>
        <View style={styles.stallImageContainer}>
          <Image 
            source={{ 
              uri: item.imageUrl || 'https://via.placeholder.com/80x80' 
            }} 
            style={styles.stallImage}
          />
        </View>
        <View style={styles.stallInfo}>
          <Text variant="titleMedium" style={styles.stallName}>
            {item.name}
          </Text>
          {item.description && (
            <Text variant="bodySmall" style={styles.stallDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.stallMeta}>
            <View style={styles.metaItem}>
              <Icon name="silverware-fork-knife" size={14} color={theme.colors.gray[600]} />
              <Text variant="bodySmall" style={styles.metaText}>
                {item.menuItemCount} items
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="phone" size={14} color={theme.colors.gray[600]} />
              <Text variant="bodySmall" style={styles.metaText}>
                {item.phoneNumber}
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!hawker) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>Failed to load hawker center details</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Image */}
        <View style={styles.headerContainer}>
          <Image 
            source={{ 
              uri: hawker.imageUrl || 'https://via.placeholder.com/400x200' 
            }} 
            style={styles.headerImage}
          />
          <View style={styles.headerOverlay} />
          <View style={styles.headerContent}>
            <Text style={styles.hawkerName}>{hawker.name}</Text>
            <View style={styles.addressContainer}>
              <Icon name="map-marker" size={16} color="white" />
              <Text style={styles.address}>{hawker.address}</Text>
            </View>
          </View>
          <Pressable 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color="white" />
          </Pressable>
        </View>

        {/* Stats */}
        <Surface style={styles.statsContainer} elevation={2}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{hawker.stalls.length}</Text>
            <Text style={styles.statLabel}>Stalls</Text>
          </View>
          <Divider style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{hawker.cuisines.length}</Text>
            <Text style={styles.statLabel}>Cuisines</Text>
          </View>
        </Surface>

        {/* Search and Filter */}
        <View style={styles.searchSection}>
          <Searchbar
            placeholder="Search stalls..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          
          {/* Cuisine Filter */}
          {hawker.cuisines.length > 0 && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.cuisineFilter}
            >
              <Chip
                selected={!selectedCuisine}
                onPress={() => setSelectedCuisine(null)}
                style={styles.cuisineChip}
                mode="outlined"
              >
                All
              </Chip>
              {hawker.cuisines.map((cuisine) => (
                <Chip
                  key={cuisine}
                  selected={selectedCuisine === cuisine}
                  onPress={() => setSelectedCuisine(cuisine)}
                  style={styles.cuisineChip}
                  mode="outlined"
                >
                  {cuisine}
                </Chip>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Stalls List */}
        <View style={styles.stallsSection}>
          <Text style={styles.sectionTitle}>
            {filteredStalls.length} Stalls
          </Text>
          <FlatList
            data={filteredStalls}
            renderItem={renderStallCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Icon name="store-off" size={48} color={theme.colors.gray[400]} />
                <Text style={styles.emptyText}>No stalls found</Text>
              </View>
            }
          />
        </View>

        {/* Order Notice */}
        <Card style={styles.orderNotice}>
          <Card.Content>
            <View style={styles.noticeHeader}>
              <Icon name="qrcode-scan" size={24} color={theme.colors.primary} />
              <Text style={styles.noticeTitle}>Ready to Order?</Text>
            </View>
            <Text style={styles.noticeText}>
              Visit {hawker.name} and scan the QR code at your table to start ordering.
            </Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Order')}
              style={styles.scanButton}
              icon="qrcode-scan"
            >
              Scan Table QR Code
            </Button>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    height: 200,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  headerContent: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  hawkerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.sm,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  address: {
    fontSize: 14,
    color: 'white',
  },
  backButton: {
    position: 'absolute',
    top: spacing.xl,
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: spacing.lg,
    marginTop: -spacing.xl,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.gray[600],
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: spacing.lg,
  },
  searchSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  searchBar: {
    elevation: 0,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  cuisineFilter: {
    marginTop: spacing.md,
  },
  cuisineChip: {
    marginRight: spacing.sm,
  },
  stallsSection: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.gray[900],
    marginBottom: spacing.md,
  },
  stallCard: {
    marginBottom: spacing.md,
    backgroundColor: 'white',
  },
  stallContent: {
    flexDirection: 'row',
  },
  stallImageContainer: {
    marginRight: spacing.md,
  },
  stallImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  stallInfo: {
    flex: 1,
  },
  stallName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  stallDescription: {
    color: theme.colors.gray[600],
    marginBottom: spacing.sm,
  },
  stallMeta: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    color: theme.colors.gray[600],
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    marginTop: spacing.md,
    color: theme.colors.gray[600],
  },
  orderNotice: {
    margin: spacing.lg,
    marginBottom: spacing.xl * 2,
    backgroundColor: theme.colors.primary + '10',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  noticeText: {
    color: theme.colors.gray[700],
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  scanButton: {
    marginTop: spacing.sm,
  },
});