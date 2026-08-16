import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Screen, PrimaryButton } from '../components/ui';
import { useToast } from '../components/Toast';
import { useNavigation } from '@react-navigation/native';
import { useLang } from '../hooks/useLang';
import type { RootNavigation } from '../navigation/types';
import { useAuth } from '../store/AuthContext';
import { updateMe } from '../api/me';
import { fontSize, radii, spacing, weight } from '../theme';
import { useTheme } from '../store/ConfigContext';

export function PersonalInfoScreen() {
  const { colors } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const { t } = useLang();
  const { show } = useToast();
  const navigation = useNavigation<RootNavigation>();
  const { session, reloadSession } = useAuth() as any;

  const isUpdate = session?.customer?.name !== 'New Customer';

  const [name, setName] = useState(isUpdate ? session?.customer?.name || '' : '');
  const [email, setEmail] = useState(isUpdate ? session?.customer?.email || '' : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = (str: string) => /^\S+@\S+\.\S+$/.test(str);

  const onSave = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError(t('account.invalidName') || 'Please enter your full name.');
      return;
    }
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      setError(t('account.invalidEmail') || 'Please enter a valid email address.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await updateMe({ name: cleanName, email: cleanEmail || undefined });
      if (reloadSession) {
         await reloadSession();
      }
      if (isUpdate && navigation.canGoBack()) {
        navigation.goBack();
      }
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={styles.title}>{isUpdate ? 'Update Profile' : 'Welcome!'}</Text>
            <Text style={styles.subtitle}>{isUpdate ? 'Update your personal details below.' : 'Let\'s get to know you better. Please provide your details below.'}</Text>
          </View>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <View style={[styles.inputContainer, !!error && !name.trim() && styles.fieldError]}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(text) => {
                setName(text);
                setError(null);
              }}
              editable={!busy}
              placeholder="e.g. John Doe"
              placeholderTextColor={colors.disabledSoft}
              autoCapitalize="words"
              textContentType="name"
            />
          </View>

          <Text style={styles.fieldLabel}>Email Address (Optional)</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError(null);
              }}
              editable={!busy}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="emailAddress"
              placeholder="e.g. john@example.com"
              placeholderTextColor={colors.disabledSoft}
            />
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.footer}>
            <PrimaryButton
              label="Save & Continue"
              onPress={onSave}
              disabled={!name.trim() || busy}
              loading={busy}
              iconEnd="forward"
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 26, paddingTop: spacing.xl, paddingBottom: 34, flexGrow: 1 },
  header: { marginBottom: spacing['2xl'], marginTop: spacing.xl },
  title: { fontSize: fontSize['4xl'], fontWeight: weight.heavy, color: colors.ink, marginBottom: 8 },
  subtitle: { fontSize: fontSize.base, color: colors.textSecondary, lineHeight: 22 },
  
  fieldLabel: {
    fontSize: fontSize.body,
    fontWeight: weight.bold,
    color: colors.inkMuted,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    height: 60,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    justifyContent: 'center',
  },
  fieldError: { borderColor: colors.danger },
  input: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: weight.bold,
    color: colors.ink,
    writingDirection: 'ltr',
    textAlign: 'left',
  },
  errorText: {
    fontSize: fontSize.small,
    fontWeight: weight.bold,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
});
