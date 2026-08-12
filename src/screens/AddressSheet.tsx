import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '../components/BottomSheet';
import { Icon } from '../components/Icon';
import { PressableScale } from '../components/motion';
import { PrimaryButton } from '../components/ui';
import { t as tr } from '../data/catalog';
import type { Address, Localized } from '../data/types';
import { useLang } from '../hooks/useLang';
import type { AddressDraft } from '../store/AddressesContext';
import { colors, fontSize, radii, spacing, weight } from '../theme';

/**
 * Add / edit an address, presented over Checkout (screen 06). The handoff has no
 * frame for this form, so it is assembled from the pieces the design does
 * define: the slot picker's sheet chrome (06b) and the curbside car fields (06c).
 */
export function AddressSheet({
  visible,
  address,
  canUnsetPrimary,
  onClose,
  onSave,
}: {
  visible: boolean;
  /** The address being edited, or `null` to add a new one. */
  address: Address | null;
  /** False while editing the only primary address, which cannot be demoted here. */
  canUnsetPrimary: boolean;
  onClose: () => void;
  onSave: (draft: AddressDraft) => void;
}) {
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();

  const [label, setLabel] = useState('');
  const [lines, setLines] = useState('');
  const [phone, setPhone] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [touched, setTouched] = useState(false);

  // Re-seed every time the sheet opens so a cancelled edit leaves no residue.
  useEffect(() => {
    if (!visible) return;
    setLabel(address ? tr(address.label, language) : '');
    setLines(address ? tr(address.lines, language) : '');
    setPhone(address?.phone ?? '');
    setIsPrimary(address?.isPrimary ?? false);
    setTouched(false);
  }, [visible, address, language]);

  const labelError = touched && !label.trim();
  const linesError = touched && !lines.trim();
  const valid = !!label.trim() && !!lines.trim();

  const save = () => {
    if (!valid) {
      setTouched(true);
      return;
    }
    // The address book is bilingual but the customer types in one language, so
    // the typed string stands in for both — and editing only overwrites the
    // language on screen, leaving the seeded translation intact.
    const localize = (value: string, existing?: Localized): Localized => {
      const trimmed = value.trim();
      return existing ? { ...existing, [language]: trimmed } : { en: trimmed, ar: trimmed };
    };
    onSave({
      label: localize(label, address?.label),
      lines: localize(lines, address?.lines),
      phone: phone.trim() || undefined,
      isPrimary,
    });
  };

  const primaryLocked = !canUnsetPrimary && isPrimary;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      avoidKeyboard
      maxHeightRatio={0.52}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>
            {t(address ? 'address.editTitle' : 'address.addTitle')}
          </Text>
          <Text style={styles.subtitle}>{t('address.subtitle')}</Text>
        </View>
      }
      footer={
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
          <PressableScale accessibilityRole="button" onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelLabel}>{t('slots.cancel')}</Text>
          </PressableScale>
          <PrimaryButton
            label={t(address ? 'address.save' : 'address.add')}
            onPress={save}
            height={56}
            labelSize={fontSize.base}
            style={styles.saveButton}
          />
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        <Field
          label={t('address.labelField')}
          value={label}
          onChangeText={(v) => setLabel(v)}
          placeholder={t('address.labelPlaceholder')}
          error={labelError}
          autoCapitalize="words"
        />
        <Field
          label={t('address.linesField')}
          value={lines}
          onChangeText={(v) => setLines(v)}
          placeholder={t('address.linesPlaceholder')}
          error={linesError}
          multiline
        />
        <Field
          label={t('address.phoneField')}
          value={phone}
          onChangeText={(v) => setPhone(v)}
          placeholder={t('address.phonePlaceholder')}
          keyboardType="phone-pad"
          optional
        />

        <PressableScale
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isPrimary, disabled: primaryLocked }}
          disabled={primaryLocked}
          onPress={() => setIsPrimary((v) => !v)}
          activeScale={0.985}
          style={[styles.primaryRow, isPrimary && styles.primaryRowOn]}
        >
          <View style={[styles.checkbox, isPrimary && styles.checkboxOn]}>
            {isPrimary && <Icon name="check" size={15} color={colors.onPrimary} />}
          </View>
          <View style={styles.primaryText}>
            <Text style={styles.primaryTitle}>{t('address.makePrimary')}</Text>
            <Text style={styles.primaryNote}>
              {t(primaryLocked ? 'address.primaryLocked' : 'address.primaryNote')}
            </Text>
          </View>
        </PressableScale>
      </ScrollView>
    </BottomSheet>
  );
}

/** The design's labelled field from the curbside car row, made editable. */
function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  multiline,
  optional,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  error?: boolean;
  multiline?: boolean;
  optional?: boolean;
  keyboardType?: 'phone-pad';
  autoCapitalize?: 'words';
}) {
  const { t } = useLang();
  return (
    <View style={[styles.field, multiline && styles.fieldMultiline, error && styles.fieldError]}>
      <Text style={styles.fieldLabel}>
        {label}
        {optional ? ` · ${t('address.optional')}` : ''}
      </Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.disabledSoft}
        accessibilityLabel={label}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        // Digits stay LTR even when the app is mirrored.
        {...(keyboardType === 'phone-pad' ? { textAlign: 'left' as const } : null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 2 },
  title: { fontSize: fontSize['2xl'], fontWeight: weight.heavy, color: colors.ink },
  subtitle: {
    fontSize: fontSize.small,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 5,
  },
  body: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg + 2, gap: 10 },

  field: {
    minHeight: 58,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    paddingHorizontal: 14,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  fieldMultiline: { minHeight: 76 },
  fieldError: { borderColor: colors.danger },
  fieldLabel: {
    fontSize: fontSize.micro,
    fontWeight: weight.bold,
    color: colors.placeholder,
    letterSpacing: 0.5,
  },
  input: {
    fontSize: fontSize.bodyLg,
    fontWeight: weight.heavy,
    color: colors.ink,
    marginTop: 2,
    // Keeps the box from growing on Android, which pads inputs by default.
    paddingVertical: 0,
  },
  inputMultiline: { lineHeight: 21, textAlignVertical: 'top' },

  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii['2xl'],
    padding: 14,
  },
  primaryRowOn: { borderColor: colors.primary, backgroundColor: colors.primaryTintedBg },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.xs,
    borderWidth: 2,
    borderColor: colors.checkboxBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  primaryText: { flex: 1, minWidth: 0 },
  primaryTitle: { fontSize: fontSize.body, fontWeight: weight.heavy, color: colors.ink },
  primaryNote: {
    fontSize: fontSize.caption,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 3,
  },

  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg,
  },
  cancelButton: {
    height: 56,
    paddingHorizontal: 22,
    borderRadius: radii['2xl'],
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: { fontSize: fontSize.bodyLg, fontWeight: weight.heavy, color: colors.inkMuted },
  saveButton: { flex: 1 },
});
