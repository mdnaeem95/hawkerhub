// apps/mobile/src/screens/vendor/POSIntegrationScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  Linking,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  ActivityIndicator,
  Portal,
  Modal,
  TextInput,
  Divider,
  List,
  Switch,
  Chip,
  Surface,
  IconButton,
  ProgressBar,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { theme, spacing } from '@/constants/theme';
import { api } from '@/services/api';
import { format } from 'date-fns';

interface POSSystem {
  id: string;
  name: string;
  description: string;
  logo: string;
  features: string[];
  setupGuide?: string;
}

interface IntegrationStatus {
  connected: boolean;
  type?: string;
  lastSync?: string;
  lastSuccessfulSync?: string;
  menuItems: number;
  todayOrders: number;
  autoSync: boolean;
  syncInterval: number;
}

interface SyncHistory {
  id: string;
  syncType: string;
  status: string;
  itemsSynced?: number;
  errors?: any;
  createdAt: string;
  completedAt?: string;
}

export const POSIntegrationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [posSystems, setPosSystems] = useState<POSSystem[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPOS, setSelectedPOS] = useState<POSSystem | null>(null);
  const [credentials, setCredentials] = useState({
    apiKey: '',
    storeId: '',
    accessToken: '',
    locationId: '',
    fileUrl: '',
    phoneNumber: '',
  });
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);

  useEffect(() => {
    fetchPOSSystems();
    fetchIntegrationStatus();
  }, []);

  const fetchPOSSystems = async () => {
    try {
      const response = await api.get('/integrations/pos/available');
      if (response.data.success) {
        setPosSystems(response.data.systems);
      }
    } catch (error) {
      console.error('Error fetching POS systems:', error);
    }
  };

  const fetchIntegrationStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/integrations/pos/status');
      if (response.data.success) {
        setIntegrationStatus(response.data.integration);
      }
    } catch (error) {
      console.error('Error fetching integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncHistory = async () => {
    try {
      const response = await api.get('/integrations/pos/sync-history');
      if (response.data.success) {
        setSyncHistory(response.data.syncHistory);
      }
    } catch (error) {
      console.error('Error fetching sync history:', error);
    }
  };

  const testConnection = async () => {
    if (!selectedPOS) return;

    try {
      setConnecting(true);
      
      let testCredentials: any = {};
      
      switch (selectedPOS.id) {
        case 'storehub':
          testCredentials = {
            apiKey: credentials.apiKey,
            storeId: credentials.storeId,
          };
          break;
        case 'square':
          testCredentials = {
            accessToken: credentials.accessToken,
            locationId: credentials.locationId,
            environment: 'production',
          };
          break;
        case 'spreadsheet':
          testCredentials = {
            fileUrl: credentials.fileUrl,
            phoneNumber: credentials.phoneNumber,
          };
          break;
      }

      const response = await api.post('/integrations/pos/test', {
        type: selectedPOS.id,
        credentials: testCredentials,
      });

      if (response.data.success) {
        Alert.alert(
          'Connection Successful',
          `Found ${response.data.menuItemsFound} menu items. Would you like to connect this POS system?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Connect', onPress: connectPOS },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Connection Failed',
        error.response?.data?.message || 'Could not connect to POS system',
        [{ text: 'OK' }]
      );
    } finally {
      setConnecting(false);
    }
  };

  const connectPOS = async () => {
    if (!selectedPOS) return;

    try {
      setConnecting(true);
      
      let connectCredentials: any = {};
      
      switch (selectedPOS.id) {
        case 'storehub':
          connectCredentials = {
            apiKey: credentials.apiKey,
            storeId: credentials.storeId,
          };
          break;
        case 'square':
          connectCredentials = {
            accessToken: credentials.accessToken,
            locationId: credentials.locationId,
            environment: 'production',
          };
          break;
        case 'spreadsheet':
          connectCredentials = {
            fileUrl: credentials.fileUrl,
            phoneNumber: credentials.phoneNumber,
          };
          break;
        case 'none':
          // No credentials needed for manual entry
          break;
      }

      const response = await api.post('/integrations/pos/connect', {
        type: selectedPOS.id,
        credentials: selectedPOS.id === 'none' ? undefined : connectCredentials,
      });

      if (response.data.success) {
        Alert.alert(
          'Success',
          response.data.message,
          [{ text: 'OK' }]
        );
        setShowConnectModal(false);
        setSelectedPOS(null);
        resetCredentials();
        await fetchIntegrationStatus();
      }
    } catch (error: any) {
      Alert.alert(
        'Connection Failed',
        error.response?.data?.message || 'Failed to connect POS system',
        [{ text: 'OK' }]
      );
    } finally {
      setConnecting(false);
    }
  };

  const disconnectPOS = () => {
    Alert.alert(
      'Disconnect POS',
      'Are you sure you want to disconnect your POS system? Your menu items will remain but won\'t be synced anymore.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete('/integrations/pos/disconnect');
              if (response.data.success) {
                Alert.alert('Success', 'POS system disconnected');
                await fetchIntegrationStatus();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to disconnect POS system');
            }
          },
        },
      ]
    );
  };

  const syncNow = async () => {
    try {
      setSyncing(true);
      const response = await api.post('/integrations/pos/sync');
      
      if (response.data.success) {
        Alert.alert(
          'Sync Complete',
          `Successfully synced ${response.data.itemsSynced} menu items`,
          [{ text: 'OK' }]
        );
        await fetchIntegrationStatus();
      }
    } catch (error: any) {
      Alert.alert(
        'Sync Failed',
        error.response?.data?.message || 'Failed to sync menu',
        [{ text: 'OK' }]
      );
    } finally {
      setSyncing(false);
    }
  };

  const resetCredentials = () => {
    setCredentials({
      apiKey: '',
      storeId: '',
      accessToken: '',
      locationId: '',
      fileUrl: '',
      phoneNumber: '',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return theme.colors.success;
      case 'failed': return theme.colors.error;
      case 'partial': return theme.colors.warning;
      default: return theme.colors.gray[500];
    }
  };

  const renderConnectedView = () => {
    if (!integrationStatus || !integrationStatus.connected) return null;

    const connectedSystem = posSystems.find(pos => pos.id === integrationStatus.type);

    return (
      <Card style={styles.statusCard}>
        <Card.Content>
          <View style={styles.connectedHeader}>
            <View style={styles.connectedInfo}>
              <Text style={styles.connectedTitle}>Connected to</Text>
              <Text style={styles.connectedName}>{connectedSystem?.name || integrationStatus.type}</Text>
            </View>
            <IconButton
              icon="cog"
              size={24}
              onPress={() => setShowConnectModal(true)}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Sync Status */}
          <View style={styles.syncStatus}>
            <View style={styles.statusRow}>
              <Icon name="cloud-sync" size={20} color={theme.colors.primary} />
              <Text style={styles.statusLabel}>Auto-sync</Text>
              <Text style={styles.statusValue}>
                {integrationStatus.autoSync ? 'Enabled' : 'Disabled'}
              </Text>
            </View>

            {integrationStatus.lastSync && (
              <View style={styles.statusRow}>
                <Icon name="clock-outline" size={20} color={theme.colors.gray[600]} />
                <Text style={styles.statusLabel}>Last sync</Text>
                <Text style={styles.statusValue}>
                  {format(new Date(integrationStatus.lastSync), 'dd MMM, h:mm a')}
                </Text>
              </View>
            )}

            <View style={styles.statusRow}>
              <Icon name="food" size={20} color={theme.colors.gray[600]} />
              <Text style={styles.statusLabel}>Menu items</Text>
              <Text style={styles.statusValue}>{integrationStatus.menuItems}</Text>
            </View>

            <View style={styles.statusRow}>
              <Icon name="receipt" size={20} color={theme.colors.gray[600]} />
              <Text style={styles.statusLabel}>Today's orders</Text>
              <Text style={styles.statusValue}>{integrationStatus.todayOrders}</Text>
            </View>
          </View>

          <View style={styles.connectedActions}>
            <Button
              mode="outlined"
              onPress={syncNow}
              loading={syncing}
              disabled={syncing}
              icon="sync"
              style={styles.actionButton}
            >
              Sync Now
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                fetchSyncHistory();
                setShowHistoryModal(true);
              }}
              icon="history"
              style={styles.actionButton}
            >
              History
            </Button>
          </View>

          <Button
            mode="text"
            onPress={disconnectPOS}
            textColor={theme.colors.error}
            style={styles.disconnectButton}
          >
            Disconnect POS
          </Button>
        </Card.Content>
      </Card>
    );
  };

  const renderPOSOption = (pos: POSSystem) => (
    <Card
      key={pos.id}
      style={styles.posCard}
      onPress={() => {
        setSelectedPOS(pos);
        setShowConnectModal(true);
      }}
    >
      <Card.Content style={styles.posContent}>
        <View style={styles.posLogo}>
          {pos.logo.startsWith('/') ? (
            <Icon name="store" size={40} color={theme.colors.primary} />
          ) : (
            <Image source={{ uri: pos.logo }} style={styles.posLogoImage} />
          )}
        </View>
        <View style={styles.posInfo}>
          <Text style={styles.posName}>{pos.name}</Text>
          <Text style={styles.posDescription}>{pos.description}</Text>
          <View style={styles.posFeatures}>
            {pos.features.slice(0, 2).map((feature, index) => (
              <Chip key={index} compact style={styles.featureChip}>
                {feature}
              </Chip>
            ))}
          </View>
        </View>
        <Icon name="chevron-right" size={24} color={theme.colors.gray[400]} />
      </Card.Content>
    </Card>
  );

  const renderConnectionModal = () => {
    if (!selectedPOS) return null;

    return (
      <Modal
        visible={showConnectModal}
        onDismiss={() => {
          setShowConnectModal(false);
          setSelectedPOS(null);
          resetCredentials();
        }}
        contentContainerStyle={styles.modalContent}
      >
        <ScrollView>
          <Text style={styles.modalTitle}>
            {integrationStatus?.connected ? 'POS Settings' : `Connect ${selectedPOS.name}`}
          </Text>

          {!integrationStatus?.connected && (
            <>
              {selectedPOS.id === 'storehub' && (
                <>
                  <TextInput
                    mode="outlined"
                    label="API Key"
                    value={credentials.apiKey}
                    onChangeText={(text) => setCredentials(prev => ({ ...prev, apiKey: text }))}
                    style={styles.input}
                    placeholder="Your StoreHub API key"
                  />
                  <TextInput
                    mode="outlined"
                    label="Store ID"
                    value={credentials.storeId}
                    onChangeText={(text) => setCredentials(prev => ({ ...prev, storeId: text }))}
                    style={styles.input}
                    placeholder="Your StoreHub store ID"
                  />
                </>
              )}

              {selectedPOS.id === 'square' && (
                <>
                  <TextInput
                    mode="outlined"
                    label="Access Token"
                    value={credentials.accessToken}
                    onChangeText={(text) => setCredentials(prev => ({ ...prev, accessToken: text }))}
                    style={styles.input}
                    placeholder="Your Square access token"
                    secureTextEntry
                  />
                  <TextInput
                    mode="outlined"
                    label="Location ID"
                    value={credentials.locationId}
                    onChangeText={(text) => setCredentials(prev => ({ ...prev, locationId: text }))}
                    style={styles.input}
                    placeholder="Your Square location ID"
                  />
                </>
              )}

              {selectedPOS.id === 'spreadsheet' && (
                <>
                  <TextInput
                    mode="outlined"
                    label="Spreadsheet URL"
                    value={credentials.fileUrl}
                    onChangeText={(text) => setCredentials(prev => ({ ...prev, fileUrl: text }))}
                    style={styles.input}
                    placeholder="Google Sheets or Excel online URL"
                  />
                  <TextInput
                    mode="outlined"
                    label="WhatsApp Number"
                    value={credentials.phoneNumber}
                    onChangeText={(text) => setCredentials(prev => ({ ...prev, phoneNumber: text }))}
                    style={styles.input}
                    placeholder="Your WhatsApp number (for orders)"
                    keyboardType="phone-pad"
                  />
                </>
              )}

              {selectedPOS.setupGuide && (
                <Button
                  mode="text"
                  onPress={() => Linking.openURL(selectedPOS.setupGuide!)}
                  icon="help-circle"
                  style={styles.helpButton}
                >
                  Setup Guide
                </Button>
              )}
            </>
          )}

          {integrationStatus?.connected && (
            <View style={styles.settingsContainer}>
              <List.Item
                title="Auto-sync"
                description="Automatically sync menu every 30 minutes"
                left={props => <List.Icon {...props} icon="sync" />}
                right={() => (
                  <Switch
                    value={integrationStatus.autoSync}
                    disabled
                  />
                )}
              />
              <Divider />
              <List.Item
                title="Sync interval"
                description="30 minutes"
                left={props => <List.Icon {...props} icon="timer" />}
              />
            </View>
          )}

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setShowConnectModal(false);
                setSelectedPOS(null);
                resetCredentials();
              }}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            {!integrationStatus?.connected && selectedPOS.id !== 'none' && (
              <Button
                mode="contained"
                onPress={testConnection}
                loading={connecting}
                disabled={connecting}
                style={styles.modalButton}
              >
                Test Connection
              </Button>
            )}
            {selectedPOS.id === 'none' && (
              <Button
                mode="contained"
                onPress={connectPOS}
                loading={connecting}
                disabled={connecting}
                style={styles.modalButton}
              >
                Use Manual Entry
              </Button>
            )}
          </View>
        </ScrollView>
      </Modal>
    );
  };

  const renderSyncHistoryModal = () => (
    <Modal
      visible={showHistoryModal}
      onDismiss={() => setShowHistoryModal(false)}
      contentContainerStyle={[styles.modalContent, styles.historyModal]}
    >
      <Text style={styles.modalTitle}>Sync History</Text>
      <ScrollView style={styles.historyList}>
        {syncHistory.length === 0 ? (
          <Text style={styles.emptyText}>No sync history available</Text>
        ) : (
          syncHistory.map((sync) => (
            <Surface key={sync.id} style={styles.historyItem} elevation={1}>
              <View style={styles.historyHeader}>
                <Icon
                  name={sync.status === 'success' ? 'check-circle' : 'alert-circle'}
                  size={20}
                  color={getStatusColor(sync.status)}
                />
                <Text style={styles.historyDate}>
                  {format(new Date(sync.createdAt), 'dd MMM, h:mm a')}
                </Text>
              </View>
              <Text style={styles.historyType}>
                {sync.syncType === 'menu' ? 'Menu Sync' : sync.syncType}
              </Text>
              {sync.itemsSynced !== undefined && (
                <Text style={styles.historyItems}>
                  {sync.itemsSynced} items synced
                </Text>
              )}
              {sync.errors && (
                <Text style={styles.historyError}>
                  Error: {sync.errors.message || 'Unknown error'}
                </Text>
              )}
            </Surface>
          ))
        )}
      </ScrollView>
      <Button
        mode="contained"
        onPress={() => setShowHistoryModal(false)}
        style={styles.closeButton}
      >
        Close
      </Button>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading integration status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>POS Integration</Text>
          <Text style={styles.subtitle}>
            Connect your POS system to automatically sync your menu and receive orders
          </Text>
        </View>

        {integrationStatus?.connected ? (
          renderConnectedView()
        ) : (
          <>
            <Text style={styles.sectionTitle}>Choose a POS System</Text>
            {posSystems.map(renderPOSOption)}
          </>
        )}

        {/* Benefits Section */}
        <Card style={styles.benefitsCard}>
          <Card.Content>
            <Text style={styles.benefitsTitle}>Why Connect Your POS?</Text>
            <View style={styles.benefitItem}>
              <Icon name="sync" size={20} color={theme.colors.primary} />
              <Text style={styles.benefitText}>
                Automatic menu synchronization
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Icon name="receipt" size={20} color={theme.colors.primary} />
              <Text style={styles.benefitText}>
                Orders sent directly to your POS
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Icon name="chart-line" size={20} color={theme.colors.primary} />
              <Text style={styles.benefitText}>
                Unified analytics and reporting
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Icon name="alert-octagon" size={20} color={theme.colors.primary} />
              <Text style={styles.benefitText}>
                Real-time inventory updates
              </Text>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        {renderConnectionModal()}
        {renderSyncHistoryModal()}
      </Portal>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.gray[600],
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.gray[900],
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statusCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  connectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectedInfo: {
    flex: 1,
  },
  connectedTitle: {
    fontSize: 14,
    color: theme.colors.gray[600],
  },
  connectedName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.gray[900],
    marginTop: spacing.xs,
  },
  divider: {
    marginVertical: spacing.md,
  },
  syncStatus: {
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusLabel: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 14,
    color: theme.colors.gray[700],
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.gray[900],
  },
  connectedActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  disconnectButton: {
    marginTop: spacing.md,
  },
  posCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  posContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  posLogo: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
    borderRadius: 12,
    marginRight: spacing.md,
  },
  posLogoImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  posInfo: {
    flex: 1,
  },
  posName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray[900],
  },
  posDescription: {
    fontSize: 14,
    color: theme.colors.gray[600],
    marginTop: spacing.xs,
  },
  posFeatures: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  featureChip: {
    height: 24,
    backgroundColor: theme.colors.primary + '10',
  },
  benefitsCard: {
    margin: spacing.lg,
    marginBottom: spacing.xl * 2,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.gray[900],
    marginBottom: spacing.md,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  benefitText: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: 14,
    color: theme.colors.gray[700],
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.gray[900],
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.md,
  },
  helpButton: {
    marginTop: spacing.sm,
  },
  settingsContainer: {
    marginVertical: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
  historyModal: {
    maxHeight: '70%',
  },
  historyList: {
    maxHeight: 400,
    marginBottom: spacing.md,
  },
  historyItem: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  historyDate: {
    marginLeft: spacing.sm,
    fontSize: 14,
    color: theme.colors.gray[700],
  },
  historyType: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.gray[900],
  },
  historyItems: {
    fontSize: 12,
    color: theme.colors.gray[600],
    marginTop: spacing.xs,
  },
  historyError: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: spacing.xs,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.gray[500],
    paddingVertical: spacing.xl,
  },
  closeButton: {
    marginTop: spacing.md,
  },
});