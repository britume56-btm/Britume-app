import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { GameWrapper } from '../engine/GameWrapper';

export default function CircuitConnect({ navigation }: any) {
  const [nodes, setNodes] = useState([false, false, false, false]);

  const toggleNode = (idx: number) => {
    const updated = [...nodes];
    updated[idx] = !updated[idx];
    setNodes(updated);
  };

  const isComplete = nodes.every(n => n);

  return (
    <GameWrapper title="Circuit Matrix" onRestart={() => setNodes([false, false, false, false])} onHome={() => navigation.goBack()}>
      <View style={styles.container}>
        <Text style={styles.status}>{isComplete ? '⚡ SYSTEM ONLINE ⚡' : 'CONNECT POWER BUS'}</Text>
        <View style={styles.grid}>
          {nodes.map((node, idx) => (
            <Pressable 
              key={idx} 
              style={[styles.node, { backgroundColor: node ? '#FFEB3B' : '#424242' }]}
              onPress={() => toggleNode(idx)}
            >
              <Text style={{ fontWeight: '800' }}>{node ? 'ON' : 'OFF'}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  status: { color: '#FFF', fontSize: 18, fontWeight: '800', marginBottom: 40 },
  grid: { flexDirection: 'row', gap: 20 },
  node: { width: 60, height: 60, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
