import LiveThemePreview from './LiveThemePreview';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  name: string;
  background: string;
  surface: string;
  accent: string;
  text: string;
};

export default function LiveThemePreview({
  <LiveThemePreview
  name={template.name}
  background={template.background}
  surface={template.surface}
  accent={template.accent}
  text={template.text}
/>
  name,
  background,
  surface,
  accent,
  text,
}: Props) {
  const rotation = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotationLoop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1700,
          useNativeDriver: true,
        }),
      ]),
    );

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    rotationLoop.start();
    glowLoop.start();
    driftLoop.start();

    return () => {
      rotationLoop.stop();
      glowLoop.stop();
      driftLoop.stop();
    };
  }, [rotation, glow, drift]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.95],
  });

  const floatY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [9, -9],
  });

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Animated.View
        style={[
          styles.orbit,
          {
            borderColor: accent,
            transform: [{ rotate: spin }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.orbitDot,
            {
              backgroundColor: accent,
              opacity: glowOpacity,
            },
          ]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.glow,
          {
            backgroundColor: accent,
            opacity: glowOpacity,
            transform: [{ translateY: floatY }],
          },
        ]}
      />

      <View style={styles.content}>
        <Text style={[styles.brand, { color: accent }]}>
          BRITUME • LIVE THEME
        </Text>

        <Text style={[styles.title, { color: text }]}>
          {name}
        </Text>

        <Text style={[styles.subtitle, { color: text }]}>
          Your world. Your style.
        </Text>

        <View
          style={[
            styles.sampleCard,
            { backgroundColor: surface, borderColor: accent },
          ]}
        >
          <View style={[styles.sampleIcon, { backgroundColor: accent }]} />

          <View style={styles.sampleCopy}>
            <Text style={[styles.sampleTitle, { color: text }]}>
              Your BRITUME
            </Text>
            <Text style={[styles.sampleSubtitle, { color: text }]}>
              Personalised for you
            </Text>
          </View>

          <Animated.View
            style={[
              styles.liveIndicator,
              { backgroundColor: accent, opacity: glowOpacity },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 235,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    padding: 18,
    marginTop: 12,
  },
  orbit: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 100,
    borderWidth: 1,
    borderStyle: 'dashed',
    right: -35,
    top: -35,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  orbitDot: {
    height: 15,
    width: 15,
    borderRadius: 10,
    marginTop: -7,
  },
  glow: {
    position: 'absolute',
    width: 125,
    height: 125,
    borderRadius: 100,
    right: 0,
    bottom: -55,
  },
  content: {
    zIndex: 1,
  },
  brand: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 5,
    opacity: 0.8,
  },
  sampleCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sampleIcon: {
    height: 34,
    width: 34,
    borderRadius: 11,
  },
  sampleCopy: {
    flex: 1,
  },
  sampleTitle: {
    fontSize: 12,
    fontWeight: '900',
  },
  sampleSubtitle: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.75,
  },
  liveIndicator: {
    height: 9,
    width: 9,
    borderRadius: 5,
  },
});
