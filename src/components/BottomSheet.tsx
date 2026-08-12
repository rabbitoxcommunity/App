import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { colors, radii, shadow, spacing } from '../theme';
import { SHEET_SPRING } from './motion';

/** Distance the panel travels while opening and closing. */
const TRAVEL = 620;

/**
 * The bottom sheet used by Filter & sort, the slot picker and the language
 * switch. The backdrop fades while the panel springs up, and dragging the
 * handle down past a threshold dismisses it — matching the grab handle the
 * design draws on every sheet.
 *
 * The panel is laid out as the last child of a `justifyContent: 'flex-end'`
 * column rather than being absolutely positioned: that way it sizes to its
 * content, stays pinned to the bottom, and can never overflow the screen.
 */
export function BottomSheet({
  visible,
  onClose,
  children,
  /** Rendered above the scrollable body and used as the drag area. */
  header,
  footer,
  /**
   * Fraction of the window the *scrollable body* may occupy. Bounding the body
   * rather than the whole sheet is what keeps the footer on screen — an
   * unbounded ScrollView in a shrink-to-fit column overflows instead of
   * scrolling.
   */
  maxHeightRatio = 0.5,
  /** Lifts the panel clear of the keyboard — set it on sheets that hold inputs. */
  avoidKeyboard = false,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightRatio?: number;
  avoidKeyboard?: boolean;
}) {
  const { height: windowHeight } = useWindowDimensions();
  // `mounted` keeps the modal on screen through the closing animation.
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(TRAVEL)).current;
  const backdrop = useRef(new Animated.Value(0)).current;

  const animateClose = useCallback(
    (then?: () => void) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: TRAVEL,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdrop, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(({ finished }) => {
        if (finished) {
          setMounted(false);
          then?.();
        }
      });
    },
    [translateY, backdrop],
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translateY.setValue(TRAVEL);
      backdrop.setValue(0);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, ...SHEET_SPRING }),
        Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      animateClose();
    }
    // `mounted` is intentionally omitted: including it would re-run the open
    // animation the moment the sheet mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_e, g) => {
        // A fling down, or a long drag, dismisses.
        if (g.dy > 120 || g.vy > 1.2) {
          animateClose(onClose);
        } else {
          Animated.spring(translateY, { toValue: 0, ...SHEET_SPRING }).start();
        }
      },
    }),
  ).current;

  if (!mounted) return null;

  // A plain View unless the sheet asked for keyboard avoidance — wrapping every
  // sheet in one would change how the untouched ones lay out.
  const Root = avoidKeyboard ? KeyboardAvoidingView : View;
  const rootProps = avoidKeyboard
    ? { behavior: Platform.select({ ios: 'padding' as const, android: 'height' as const }) }
    : null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Root style={styles.root} {...rootProps}>
        <Animated.View style={[styles.backdrop, { opacity: backdrop }]} pointerEvents="none" />

        {/* Tapping the area above the panel dismisses it. */}
        <Pressable
          style={styles.dismissArea}
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
        />

        <Animated.View style={[styles.sheet, shadow.sheet, { transform: [{ translateY }] }]}>
          <View {...pan.panHandlers} style={styles.handleArea}>
            <View style={styles.handle} />
            {header}
          </View>

          <View style={[styles.body, { maxHeight: windowHeight * maxHeightRatio }]}>
            {children}
          </View>

          {footer}
        </Animated.View>
      </Root>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.overlay,
  },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    overflow: 'hidden',
  },
  handleArea: { paddingTop: spacing.lg, paddingHorizontal: spacing.gutter },
  handle: {
    width: 44,
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  body: { flexShrink: 1 },
});
