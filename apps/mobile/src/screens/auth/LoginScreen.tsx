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
import { Card } from '@/components/ui/Card';
import { theme, spacing, typography } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/services/auth.api';
import { SegmentedButtons, TextInput } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface LoginForm {
  phoneNumber: string;
  otp: string;
  name: string;
}

export const LoginScreen: React.FC = () => {
  const [step, setStep] = useState<'phone' | 'register' | 'otp'>('phone');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [userType, setUserType] = useState<'customer' | 'vendor'>('customer');
  const [isNewUser, setIsNewUser] = useState(false);

  const { setAuth } = useAuthStore();
  const otpInputRef = useRef<any>(null);
  
  const { control, handleSubmit, formState: { errors }, watch, reset, setValue } = useForm<LoginForm>({
    defaultValues: {
      phoneNumber: '',
      otp: '',
      name: '',
    }
  });

  const phoneNumber = watch('phoneNumber');
  const name = watch('name');

  // Resend timer effect
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const checkPhoneAndSendOTP = async (data: LoginForm) => {
    try {
      setLoading(true);
      
      // Check if phone exists
      const checkResponse = await authApi.checkPhone(data.phoneNumber, userType);
      
      if (userType === 'vendor' && !checkResponse.data.exists) {
        Alert.alert(
          'Vendor Not Found',
          'This phone number is not registered as a vendor. Please contact support to register your stall.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Send OTP
      const response = await authApi.sendOTP(data.phoneNumber, userType);
      
      if (response.data.success) {
        setIsNewUser(response.data.isNewUser);
        
        if (userType === 'customer' && response.data.isNewUser) {
          // New customer - show registration
          setStep('register');
        } else {
          // Existing user - go to OTP
          setStep('otp');
          setOtpSent(true);
          setResendTimer(60);
          
          Alert.alert(
            'OTP Sent',
            'Please check your SMS for the verification code.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to send OTP. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const continueToOTP = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    
    setStep('otp');
    setOtpSent(true);
    setResendTimer(60);
    
    Alert.alert(
      'OTP Sent',
      'Please check your SMS for the verification code.',
      [{ text: 'OK' }]
    );
  };

  const verifyOtp = async (data: LoginForm) => {
    try {
      setLoading(true);
      const response = await authApi.verifyOTP(
        data.phoneNumber,
        data.otp,
        userType,
        isNewUser ? data.name : undefined
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

  const resendOTP = async () => {
    try {
      setLoading(true);
      const response = await authApi.sendOTP(phoneNumber, userType);
      if (response.data.success) {
        setResendTimer(60);
        Alert.alert('Success', 'OTP has been resent.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  }; 

  const renderPhoneStep = () => (
    <>
      <View style={styles.logoContainer}>
        <Icon name="food" size={80} color={theme.colors.primary} />
        <Text style={styles.appName}>HawkerHub</Text>
        <Text style={styles.tagline}>
          {userType === 'customer' 
            ? 'Order from your favorite hawker stalls' 
            : 'Manage your stall efficiently'}
        </Text>
      </View>

      <Card style={styles.card}>
        <SegmentedButtons
          value={userType}
          onValueChange={(value) => setUserType(value as 'customer' | 'vendor')}
          buttons={[
            { value: 'customer', label: 'Customer', icon: 'account' },
            { value: 'vendor', label: 'Vendor', icon: 'store' }
          ]}
          style={styles.segmentedButtons}
        />

        <View style={styles.phoneInputContainer}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>+65</Text>
          </View>
          <Controller
            control={control}
            name="phoneNumber"
            rules={{
              required: 'Phone number is required',
              pattern: {
                value: /^[689]\d{7}$/,
                message: 'Invalid Singapore phone number'
              }
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                mode="outlined"
                placeholder="8123 4567"
                value={value}
                onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
                keyboardType="phone-pad"
                maxLength={8}
                error={!!errors.phoneNumber}
                style={[styles.phoneInput, styles.paperInput]}
                outlineColor={theme.colors.gray[300]}
                activeOutlineColor={theme.colors.primary}
                left={<TextInput.Icon icon="phone" />}
              />
            )}
          />
        </View>

        {userType === 'vendor' && (
          <View style={styles.infoBox}>
            <Icon name="information" size={20} color={theme.colors.primary} />
            <Text style={styles.infoText}>
              Vendor accounts must be pre-registered. Contact support if you're a new vendor.
            </Text>
          </View>
        )}

        <Button
          onPress={handleSubmit(checkPhoneAndSendOTP)}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Continue
        </Button>
      </Card>
    </>
  );

  const renderRegisterStep = () => (
    <>
      <View style={styles.logoContainer}>
        <Icon name="account-plus" size={80} color={theme.colors.primary} />
        <Text style={styles.title}>Welcome to HawkerHub!</Text>
        <Text style={styles.subtitle}>Let's create your account</Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.phoneDisplay}>
          <Icon name="phone" size={20} color={theme.colors.gray[600]} />
          <Text style={styles.phoneDisplayText}>+65 {phoneNumber}</Text>
        </View>

        <Controller
          control={control}
          name="name"
          rules={{ required: 'Name is required' }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              mode="outlined"
              label="Your Name"
              placeholder="Enter your name"
              value={value}
              onChangeText={onChange}
              error={!!errors.name}
              style={[styles.input, styles.paperInput]}
              outlineColor={theme.colors.gray[300]}
              activeOutlineColor={theme.colors.primary}
              left={<TextInput.Icon icon="account" />}
            />
          )}
        />

        <Button
          onPress={continueToOTP}
          loading={loading}
          disabled={loading || !name.trim()}
          style={styles.button}
        >
          Continue
        </Button>

        <TouchableOpacity
          onPress={() => {
            setStep('phone');
            setValue('name', '');
          }}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>← Back to phone number</Text>
        </TouchableOpacity>
      </Card>
    </>
  );

  const renderOTPStep = () => (
    <>
      <View style={styles.logoContainer}>
        <Icon name="shield-check" size={80} color={theme.colors.primary} />
        <Text style={styles.title}>Verify Your Number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}+65 {phoneNumber}
        </Text>
      </View>

      <Card style={styles.card}>
        <Controller
          control={control}
          name="otp"
          rules={{
            required: 'OTP is required',
            pattern: {
              value: /^\d{6}$/,
              message: 'OTP must be 6 digits'
            }
          }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              ref={otpInputRef}
              mode="outlined"
              label="Enter OTP"
              placeholder="123456"
              value={value}
              onChangeText={(text) => onChange(text.replace(/\D/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              error={!!errors.otp}
              style={[styles.otpInput, styles.paperInput]}
              outlineColor={theme.colors.gray[300]}
              activeOutlineColor={theme.colors.primary}
            />
          )}
        />

        <Button
          onPress={handleSubmit(verifyOtp)}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Verify & {isNewUser ? 'Create Account' : 'Login'}
        </Button>

        <View style={styles.resendContainer}>
          {resendTimer > 0 ? (
            <Text style={styles.resendTimerText}>
              Resend OTP in {resendTimer}s
            </Text>
          ) : (
            <TouchableOpacity onPress={resendOTP} disabled={loading}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => {
            setStep('phone');
            setOtpSent(false);
            setValue('otp', '');
            setValue('name', '');
          }}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>← Change phone number</Text>
        </TouchableOpacity>
      </Card>
    </>
  );

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
          {step === 'phone' && renderPhoneStep()}
          {step === 'register' && renderRegisterStep()}
          {step === 'otp' && renderOTPStep()}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
              <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>
            </Text>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl * 1.5,
    marginTop: spacing.xl,
  },
  appName: {
    ...typography.displayLarge,
    color: theme.colors.primary,
    marginTop: spacing.md,
    letterSpacing: -0.5,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  tagline: {
    ...typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.displayMedium,
    color: theme.colors.onSurface,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: theme.colors.onSurfaceVariant,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  segmentedButtons: {
    marginBottom: spacing.lg,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  countryCode: {
    backgroundColor: theme.colors.surfaceVariant,
    paddingHorizontal: spacing.md,
    paddingVertical: 18,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
    marginRight: spacing.sm,
  },
  countryCodeText: {
    ...typography.bodyLarge,
    fontWeight: '600',
    color: theme.colors.onSurface,
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
  phoneDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant,
    padding: spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.gray[200],
  },
  phoneDisplayText: {
    ...typography.bodyLarge,
    marginLeft: spacing.sm,
    color: theme.colors.onSurface,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: theme.colors.warning + '15',
    padding: spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.warning + '30',
  },
  infoText: {
    ...typography.bodyMedium,
    flex: 1,
    marginLeft: spacing.sm,
    color: theme.colors.onSurface,
  },
  input: {
    marginBottom: spacing.md,
  },
  phoneInput: {
    flex: 1,
  },
  otpInput: {
    marginBottom: spacing.lg,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  buttonContent: {
    paddingVertical: spacing.xs,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  resendTimerText: {
    ...typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  resendText: {
    ...typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  linkText: {
    ...typography.bodyMedium,
    color: theme.colors.onSurfaceVariant,
    fontWeight: '500',
  },
  footer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  footerText: {
    ...typography.bodySmall,
    textAlign: 'center',
    color: theme.colors.onSurfaceVariant,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  paperInput: {
    backgroundColor: 'transparent',
    marginBottom: spacing.md,
  },
});