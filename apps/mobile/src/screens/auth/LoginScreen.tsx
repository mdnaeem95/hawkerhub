import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { theme, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/auth.api';
import { TextInput } from 'react-native-paper';

interface LoginForm {
  phoneNumber: string;
  otp: string;
}

export const LoginScreen: React.FC = () => {
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [userType, setUserType] = useState<'customer' | 'vendor'>('customer');

  const { setAuth } = useAuthStore();
  const otpInputRef = useRef<any>(null);
  
  const { control, handleSubmit, formState: { errors }, watch, reset } = useForm<LoginForm>({
    defaultValues: {
      phoneNumber: '',
      otp: ''
    }
  });

  const phoneNumber = watch('phoneNumber');

  // Resend timer effect
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const sendOtp = async (data: LoginForm) => {
    try {
      setLoading(true);
      const response = await authApi.sendOTP(data.phoneNumber, userType);
      
      if (response.data.success) {
        setOtpSent(true);
        setResendTimer(60); // 60 seconds cooldown
        
        // Focus OTP input
        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 100);
        
        Alert.alert(
          'OTP Sent',
          'Please check your SMS for the verification code.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.log('Send OTP error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to send OTP. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (data: LoginForm) => {
    try {
      setLoading(true);
      const response = await authApi.verifyOTP(
        data.phoneNumber,
        data.otp,
        userType
      );
      
      if (response.data.success) {
        const { token, user } = response.data;
        setAuth(token, user);
      }
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.response?.data?.message || 'Invalid OTP. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (data: LoginForm) => {
    if (otpSent) {
      verifyOtp(data);
    } else {
      sendOtp(data);
    }
  };

  const handleResendOTP = () => {
    if (resendTimer === 0 && phoneNumber) {
      sendOtp({ phoneNumber, otp: '' });
    }
  };

  const handleChangePhone = () => {
    setOtpSent(false);
    reset({ phoneNumber: '', otp: '' });
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
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.langSelector}>
              <LanguageSelector />
            </View>
            <Text style={styles.logo}>🍜</Text>
            <Text style={styles.title}>HawkerHub</Text>
            <Text style={styles.subtitle}>
              Your Digital Hawker Experience
            </Text>
          </View>

          {/* User Type Toggle */}
          <View style={styles.userTypeContainer}>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'customer' && styles.userTypeButtonActive
              ]}
              onPress={() => setUserType('customer')}
            >
              <Text style={[
                styles.userTypeText,
                userType === 'customer' && styles.userTypeTextActive
              ]}>
                Customer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === 'vendor' && styles.userTypeButtonActive
              ]}
              onPress={() => setUserType('vendor')}
            >
              <Text style={[
                styles.userTypeText,
                userType === 'vendor' && styles.userTypeTextActive
              ]}>
                Vendor
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Form */}
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>
              {otpSent ? 'Enter Verification Code' : 'Login with Phone'}
            </Text>
            <Text style={styles.formSubtitle}>
              {otpSent 
                ? `We've sent a 6-digit code to +65${phoneNumber}`
                : 'Enter your Singapore mobile number'
              }
            </Text>

            {/* Phone Number Input */}
            <Controller
              control={control}
              name="phoneNumber"
              rules={{
                required: 'Phone number is required',
                pattern: {
                  value: /^[689]\d{7}$/,
                  message: 'Enter a valid 8-digit Singapore number',
                },
              }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.phoneInputContainer}>
                  <Text style={styles.countryCode}>+65</Text>
                  <TextInput
                    placeholder="8XXX XXXX"
                    keyboardType="phone-pad"
                    maxLength={8}
                    value={value}
                    onChangeText={onChange}
                    error={!!errors.phoneNumber?.message}
                    editable={true}
                    style={styles.phoneInput}
                  />
                </View>
              )}
            />

            {/* OTP Input */}
            {otpSent && (
              <>
                <Controller
                  control={control}
                  name="otp"
                  rules={{
                    required: 'OTP is required',
                    pattern: {
                      value: /^\d{6}$/,
                      message: 'OTP must be 6 digits',
                    },
                  }}
                  render={({ field: { onChange, value } }) => (
                    <Input
                      ref={otpInputRef}
                      label="Verification Code"
                      placeholder="000000"
                      keyboardType="number-pad"
                      maxLength={6}
                      value={value}
                      onChangeText={onChange}
                      error={errors.otp?.message}
                      style={styles.otpInput}
                    />
                  )}
                />

                {/* Resend OTP */}
                <View style={styles.resendContainer}>
                  <Text style={styles.resendText}>
                    Didn't receive the code?{' '}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResendOTP}
                    disabled={resendTimer > 0}
                  >
                    <Text style={[
                      styles.resendLink,
                      resendTimer > 0 && styles.resendLinkDisabled
                    ]}>
                      {resendTimer > 0 
                        ? `Resend in ${resendTimer}s` 
                        : 'Resend OTP'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Submit Button */}
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            >
              {otpSent ? 'Verify & Login' : 'Send OTP'}
            </Button>

            {/* Change Phone Number */}
            {otpSent && (
              <Button
                variant="ghost"
                onPress={handleChangePhone}
                size="sm"
                style={styles.changePhoneButton}
              >
                Change Phone Number
              </Button>
            )}
          </Card>

          {/* Terms */}
          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
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
    paddingBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  langSelector: {
    position: 'absolute',
    top: -spacing.md,
    right: -spacing.lg,
  },
  logo: {
    fontSize: 64,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.displayMedium,
    color: theme.colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  userTypeContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: theme.roundness * 4,
    padding: spacing.xs,
    marginBottom: spacing.xl,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: theme.roundness * 2,
    alignItems: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userTypeText: {
    ...typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
  },
  userTypeTextActive: {
    color: theme.colors.primary,
  },
  formCard: {
    padding: spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness * 2,
  },
  formTitle: {
    ...typography.displaySmall,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    ...typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  countryCode: {
    ...typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
    marginRight: spacing.sm,
  },
  phoneInput: {
    flex: 1,
  },
  otpInput: {
    ...typography.displaySmall,
    textAlign: 'center',
    letterSpacing: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  resendText: {
    ...typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  resendLink: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  resendLinkDisabled: {
    color: theme.colors.gray[400],
  },
  submitButton: {
    marginTop: spacing.md,
  },
  changePhoneButton: {
    marginTop: spacing.sm,
  },
  terms: {
    ...typography.bodySmall,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  termsLink: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
});