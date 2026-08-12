import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheet } from '../components/BottomSheet';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { SelectRow } from '../components/SelectRow';
import { PrimaryButton } from '../components/ui';
import { t as tr } from '../data/catalog';
import { slotDays, slotsForDate } from '../data/orders';
import type { DeliverySlot } from '../data/types';
import { useLang } from '../hooks/useLang';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { formatMoney } from '../utils/format';

/** Screen 06b — the delivery slot picker, presented over Checkout. */
export function SlotPickerSheet({
  visible,
  selectedSlotId,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  selectedSlotId?: string;
  onClose: () => void;
  onConfirm: (slot: DeliverySlot) => void;
}) {
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();

  const days = useMemo(() => slotDays(), []);
  const [activeDay, setActiveDay] = useState(days[0]);
  const slots = useMemo(() => slotsForDate(activeDay), [activeDay]);
  const [draftId, setDraftId] = useState<string | undefined>(selectedSlotId);

  // Re-seed each time the sheet opens, and keep the draft on a valid slot when
  // the customer flips to another day.
  useEffect(() => {
    if (visible) {
      setActiveDay(days[0]);
      setDraftId(selectedSlotId);
    }
  }, [visible, selectedSlotId, days]);

  useEffect(() => {
    if (draftId && slots.some((s) => s.id === draftId)) return;
    setDraftId(slots.find((s) => s.slotsLeft > 0 && s.recommended)?.id);
  }, [slots, draftId]);

  const draft = slots.find((s) => s.id === draftId);

  const dayLabel = (iso: string, index: number) => {
    const date = new Date(iso);
    const weekday =
      index === 0
        ? t('slots.today')
        : new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
            weekday: 'short',
          })
            .format(date)
            .toUpperCase();
    const month = new Intl.DateTimeFormat(language === 'ar' ? 'ar-AE' : 'en-AE', {
      month: 'short',
      numberingSystem: 'latn',
    }).format(date);
    return { weekday, day: date.getDate(), month };
  };

  const slotNote = (slot: DeliverySlot) => {
    if (slot.slotsLeft === 0) return t('slots.fullyBooked');
    if (slot.recommended) return t('slots.recommended', { count: slot.slotsLeft });
    if (slot.fee === 0) return t('slots.offPeak');
    return t('slots.slotsLeft', { count: slot.slotsLeft });
  };

  /** "Recommended" and "Off-peak · free delivery" are drawn brand-green. */
  const noteTone = (slot: DeliverySlot) =>
    slot.slotsLeft > 0 && (slot.recommended || slot.fee === 0) ? 'brand' : 'muted';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      header={
        <View style={styles.header}>
          <Text style={styles.title}>{t('slots.title')}</Text>
          <Text style={styles.subtitle}>{t('slots.subtitle')}</Text>
        </View>
      }
      footer={
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}>
          <PressableScale
            accessibilityRole="button"
            onPress={onClose}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelLabel}>{t('slots.cancel')}</Text>
          </PressableScale>
          <PrimaryButton
            label={
              draft
                ? t('slots.confirm', { slot: tr(draft.label, language) })
                : t('slots.title')
            }
            disabled={!draft}
            onPress={() => draft && onConfirm(draft)}
            height={56}
            labelSize={fontSize.base}
            style={styles.confirmButton}
          />
        </View>
      }
    >
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        // The sheet's drag handle owns vertical gestures; the list scrolls on its own.
        nestedScrollEnabled
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStrip}
        >
          {days.map((iso, index) => {
            const { weekday, day, month } = dayLabel(iso, index);
            const active = iso === activeDay;
            return (
              <PressableScale
                key={iso}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => setActiveDay(iso)}
                style={[styles.dayCard, active && styles.dayCardActive]}
              >
                <Text style={[styles.dayWeekday, active && styles.dayMetaActive]}>{weekday}</Text>
                <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>{day}</Text>
                <Text style={[styles.dayMonth, active && styles.dayMetaActive]}>{month}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        <View style={styles.slots}>
          {slots.map((slot, index) => {
            const soldOut = slot.slotsLeft === 0;
            return (
              <FadeSlideIn key={slot.id} index={index}>
                <SelectRow
                  selected={draftId === slot.id}
                  disabled={soldOut}
                  onPress={() => setDraftId(slot.id)}
                  title={tr(slot.label, language)}
                  titleSize={fontSize.bodyLg}
                  subtitle={slotNote(slot)}
                  subtitleTone={noteTone(slot)}
                  trailing={
                    soldOut ? null : (
                      <Text
                        style={[
                          styles.fee,
                          (slot.fee ?? 0) === 0 && styles.feeFree,
                          draftId === slot.id && styles.feeSelected,
                        ]}
                      >
                        {(slot.fee ?? 0) === 0
                          ? t('checkout.free')
                          : formatMoney(slot.fee ?? 0, language)}
                      </Text>
                    )
                  }
                />
              </FadeSlideIn>
            );
          })}
        </View>
      </ScrollView>
    </BottomSheet>
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
  body: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg + 2 },
  dayStrip: { gap: 9, paddingBottom: 2 },
  dayCard: {
    width: 78,
    height: 76,
    borderRadius: radii['2xl'],
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayWeekday: { fontSize: fontSize.tiny, fontWeight: weight.bold, color: colors.placeholder },
  dayNumber: { fontSize: 19, fontWeight: weight.heavy, color: colors.ink },
  dayMonth: { fontSize: fontSize.micro, fontWeight: weight.bold, color: colors.placeholder },
  // The date reads at full strength on the selected card; the weekday and month
  // around it are held back a notch.
  dayNumberActive: { color: colors.onPrimary },
  dayMetaActive: { color: colors.onPrimary, opacity: 0.9 },
  slots: { gap: 10, marginTop: spacing.lg + 2 },
  fee: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.inkMuted },
  feeFree: { color: colors.primary },
  feeSelected: { color: colors.primary },
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
  confirmButton: { flex: 1 },
});
