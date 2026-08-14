import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Skeleton } from './Skeleton';
import { useTheme } from "../store/ConfigContext";

/**
 * Stands in for the design's `<image-slot>`: renders the product photo when the
 * backend supplies one, and a tinted glyph on the design's `#F7F8F8` swatch
 * when it doesn't.
 */
export function ProductImage({
  uri,
  icon,
  size,
  radius = 14,
  dimmed,
  style,
}: {
  uri?: string;
  icon: IconName;
  /** Square side length; omit to fill the parent. */
  size?: number;
  radius?: number;
  /** Out-of-stock products render faded, per the design. */
  dimmed?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  // Photos come off the network, so there is a real gap before the first pixel
  // lands. Errors settle it too — a broken URL must not pulse forever.
  const [pending, setPending] = useState(true);

  const box: ViewStyle = {
    borderRadius: radius,
    ...(size ? { width: size, height: size } : { flex: 1 }),
    ...(dimmed ? { opacity: 0.45 } : null),
  };

  return (
    <View style={[styles.base, box, style]}>
      {uri ? (
        <>
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="cover"
            onLoadEnd={() => setPending(false)}
          />
          {pending && (
            <Skeleton style={StyleSheet.absoluteFill} radius={radius} height={undefined} />
          )}
        </>
      ) : (
        <Icon name={icon} size={size ? Math.round(size * 0.46) : 40} color={colors.disabled} />
      )}
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
});
