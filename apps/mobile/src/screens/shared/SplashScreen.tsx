import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { theme } from '@constants/theme';

export function SplashScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    // Check auth status and navigate accordingly
    setTimeout(() => {
      navigation.navigate('Login' as never);
    }, 2000);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text variant="displayLarge" style={styles.title}>
        HawkerHub
      </Text>
      <Text variant="bodyLarge" style={styles.subtitle}>
        Your Digital Hawker Experience
      </Text>
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
  title: {
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
});