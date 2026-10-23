import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Alert } from 'react-native';
import { GameWrapper } from '../engine/GameWrapper';
import { GameEngine } from '../engine/GameEngine';

export default function ChessGame({ navigation }: any) {
  const [score, setScore] = useState(1200);
  const [turn, setTurn] = useState<'White' | 'Black'>('White');

  const makeMove = () => {
    setTurn(turn === 'White' ? 'Black' : 'White');
    const points = score + 10;
    setScore(points);
    void GameEngine.saveScore('ChessGame', points);
  };

  return (
    <GameWrapper title="Chess AAA" onRestart={() => setScore(1200)} onHome={() => navigation.goBack()}>
      <View style={styles.container}>
        <Text style={styles.hudText}>Turn: {turn} | Score: {score}</Text>
        <View style={styles.board}>
          {[...Array(64)].map((_, i) => {
            const isDark = (Math.floor(i / 8) + i) % 2 === 1;
            return (
              <Pressable 
                key={i} 
                style={[styles.square, { backgroundColor: isDark ? '#769656' : '#eeeed2' }]}
                onPress={makeMove}
              >
                {i === 12 && <Text style={styles.piece}>👑</Text>}
                {i === 52 && <Text style={styles.piece}>🐴</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hudText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 20 },
  board: { width: 320, height: 320, flexDirection: 'row', flexWrap: 'wrap' },
  square: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  piece: { fontSize: 24 },
});
