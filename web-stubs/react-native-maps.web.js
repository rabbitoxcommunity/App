// react-native-maps ships native-only components (codegenNativeCommands) that
// Metro can't bundle for web. This stub stands in for it only on the web
// platform (wired up in metro.config.js) so the rest of the app — including
// screens that merely import MapView — can still bundle and run in a browser.
// Native builds (iOS/Android) never see this file; they resolve the real package.
import React, { forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MapView = forwardRef(function MapView(props, ref) {
  useImperativeHandle(ref, () => ({
    animateToRegion: () => {},
    animateCamera: () => {},
    fitToCoordinates: () => {},
  }));
  return (
    <View style={[styles.fallback, props.style]}>
      <Text style={styles.text}>Map preview isn't available on web — try the iOS/Android app.</Text>
      {props.children}
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF0EC',
    padding: 20,
  },
  text: {
    color: '#7B857F',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export const Marker = (props) => <>{props.children}</>;
export const Callout = (props) => <>{props.children}</>;
export const Polyline = () => null;
export const Circle = () => null;
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

export default MapView;
