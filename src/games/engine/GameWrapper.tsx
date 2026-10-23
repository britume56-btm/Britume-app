import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { SoundManager } from './SoundManager';

interface WrapperProps {
  title: string;
  onRestart: () => void;
  onHome: () => void;
  children: React.ReactNode;
}

export function GameWrapper({ title, onRestart, onHome, children }: WrapperProps) {
  const [isMuted, setIsMuted] = useState(SoundManager.isMuted);

  const toggleSound = () => {
    const muted = SoundManager.toggleMute();
    setIsMuted(muted);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onHome} style={styles.btn}><Text style={styles.btnText}>🏠 Home</Text></Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.rightActions}>
          <Pressable onPress={toggleSound} style={styles.btn}>
            <Text style={styles.btnText}>{isMuted ? '🔇' : '🔊'}</Text>
          </Pressable>
          <Pressable onPress={onRestart} style={styles.btn}><Text style={styles.btnText}>🔄 Reset</Text></Pressable>
        </View>
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A1A1A' },
  header: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: '#2D2D2D' },
  title: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  rightActions: { flexDirection: 'row', gap: 8 },
  btn: { padding: 6, backgroundColor: '#3D3D3D', borderRadius: 4 },
  btnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  body: { flex: 1 },
});
