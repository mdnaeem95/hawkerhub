// apps/mobile/src/screens/customer/ScanTableScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@components/ui/Button';
import { theme, spacing } from '@constants/theme';
import { useNavigation } from '@react-navigation/native';

export const ScanTableScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const navigation = useNavigation();

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
      //@ts-ignore
      navigation.navigate('StallList' as never, { 
        hawkerId, 
        tableNumber 
      } as never);
    } else {
      // Show error
      alert('Invalid QR code. Please scan a HawkerHub table QR code.');
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPermission}>
          <Text style={styles.noPermissionText}>
            Camera permission is required to scan QR codes
          </Text>
          <Button onPress={() => Camera.requestCameraPermissionsAsync()}>
            Grant Permission
          </Button>
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
              onPress={() => setScanned(false)}
              variant="secondary"
            >
              Tap to Scan Again
            </Button>
          </View>
        )}
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
  },
  noPermissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.lg,
    color: theme.colors.onSurface,
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
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
  },
});