import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { theme } from '@/constants/theme';

export function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text variant="displayLarge" style={styles.logo}>
        🍜
      </Text>
      <Text variant="displayLarge" style={styles.title}>
        HawkerHub
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Your Digital Hawker Experience
      </Text>
      <ActivityIndicator 
        size="large" 
        color="#FFFFFF" 
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
  },
  logo: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  loader: {
    marginTop: 48,
  },
});