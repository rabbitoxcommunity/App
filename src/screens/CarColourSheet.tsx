import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '../components/BottomSheet';
import { SelectRow } from '../components/SelectRow';
import { PrimaryButton } from '../components/ui';
import { t as tr } from '../data/catalog';
import { CAR_COLOURS } from '../data/orders';
import { useLang } from '../hooks/useLang';
import { colors, fontSize, radii, spacing, weight } from '../theme';

export type CarColour = (typeof CAR_COLOURS)[number];

/** The curbside car-colour picker, presented over Checkout. */
export function CarColourSheet({
  visible,
  selectedHex,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  selectedHex: string;
  onClose: () => void;
  onConfirm: (colour: CarColour) => void;
}) {
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const [draftHex, setDraftHex] = useState(selectedHex);

  // Re-seed on each open so dismissing without applying discards the draft.
  useEffect(() => {
    if (visible) setDraftHex(selectedHex);
  }, [visible, selectedHex]);

  const draft = CAR_COLOURS.find((c) => c.hex === draftHex) ?? CAR_COLOURS[0];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      maxHeightRatio={0.45}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>{t('checkout.chooseColour')}</Text>
        </View>
      }
      footer={
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing['2xl'] }]}>
          <PrimaryButton label={t('common.apply')} onPress={() => onConfirm(draft)} height={56} />
        </View>
      }
    >
      {/* A ScrollView, not a View: the palette is longer than the sheet body's
          capped height, and the body clips rather than scrolls on its own. */}
      <ScrollView contentContainerStyle={styles.options} showsVerticalScrollIndicator={false}>
        {CAR_COLOURS.map((colour) => (
          <SelectRow
            key={colour.hex}
            selected={colour.hex === draft.hex}
            onPress={() => setDraftHex(colour.hex)}
            leading={<View style={[styles.swatch, { backgroundColor: colour.hex }]} />}
            title={tr(colour.name, language)}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { paddingBottom: 2 },
  title: { fontSize: 19, fontWeight: weight.heavy, color: colors.ink },
  options: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg + 2,
    paddingBottom: spacing.sm,
    gap: 10,
  },
  footer: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg + 2 },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: radii.lg,
    // White and silver would otherwise vanish against the row's surface.
    borderWidth: 1,
    borderColor: colors.border,
  },
});
