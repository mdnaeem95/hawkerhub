// apps/mobile/src/components/ui/Card.tsx
import React from 'react';
import { 
  View, 
  StyleSheet, 
  ViewStyle,
  Pressable 
} from 'react-native';
import { theme, spacing } from '@constants/theme';

interface CardProps {
  children: React.ReactNode;
  padding?: keyof typeof spacing;
  onPress?: () => void;
  style?: ViewStyle;
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  padding = 'md',
  onPress,
  style,
  elevated = true,
}) => {
  const cardStyles = [
    styles.card,
    elevated && styles.elevated,
    { padding: spacing[padding] },
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={cardStyles}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});