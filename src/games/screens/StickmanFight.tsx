import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { GameWrapper } from '../engine/GameWrapper';

export default function StickmanFight({ navigation }: any) {
  const [log, setLog] = useState('FIGHT!');

  return (
    <GameWrapper title="Stickman Kombat" onRestart={() => setLog('FIGHT!')} onHome={() => navigation.goBack()}>
      <View style={styles.arena}>
        <Text style={styles.combos}>{log}</Text>
        <View style={styles.fighters}>
          <Text style={styles.sprite}>🏃</Text>
          <Text style={styles.sprite}>🏃‍♂️</Text>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={styles.actionBtn} onPress={() => setLog('CRITICAL PUNCH!')}><Text style={styles.txt}>👊 PUNCH</Text></Pressable>
          <Pressable style={styles.actionBtn} onPress={() => setLog('ROUNDHOUSE KICK!')}><Text style={styles.txt}>🦵 KICK</Text></Pressable>
        </View>
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  arena: { flex: 1, backgroundColor: '#000', justifyContent: 'space-between', padding: 20 },
  combos: { color: '#FF3B30', fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 20 },
  fighters: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', flex: 1 },
  sprite: { fontSize: 60 },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 20 },
  actionBtn: { paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#1C1C1E', borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  txt: { color: '#FFF', fontWeight: '700' },
});
