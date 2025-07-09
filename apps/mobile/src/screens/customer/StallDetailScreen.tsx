// apps/mobile/src/screens/customer/StallDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  SectionList,
  Pressable,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  Surface,
  Button,
  Divider,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';

type StallDetailRouteProp = RouteProp<{
  StallDetail: { stallId: string; fromDirectory?: boolean };
}, 'StallDetail'>;

interface MenuItem {
  id: string;
  name: string;
  nameZh?: string;
  nameMy?: string;
  nameTa?: string;
  description?: string;
  price: number;
  imageUrl?: string;
}

interface StallDetail {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  phoneNumber: string;
  hawker: {
    id: string;
    name: string;
    address: string;
  };
  menuByCategory: Record<string, MenuItem[]>;
}

export const StallDetailScreen: React.FC = () => {
  const route = useRoute<StallDetailRouteProp>();
  const navigation = useNavigation<any>();
  const { stallId, fromDirectory } = route.params;
  
  const [stall, setStall] = useState<StallDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchStallDetails();
  }, [stallId]);

  const fetchStallDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/directory/stalls/${stallId}`);
      
      if (response.data.success) {
        setStall(response.data.stall);
        // Set first category as selected
        const categories = Object.keys(response.data.stall.menuByCategory);
        if (categories.length > 0) {
          setSelectedCategory(categories[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching stall details:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMenuItem = (item: MenuItem) => (
    <Card key={item.id} style={styles.menuCard}>
      <Card.Content style={styles.menuContent}>
        <View style={styles.menuInfo}>
          <Text variant="titleMedium" style={styles.menuName}>
            {item.name}
          </Text>
          {item.nameZh && (
            <Text variant="bodySmall" style={styles.menuNameAlt}>
              {item.nameZh}
            </Text>
          )}
          {item.description && (
            <Text variant="bodySmall" style={styles.menuDescription}>
              {item.description}
            </Text>
          )}
          <Text variant="titleMedium" style={styles.menuPrice}>
            ${item.price.toFixed(2)}
          </Text>
        </View>
        {item.imageUrl && (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.menuImage}
          />
        )}
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

  if (!stall) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>Failed to load stall details</Text>
        </View>
      </SafeAreaView>
    );
  }

  const categories = Object.keys(stall.menuByCategory);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={24} color={theme.colors.gray[900]} />
          </Pressable>
          
          {stall.imageUrl && (
            <Image 
              source={{ uri: stall.imageUrl }} 
              style={styles.headerImage}
            />
          )}
          
          <View style={styles.stallInfo}>
            <Text style={styles.stallName}>{stall.name}</Text>
            {stall.description && (
              <Text style={styles.stallDescription}>{stall.description}</Text>
            )}
            <View style={styles.locationInfo}>
              <Icon name="map-marker" size={16} color={theme.colors.gray[600]} />
              <Text style={styles.locationText}>
                {stall.hawker.name} • {stall.hawker.address}
              </Text>
            </View>
            <View style={styles.contactInfo}>
              <Icon name="phone" size={16} color={theme.colors.gray[600]} />
              <Text style={styles.contactText}>{stall.phoneNumber}</Text>
            </View>
          </View>
        </View>

        {/* View Only Notice */}
        <Surface style={styles.viewOnlyNotice} elevation={1}>
          <Icon name="information" size={20} color={theme.colors.info} />
          <Text style={styles.viewOnlyText}>
            You're viewing the menu. To order, please visit the location and scan the table QR code.
          </Text>
        </Surface>

        {/* Category Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabs}
        >
          {categories.map((category) => (
            <Chip
              key={category}
              selected={selectedCategory === category}
              onPress={() => setSelectedCategory(category)}
              style={styles.categoryChip}
              mode="flat"
            >
              {category} ({stall.menuByCategory[category].length})
            </Chip>
          ))}
        </ScrollView>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {selectedCategory && stall.menuByCategory[selectedCategory] && (
            <>
              <Text style={styles.categoryTitle}>{selectedCategory}</Text>
              {stall.menuByCategory[selectedCategory].map(renderMenuItem)}
            </>
          )}
        </View>

        {/* Order CTA */}
        <Card style={styles.orderCta}>
          <Card.Content>
            <View style={styles.ctaHeader}>
              <Icon name="food" size={24} color={theme.colors.primary} />
              <Text style={styles.ctaTitle}>Hungry?</Text>
            </View>
            <Text style={styles.ctaText}>
              Visit {stall.hawker.name} to enjoy {stall.name}'s delicious food!
            </Text>
            <Button
              mode="contained"
              onPress={() => {
                navigation.navigate('HawkerDetail', { 
                  hawkerId: stall.hawker.id 
                });
              }}
              style={styles.ctaButton}
              icon="map-marker"
            >
              View Location
            </Button>
            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Order')}
              style={styles.scanButton}
              icon="qrcode-scan"
            >
              I'm Here - Scan to Order
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
  header: {
    backgroundColor: 'white',
    paddingBottom: spacing.lg,
  },
  backButton: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerImage: {
    width: '100%',
    height: 200,
  },
  stallInfo: {
    padding: spacing.lg,
  },
  stallName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
    marginBottom: spacing.sm,
  },
  stallDescription: {
    fontSize: 16,
    color: theme.colors.gray[600],
    marginBottom: spacing.md,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.gray[600],
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactText: {
    fontSize: 14,
    color: theme.colors.gray[600],
  },
  viewOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.lg,
    padding: spacing.md,
    backgroundColor: theme.colors.info + '10',
    borderRadius: 8,
  },
  viewOnlyText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.info,
    lineHeight: 20,
  },
  categoryTabs: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: 'white',
  },
  categoryChip: {
    marginRight: spacing.sm,
  },
  menuSection: {
    padding: spacing.lg,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.gray[900],
    marginBottom: spacing.md,
  },
  menuCard: {
    marginBottom: spacing.md,
    backgroundColor: 'white',
  },
  menuContent: {
    flexDirection: 'row',
  },
  menuInfo: {
    flex: 1,
  },
  menuName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  menuNameAlt: {
    color: theme.colors.gray[600],
    marginBottom: spacing.xs,
  },
  menuDescription: {
    color: theme.colors.gray[600],
    marginBottom: spacing.sm,
  },
  menuPrice: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  menuImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginLeft: spacing.md,
  },
  orderCta: {
    margin: spacing.lg,
    marginBottom: spacing.xl * 2,
    backgroundColor: theme.colors.primary + '10',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  ctaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  ctaText: {
    fontSize: 16,
    color: theme.colors.gray[700],
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  ctaButton: {
    marginBottom: spacing.sm,
  },
  scanButton: {
    borderColor: theme.colors.primary,
  },
});