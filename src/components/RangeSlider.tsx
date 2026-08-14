import React, { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, StyleSheet, View } from 'react-native';

import { radii } from '../theme';
import { useTheme } from "../store/ConfigContext";

const THUMB = 26;

/**
 * Two-thumb price range slider, as drawn on screen 03b.
 *
 * The track is deliberately laid out with `left`/`right` rather than
 * `start`/`end`: a numeric axis reads low-to-high left-to-right in Arabic UIs
 * too, and mirroring it would invert the drag gesture against the labels.
 */
export function RangeSlider({
  min,
  max,
  step = 1,
  low,
  high,
  onChange,
}: {
  min: number;
  max: number;
  step?: number;
  low: number;
  high: number;
  onChange: (low: number, high: number) => void;
}) {
    const { colors } = useTheme();
    const styles = React.useMemo(() => makeStyles(colors), [colors]);

  const [width, setWidth] = useState(0);

  // Refs mirror the props so the pan handlers (created once) always read the
  // current values without being re-created on every render.
  const lowRef = useRef(low);
  const highRef = useRef(high);
  lowRef.current = low;
  highRef.current = high;
  const widthRef = useRef(0);
  const dragStart = useRef(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    widthRef.current = w;
    setWidth(w);
  }, []);

  const toValue = useCallback(
    (px: number) => {
      const usable = Math.max(1, widthRef.current - THUMB);
      const ratio = Math.max(0, Math.min(1, px / usable));
      const raw = min + ratio * (max - min);
      return Math.round(raw / step) * step;
    },
    [min, max, step],
  );

  const toPx = useCallback(
    (value: number) => {
      const usable = Math.max(0, width - THUMB);
      if (max === min) return 0;
      return ((value - min) / (max - min)) * usable;
    },
    [width, min, max],
  );

  const makeResponder = (which: 'low' | 'high') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const usable = Math.max(0, widthRef.current - THUMB);
        const value = which === 'low' ? lowRef.current : highRef.current;
        dragStart.current = ((value - min) / (max - min || 1)) * usable;
      },
      onPanResponderMove: (_e, g) => {
        const next = toValue(dragStart.current + g.dx);
        if (which === 'low') {
          // Thumbs may meet but never cross.
          onChange(Math.min(next, highRef.current), highRef.current);
        } else {
          onChange(lowRef.current, Math.max(next, lowRef.current));
        }
      },
    });

  const lowPan = useRef(makeResponder('low')).current;
  const highPan = useRef(makeResponder('high')).current;

  const lowPx = toPx(low);
  const highPx = toPx(high);

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <View style={styles.track} />
      <View
        style={[
          styles.fill,
          { left: lowPx + THUMB / 2, width: Math.max(0, highPx - lowPx) },
        ]}
      />

      <View
        {...lowPan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityValue={{ min, max, now: low }}
        style={[styles.thumb, { left: lowPx }]}
      />
      <View
        {...highPan.panHandlers}
        accessibilityRole="adjustable"
        accessibilityValue={{ min, max, now: high }}
        style={[styles.thumb, { left: highPx }]}
      />
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  wrap: { height: THUMB, justifyContent: 'center' },
  track: {
    position: 'absolute',
    left: THUMB / 2,
    right: THUMB / 2,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.borderLight,
  },
  fill: {
    position: 'absolute',
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: colors.surface,
    borderWidth: 5,
    borderColor: colors.primary,
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});
