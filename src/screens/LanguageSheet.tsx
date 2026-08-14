import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '../components/BottomSheet';
import { SelectRow } from '../components/SelectRow';
import { PrimaryButton } from '../components/ui';
import { SUPPORTED_LANGUAGES, type Language } from '../i18n';
import { useLocale } from '../i18n/LocaleProvider';
import { useLang } from '../hooks/useLang';
import { fontSize, spacing, weight } from '../theme';
import { useTheme } from "../store/ConfigContext";

const NATIVE_NAME: Record<Language, string> = { en: 'English', ar: 'العربية' };

/**
 * Screen 10b — the language switch, presented as a bottom sheet over Account.
 * Saving a different writing direction restarts the app so the layout mirrors;
 * see `src/utils/rtl.ts` for why that restart is platform-specific.
 */
export function LanguageSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const { t } = useLang();
  const insets = useSafeAreaInsets();
  const { language, setLanguage, isSwitching } = useLocale();
  const [draft, setDraft] = useState<Language>(language);

  useEffect(() => {
    if (visible) setDraft(language);
  }, [visible, language]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      maxHeightRatio={0.4}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>{t('languageSheet.title')}</Text>
          <Text style={styles.subtitle}>{t('languageSheet.subtitle')}</Text>
        </View>
      }
      footer={
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing['2xl'] }]}>
          <PrimaryButton
            label={t('languageSheet.save')}
            loading={isSwitching}
            onPress={async () => {
              if (draft === language) {
                onClose();
                return;
              }
              // A same-direction change applies instantly; a direction change
              // reloads, so we do not close the sheet first.
              await setLanguage(draft);
              onClose();
            }}
            height={56}
          />
        </View>
      }
    >
      <View style={styles.options}>
        {SUPPORTED_LANGUAGES.map((lng) => (
          <SelectRow
            key={lng}
            selected={draft === lng}
            onPress={() => setDraft(lng)}
            title={NATIVE_NAME[lng]}
            subtitle={t(lng === 'ar' ? 'languageSheet.rtl' : 'languageSheet.ltr')}
            badge={language === lng ? t('languageSheet.current') : undefined}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  header: { paddingBottom: 2 },
  title: { fontSize: 19, fontWeight: weight.heavy, color: colors.ink },
  subtitle: {
    fontSize: fontSize.small,
    fontWeight: weight.semibold,
    color: colors.textSecondary,
    marginTop: 5,
  },
  options: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg + 2, gap: 10 },
  footer: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg + 2 },
});
