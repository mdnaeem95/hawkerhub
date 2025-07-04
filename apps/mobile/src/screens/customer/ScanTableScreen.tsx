import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from 'react-native-paper';
import { theme, spacing } from '@/constants/theme';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { CustomerStackParamList } from '@/navigation/CustomerNavigator';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type ScanTableScreenNavigationProp = StackNavigationProp<CustomerStackParamList, 'ScanTable'>;

export const ScanTableScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const navigation = useNavigation<ScanTableScreenNavigationProp>();
  
  // Add this to check if we're in dev mode
  const isDev = __DEV__ || process.env.NODE_ENV !== 'production';

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true);
    
    // Parse QR code format: hawkerhub://table/{hawkerId}/{tableNumber}
    const match = data.match(/hawkerhub:\/\/table\/(.+)\/(.+)/);
    
    if (match) {
      const [, hawkerId, tableNumber] = match;
      
      // Navigate to stall list
      navigation.navigate('StallList', { 
        hawkerId, 
        tableNumber 
      });
    } else {
      // Show error
      Alert.alert(
        'Invalid QR Code',
        'Please scan a valid HawkerHub table QR code.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    }
  };

  // Development bypass function
  const handleDevBypass = () => {
    // Mock hawker center data
    const mockHawkerId = 'dev-hawker-123';
    const mockTableNumber = 'A1';
    
    Alert.alert(
      'Development Mode',
      `Using mock data:\nHawker Center: Lau Pa Sat\nTable: ${mockTableNumber}`,
      [
        {
          text: 'Continue',
          onPress: () => {
            navigation.navigate('StallList', { 
              hawkerId: mockHawkerId, 
              tableNumber: mockTableNumber 
            });
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPermission}>
          <Icon name="camera-off" size={64} color={theme.colors.onSurfaceVariant} />
          <Text style={styles.noPermissionText}>
            Camera permission is required to scan QR codes
          </Text>
          <Button 
            mode="contained"
            onPress={() => Camera.requestCameraPermissionsAsync()}
            style={styles.permissionButton}
          >
            Grant Permission
          </Button>
          
          {/* Dev bypass button when no camera permission */}
          {isDev && (
            <Button 
              mode="outlined"
              onPress={handleDevBypass}
              style={styles.devButton}
              icon="developer-board"
            >
              Skip to Stall List (Dev)
            </Button>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      
      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Table QR</Text>
          <Text style={styles.subtitle}>
            Point your camera at the QR code on your table
          </Text>
        </View>
        
        <View style={styles.scanArea}>
          <View style={styles.corner} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        
        {scanned && (
          <View style={styles.rescanContainer}>
            <Button 
              mode="contained"
              onPress={() => setScanned(false)}
              style={styles.rescanButton}
            >
              Tap to Scan Again
            </Button>
          </View>
        )}
        
        {/* Development bypass button - Always show in development */}
        {isDev && (
          <View style={styles.devContainer}>
            <Button 
              mode="contained"
              onPress={handleDevBypass}
              style={styles.devButton}
              icon="developer-board"
              buttonColor={theme.colors.secondary}
              textColor={theme.colors.onSecondary}
            >
              Skip to Stall List (Dev Mode)
            </Button>
            <Text style={styles.devText}>
              Development only - Remove in production
            </Text>
          </View>
        )}
        
        {/* Temporary button - REMOVE THIS after testing */}
        <View style={[styles.devContainer, { bottom: 150 }]}>
          <Button 
            mode="contained"
            onPress={handleDevBypass}
            style={styles.devButton}
            buttonColor="#FF5722"
          >
            TEMP: Skip Scanner
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  noPermission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: theme.colors.background,
  },
  noPermissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: spacing.lg,
    color: theme.colors.onSurface,
  },
  permissionButton: {
    marginTop: spacing.md,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  scanArea: {
    width: 250,
    height: 250,
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -125,
    marginLeft: -125,
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: 'white',
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  rescanContainer: {
    position: 'absolute',
    bottom: 120,
    left: spacing.lg,
    right: spacing.lg,
  },
  rescanButton: {
    elevation: 4,
  },
  devContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
  },
  devButton: {
    width: '100%',
    marginBottom: spacing.sm,
  },
  devText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
});