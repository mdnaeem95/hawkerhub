// apps/mobile/src/components/ui/Input.tsx
import React, { useState, forwardRef } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  Pressable,
} from 'react-native';
import { theme, spacing } from '@constants/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
}

// ✅ ForwardRef Input component
export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, leftIcon, rightIcon, onRightIconPress, style, ...props }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}

        <View
          style={[
            styles.inputContainer,
            focused && styles.inputFocused,
            error && styles.inputError,
          ]}
        >
          {leftIcon && (
            <Icon
              name={leftIcon}
              size={20}
              color={theme.colors.onSurfaceVariant}
              style={styles.leftIcon}
            />
          )}

          <TextInput
            ref={ref}
            style={[styles.input, leftIcon && styles.inputWithLeftIcon, style]}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />

          {rightIcon && (
            <Pressable onPress={onRightIconPress} style={styles.rightIcon}>
              <Icon name={rightIcon} size={20} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          )}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }
);

// 👇 Name the component for better debugging
Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.onSurface,
    marginBottom: spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.md,
  },
  inputFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: theme.colors.onSurface,
  },
  inputWithLeftIcon: {
    marginLeft: spacing.sm,
  },
  leftIcon: {
    marginRight: spacing.xs,
  },
  rightIcon: {
    marginLeft: spacing.sm,
  },
  error: {
    fontSize: 12,
    color: theme.colors.error,
    marginTop: spacing.xs,
  },
});
