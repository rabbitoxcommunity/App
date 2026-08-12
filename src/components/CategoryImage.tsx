import React, { useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import { colors, radii } from '../theme';
import { Icon, type IconName } from './Icon';

/**
 * The category tile artwork. The design draws a green glyph on a `#EDF8E7`
 * square; the app ships real photography instead, filling the same square so the
 * tile geometry (1:1, 20px corners) still matches the design.
 *
 * The glyph stays as the fallback: if the photo fails to decode the tile falls
 * back to the design's original treatment rather than rendering an empty box.
 */
export function CategoryImage({
  source,
  icon,
  size,
  radius = radii['3xl'],
  style,
}: {
  source: ImageSourcePropType;
  /** Drawn only if `source` fails to load. */
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
      {failed ? (
        <Icon name={icon} size={size ? Math.round(size * 0.42) : 30} color={colors.primary} />
      ) : (
        <Image
          source={source}
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
