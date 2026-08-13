import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radii } from '../theme';
import { Icon, type IconName } from './Icon';

/**
 * The category tile artwork. The design draws a green glyph on a `#EDF8E7`
 * square; when the shop has uploaded a photo (CMS-managed `imageUrl`) it fills
 * the same square so the tile geometry (1:1, 20px corners) still matches the
 * design. Falls back to the glyph both when there's no photo yet and if a
 * photo URL fails to decode.
 */
export function CategoryImage({
  uri,
  icon,
  size,
  radius = radii['3xl'],
  style,
}: {
  uri?: string;
  icon: IconName;
  /** Square side length; omit to fill the parent. */
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [failed, setFailed] = useState(false);

  const box: ViewStyle = {
    borderRadius: radius,
    ...(size ? { width: size, height: size } : { width: '100%', aspectRatio: 1 }),
  };

  return (
    <View style={[styles.base, box, style]}>
      {!uri || failed ? (
        <Icon name={icon} size={size ? Math.round(size * 0.42) : 30} color={colors.primary} />
      ) : (
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    // Shows through while the photo decodes, and behind the fallback glyph —
    // this is the design's category-tile green.
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
});
