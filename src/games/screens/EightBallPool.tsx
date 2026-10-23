import React, { useState } from 'react';
import { StyleSheet, Text, View, PanResponder, Animated } from 'react-native';
import { GameWrapper } from '../engine/GameWrapper';

export default function EightBallPool({ navigation }: any) {
  const [score, setScore] = useState(0);
  const cueX = useState(new Animated.Value(0))[0];

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      cueX.setValue(gestureState.dx);
    },
    onPanResponderRelease: () => {
      Animated.spring(cueX, { toValue: 0, useNativeDriver: true }).start();
      setScore(score + 50);
    },
  });

  return (
    <GameWrapper title="8-Ball Pool Physics" onRestart={() => setScore(0)} onHome={() => navigation.goBack()}>
      <View style={styles.table}>
        <Text style={styles.score}>Pockets Potted: {score}</Text>
        <View style={styles.felt}>
          <View style={[styles.ball, { left: 80, top: 100, backgroundColor: '#FFF' }]} />
          <View style={[styles.ball, { left: 200, top: 95, backgroundColor: '#F1C40F' }]} />
          <View style={[styles.ball, { left: 220, top: 110, backgroundColor: '#8E44AD' }]} />
          
          <Animated.View 
            {...panResponder.panHandlers} 
            style={[styles.cue, { transform: [{ translateX: cueX }] }]} 
          />
        </View>
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  table: { flex: 1, backgroundColor: '#4E3629', padding: 12, justifyContent: 'center' },
  felt: { flex: 1, backgroundColor: '#16A085', borderRadius: 8, position: 'relative', overflow: 'hidden' },
  score: { color: '#FFF', textAlign: 'center', margin: 10, fontWeight: '800' },
  ball: { width: 18, height: 18, borderRadius: 9, position: 'absolute' },
  cue: { width: 120, height: 6, backgroundColor: '#D2B48C', position: 'absolute', bottom: 40, left: 20 },
});
