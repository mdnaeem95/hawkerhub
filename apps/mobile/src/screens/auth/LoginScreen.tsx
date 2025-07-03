// apps/mobile/src/screens/auth/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@components/ui/Button';
import { Input } from '@components/ui/Input';
import { Card } from '@components/ui/Card';
import { LanguageSelector } from '@components/shared/LanguageSelector';
import { theme, spacing } from '@constants/theme';
import { useAuthStore } from '@store/authStore';

interface LoginForm {
  phoneNumber: string;
  otp?: string;
}

export const LoginScreen: React.FC = () => {
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  
  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>();

  const sendOtp = async (data: LoginForm) => {
    setLoading(true);
    // API call to send OTP
    setTimeout(() => {
      setOtpSent(true);
      setLoading(false);
    }, 1000);
  };

  const verifyOtp = async (data: LoginForm) => {
    setLoading(true);
    // API call to verify OTP
    setTimeout(() => {
      setAuth('fake-token', 'customer');
      setLoading(false);
    }, 1000);
  };

  const onSubmit = (data: LoginForm) => {
    if (otpSent) {
      verifyOtp(data);
    } else {
      sendOtp(data);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.langSelector}>
              <LanguageSelector />
            </View>
            <Text style={styles.title}>HawkerHub</Text>
            <Text style={styles.subtitle}>
              Your Digital Hawker Experience
            </Text>
          </View>

          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>
              {otpSent ? 'Enter OTP' : 'Login with Phone'}
            </Text>

            <Controller
              control={control}
              name="phoneNumber"
              rules={{
                required: 'Phone number is required',
                pattern: {
                  value: /^[689]\d{7}$/,
                  message: 'Enter a valid Singapore phone number',
                },
              }}
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Phone Number"
                  placeholder="8XXXXXXX"
                  keyboardType="phone-pad"
                  value={value}
                  onChangeText={onChange}
                  error={errors.phoneNumber?.message}
                  leftIcon="phone"
                  editable={!otpSent}
                />
              )}
            />

            {otpSent && (
              <Controller
                control={control}
                name="otp"
                rules={{
                  required: 'OTP is required',
                  minLength: {
                    value: 6,
                    message: 'OTP must be 6 digits',
                  },
                }}
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="OTP"
                    placeholder="Enter 6-digit OTP"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={value}
                    onChangeText={onChange}
                    error={errors.otp?.message}
                    leftIcon="lock"
                  />
                )}
              />
            )}

            <Button
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              fullWidth
            >
              {otpSent ? 'Verify OTP' : 'Send OTP'}
            </Button>

            {otpSent && (
              <Button
                variant="ghost"
                onPress={() => setOtpSent(false)}
                fullWidth
                size="sm"
              >
                Change Phone Number
              </Button>
            )}
          </Card>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Are you a vendor?
            </Text>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => {/* Navigate to vendor login */}}
            >
              Login as Vendor
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xxl,
  },
  langSelector: {
    position: 'absolute',
    top: -spacing.xl,
    right: -spacing.lg,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
  formCard: {
    padding: spacing.xl,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
});