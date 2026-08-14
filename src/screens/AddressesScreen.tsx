import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { FadeSlideIn, PressableScale } from '../components/motion';
import { SelectRow } from '../components/SelectRow';
import { useToast } from '../components/Toast';
import { AppHeader, Screen, TextLink, EmptyState } from '../components/ui';
import { t as tr } from '../data/catalog';
import type { Address } from '../data/types';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { type AddressDraft, useAddresses } from '../store/AddressesContext';
import { colors, fontSize, radii, spacing, weight } from '../theme';
import { AddressSheet } from './AddressSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'Addresses'>;

export function AddressesScreen({ navigation }: Props) {
  const { t, language } = useLang();
  const insets = useSafeAreaInsets();
  const { show } = useToast();
  
  const { addresses, addAddress, updateAddress, setPrimary } = useAddresses();

  const [editing, setEditing] = useState<Address | null>(null);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [pickedLocation, setPickedLocation] = useState<{ latitude: number; longitude: number; label?: string; lines?: string } | null>(null);

  const openAddAddress = () => {
    setEditing(null);
    setPickedLocation(null);
    setAddressSheetOpen(true);
  };

  const openEditAddress = (address: Address) => {
    setEditing(address);
    setPickedLocation(null);
    setAddressSheetOpen(true);
  };

  const saveAddress = async (draft: AddressDraft) => {
    const finalDraft = pickedLocation
      ? { ...draft, latitude: pickedLocation.latitude, longitude: pickedLocation.longitude }
      : draft;
      
    if (editing) {
      await updateAddress(editing.id, finalDraft);
      show({ title: t('address.updated'), tone: 'success', icon: 'check-circle' });
    } else {
      await addAddress(finalDraft);
      show({ title: t('address.added'), tone: 'success', icon: 'check-circle' });
    }
    setAddressSheetOpen(false);
  };

  return (
    <Screen>
      <View style={styles.gutter}>
        <AppHeader
          title={t('account.addresses')}
          onBack={navigation.goBack}
          backLabel={t('common.back')}
          align="start"
          trailing={
            addresses.length > 0 ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={t('address.addTitle')}
                onPress={openAddAddress}
                style={styles.addNew}
              >
                <Icon name="add" size={17} color={colors.primary} />
                <Text style={styles.addNewLabel}>{t('checkout.addNew')}</Text>
              </PressableScale>
            ) : null
          }
        />
      </View>

      {addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <EmptyState
            icon="location"
            title="No Addresses Saved"
            body="You haven't saved any delivery addresses yet."
            actionLabel="Add Address"
            onAction={openAddAddress}
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stack}>
            {addresses.map((address, index) => (
              <FadeSlideIn key={address.id} index={index}>
                <SelectRow
                  alignTop
                  radius={radii['3xl']}
                  selected={address.isPrimary}
                  onPress={() => {
                    if (!address.isPrimary) setPrimary(address.id);
                  }}
                  title={tr(address.label, language)}
                  badge={address.isPrimary ? t('checkout.primary') : undefined}
                  subtitle={[tr(address.lines, language), address.phone]
                    .filter(Boolean)
                    .join('\n')}
                  footer={
                    address.isPrimary ? null : (
                      <TextLink
                        label={t('checkout.setPrimary')}
                        style={styles.setPrimary}
                        onPress={() => setPrimary(address.id)}
                      />
                    )
                  }
                  trailing={
                    <TextLink
                      label={t('checkout.edit')}
                      style={styles.editLink}
                      onPress={() => openEditAddress(address)}
                    />
                  }
                />
              </FadeSlideIn>
            ))}
          </View>
        </ScrollView>
      )}

      <AddressSheet
        visible={addressSheetOpen}
        address={editing}
        pickedLocation={pickedLocation}
        onPickLocation={() => {
          setAddressSheetOpen(false);
          setTimeout(() => {
            navigation.navigate('LocationPicker', {
              onLocationPicked: (loc) => {
                setPickedLocation(loc);
                setAddressSheetOpen(true);
              },
            });
          }, 150);
        }}
        canUnsetPrimary={!editing?.isPrimary}
        onClose={() => setAddressSheetOpen(false)}
        onSave={saveAddress}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  gutter: { paddingHorizontal: spacing.gutter, paddingTop: 4 },
  content: { paddingHorizontal: spacing.gutter, paddingTop: spacing.md },
  stack: { gap: 10 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  
  addNew: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  addNewLabel: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primary },
  
  editLink: { fontSize: fontSize.small, fontWeight: weight.heavy, color: colors.primary },
  setPrimary: { fontSize: fontSize.caption, marginTop: 6 },
});
