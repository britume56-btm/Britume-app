import React from 'react';
import { Text } from 'react-native';

const GLYPHS: Record<string, string> = {
  'person-outline': '●', 'chevron-forward-outline': '›', 'images-outline': '▧',
  'color-palette-outline': '◉', 'musical-notes-outline': '♫', 'settings-outline': '⚙',
  'refresh-outline': '↻', 'person': '●', 'checkmark-circle': '✓', 'camera-outline': '＋',
  'checkmark-circle-outline': '✓', 'arrow-back': '‹', 'information-circle-outline': 'ⓘ',
  'sparkles': '✦', 'arrow-forward': '›', 'shield-checkmark-outline': '✓',
  'grid-outline': '▦', 'notifications-outline': '♢', 'sparkles-outline': '✦',
  'flask-outline': '⚗', 'key-outline': '⌑', 'lock-closed-outline': '▣',
  'trash-outline': '×', 'close': '×', 'log-out-outline': '↪',
};
export default function BRITUMEIcon({ name, size = 20, color = '#2869C7' }: { name: string; size?: number; color?: string }) {
  return <Text accessibilityElementsHidden style={{ fontSize: size, color, fontWeight: '800', textAlign: 'center' }}>{GLYPHS[name] ?? '•'}</Text>;
}
