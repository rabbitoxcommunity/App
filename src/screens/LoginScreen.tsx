import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View, Image } from 'react-native';

import { OtpError } from '../api/auth';
import { Icon } from '../components/Icon';
import { Screen, PrimaryButton, TextLink } from '../components/ui';
import { useToast } from '../components/Toast';
import { useNavigation } from '@react-navigation/native';
import { useLocale } from '../i18n/LocaleProvider';
import { useLang } from '../hooks/useLang';
import type { RootNavigation } from '../navigation/types';
import { useAuth } from '../store/AuthContext';
import { fontSize, radii, spacing, weight } from '../theme';
import { formatCountdown } from '../utils/format';
import { useTheme } from "../store/ConfigContext";
import { useConfig } from "../store/ConfigContext";

const OTP_LENGTH = 4;
const RESEND_SECONDS = 30;
const DIAL_CODE = '+971';

/** UAE mobile numbers are 9 digits after the country code (50 214 8873). */
const isValidPhone = (digits: string) => digits.length === 9;

const formatPhone = (digits: string) =>
  [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 9)].filter(Boolean).join(' ');

export function LoginScreen() {
    const { colors } = useTheme();
    const { cachedLogoUrl } = useConfig();
    const logoUrl = cachedLogoUrl;
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const { t } = useLang();
  const { language, setLanguage } = useLocale();
  const { requestOtp, verifyOtp } = useAuth();
  const { show } = useToast();
  const navigation = useNavigation<RootNavigation>();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const otpInput = useRef<TextInput>(null);
  const codeSent = challengeId !== null;

  // Resend countdown.
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const sendCode = useCallback(
    async (channel: 'sms' = 'sms') => {
      if (!isValidPhone(phone)) {
        setError(t('login.invalidPhone'));
        return;
      }
      setError(null);
      setBusy(true);
      try {
        const id = await requestOtp(`${DIAL_CODE}${phone}`, channel);
        setChallengeId(id);
        setCode('');
        setSecondsLeft(RESEND_SECONDS);
        show({ title: t('login.codeSent'), tone: 'success', icon: 'lock' });
        // Focus lands on the code boxes as soon as they become live.
        setTimeout(() => otpInput.current?.focus(), 120);
      } catch {
        show({ title: t('toast.offlineTitle'), body: t('toast.offlineBody'), tone: 'danger', icon: 'offline' });
      } finally {
        setBusy(false);
      }
    },
    [phone, requestOtp, show, t],
  );

  const submitCode = useCallback(async () => {
    if (!challengeId || code.length < OTP_LENGTH) return;
    setBusy(true);
    setError(null);
    try {
      await verifyOtp(challengeId, code);
      // On success the root navigator swaps to the tab stack.
    } catch (e) {
      setError(e instanceof OtpError ? t('login.invalidOtp') : t('toast.offlineTitle'));
      setCode('');
    } finally {
      setBusy(false);
    }
  }, [challengeId, code, t, verifyOtp]);

  const primary = useMemo(() => {
    if (!codeSent) {
      return {
        label: t('login.sendCode'),
        onPress: () => sendCode(),
        disabled: !isValidPhone(phone),
      };
    }
    return {
      label: t('common.continue'),
      onPress: submitCode,
      disabled: code.length < OTP_LENGTH,
    };
  }, [code.length, codeSent, phone, sendCode, submitCode, t]);

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Language toggle — available before sign-in, per the design. */}
          <View style={styles.langRow}>
            <View style={styles.langToggle}>
              {(['en', 'ar'] as const).map((lng) => {
                const active = language === lng;
                return (
                  <Pressable
                    key={lng}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => setLanguage(lng)}
                    style={[styles.langPill, active && styles.langPillActive]}
                  >
                    <Text style={[styles.langLabel, active && styles.langLabelActive]}>
                      {lng === 'en' ? 'EN' : 'العربية'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.brand}>
            <View style={styles.logo}>
              <Icon name="leaf" size={48} color={colors.onPrimary} />
            </View>
            <Text style={styles.wordmark}>{t('brand.name')}</Text>
            <Text style={styles.intro}>{t('login.intro')}</Text>
          </View>

          <Text style={styles.fieldLabel}>{t('login.mobileNumber')}</Text>
          <View style={[styles.phoneField, !!error && !codeSent && styles.fieldError]}>
            <View style={styles.dialCode}>
              <Text style={styles.dialCodeText}>{DIAL_CODE}</Text>
              <Icon name="expand" size={18} color={colors.placeholder} />
            </View>
            <View style={styles.fieldDivider} />
            <TextInput
              style={styles.phoneInput}
              value={formatPhone(phone)}
              onChangeText={(text) => {
                setPhone(text.replace(/\D/g, '').slice(0, 9));
                setError(null);
              }}
              editable={!codeSent && !busy}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              placeholder={t('login.phonePlaceholder')}
              placeholderTextColor={colors.disabledSoft}
              accessibilityLabel={t('login.mobileNumber')}
            />
            {codeSent && (
              <TextLink
                label={t('common.clear')}
                onPress={() => {
                  setChallengeId(null);
                  setCode('');
                  setSecondsLeft(0);
                  setError(null);
                }}
              />
            )}
          </View>

          <Text style={styles.fieldLabel}>{t('login.verificationCode')}</Text>
          <Pressable
            accessibilityRole="none"
            disabled={!codeSent}
            onPress={() => otpInput.current?.focus()}
            style={styles.otpRow}
          >
            {Array.from({ length: OTP_LENGTH }).map((_, index) => {
              const char = code[index];
              const active = codeSent && index === code.length;
              return (
                <View
                  key={index}
                  style={[
                    styles.otpBox,
                    codeSent && styles.otpBoxLive,
                    char != null && styles.otpBoxFilled,
                    active && styles.otpBoxActive,
                  ]}
                >
                  <Text style={styles.otpChar}>{char ?? ''}</Text>
                </View>
              );
            })}
            {/* One offscreen input drives all four boxes. */}
            <TextInput
              ref={otpInput}
              value={code}
              onChangeText={(text) => {
                setCode(text.replace(/\D/g, '').slice(0, OTP_LENGTH));
                setError(null);
              }}
              editable={codeSent && !busy}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={OTP_LENGTH}
              style={styles.hiddenInput}
              accessibilityLabel={t('login.verificationCode')}
            />
          </Pressable>

          <View style={styles.otpMeta}>
            <Text style={styles.otpMetaText}>{codeSent ? t('login.sentBySms') : ' '}</Text>
            {codeSent &&
              (secondsLeft > 0 ? (
                <Text style={styles.resendCounting}>
                  {t('login.resendIn', { time: formatCountdown(secondsLeft) })}
                </Text>
              ) : (
                <TextLink label={t('login.resend')} onPress={() => sendCode()} />
              ))}
          </View>

          {!!error && (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              {error}
            </Text>
          )}

          <PrimaryButton
            label={primary.label}
            onPress={primary.onPress}
            disabled={primary.disabled}
            loading={busy}
            iconEnd="forward"
          />

          <View style={styles.privacyNote}>
            <Icon name="lock" size={22} color={colors.primary} />
            <Text style={styles.privacyText}>{t('login.privacyNote')}</Text>
          </View>

          <Text style={styles.terms}>
            {t('login.termsPrefix')}
            <Text
              style={styles.link}
              onPress={() => navigation.navigate('Legal', { type: 'terms' })}
            >
              {t('login.termsLink')}
            </Text>
            {t('login.termsAnd')}
            <Text
              style={styles.link}
              onPress={() => navigation.navigate('Legal', { type: 'privacy' })}
            >
              {t('login.privacyLink')}
            </Text>
            {t('login.termsSuffix')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 26, paddingTop: spacing.lg, paddingBottom: 34 },
  langRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  langToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
    padding: 4,
    borderRadius: 13,
    backgroundColor: colors.surfaceMuted,
    gap: 2,
  },
  langPill: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langPillActive: { backgroundColor: colors.primary },
  langLabel: { fontSize: fontSize.small, fontWeight: weight.bold, color: colors.inkMuted },
  langLabelActive: { color: colors.onPrimary, fontWeight: weight.heavy, fontSize: fontSize.caption },
  brand: { alignItems: 'center', gap: 14, paddingTop: spacing.xl, paddingBottom: 28 },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.32,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  wordmark: {
    fontSize: fontSize['5xl'],
    fontWeight: weight.heavy,
    color: colors.ink,
    letterSpacing: -0.6,
  },
  intro: {
    fontSize: fontSize.base,
    lineHeight: 25,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 290,
  },
  fieldLabel: {
    fontSize: fontSize.body,
    fontWeight: weight.bold,
    color: colors.inkMuted,
    marginBottom: spacing.sm,
  },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    height: 60,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  fieldError: { borderColor: colors.danger },
  dialCode: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dialCodeText: { fontSize: fontSize.base, fontWeight: weight.bold, color: colors.ink },
  fieldDivider: { width: 1, height: 26, backgroundColor: colors.border },
  phoneInput: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: weight.bold,
    color: colors.ink,
    letterSpacing: 0.6,
    // Digits stay LTR even when the app is mirrored.
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  otpRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  otpBox: {
    flex: 1,
    height: 64,
    borderRadius: radii['2xl'],
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxLive: { borderColor: colors.border },
  otpBoxFilled: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  otpBoxActive: { borderColor: colors.primary },
  otpChar: { fontSize: fontSize['4xl'], fontWeight: weight.heavy, color: colors.ink },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  otpMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 20,
    marginBottom: spacing.lg,
  },
  otpMetaText: {
    fontSize: fontSize.small,
    fontWeight: weight.semibold,
    color: colors.textTertiary,
  },
  resendCounting: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primary },
  errorText: {
    fontSize: fontSize.small,
    fontWeight: weight.bold,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radii['2xl'],
    padding: 14,
    marginTop: spacing.lg,
  },
  privacyText: {
    flex: 1,
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.inkMuted,
    lineHeight: 19,
  },
  terms: {
    fontSize: fontSize.caption,
    lineHeight: 19,
    color: colors.placeholder,
    textAlign: 'center',
    paddingTop: spacing.lg,
  },
  link: {
    color: colors.primaryDark,
    fontWeight: weight.semibold,
  },
});
