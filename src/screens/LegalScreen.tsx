import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconButton, Screen } from '../components/ui';
import { useLang } from '../hooks/useLang';
import type { RootStackParamList } from '../navigation/types';
import { colors, fontSize, spacing, weight } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Legal'>;

export function LegalScreen({ route, navigation }: Props) {
  const { type } = route.params;
  const { t } = useLang();

  const isTerms = type === 'terms';
  const title = isTerms ? t('legal.termsTitle') : t('legal.privacyTitle');
  const content = isTerms ? t('legal.termsContent') : t('legal.privacyContent');

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton name="back" onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.body}>{content}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    height: 56,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: weight.bold,
    color: colors.ink,
  },
  content: {
    padding: spacing.xl,
  },
  body: {
    fontSize: fontSize.base,
    lineHeight: 24,
    color: colors.textSecondary,
  },
});
