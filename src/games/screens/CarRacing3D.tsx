import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { GameWrapper } from '../engine/GameWrapper';

export default function CarRacing3D({ navigation }: any) {
  const [speed, setSpeed] = useState(0);

  return (
    <GameWrapper title="Nitro Horizon Racing" onRestart={() => setSpeed(0)} onHome={() => navigation.goBack()}>
      <View style={styles.track}>
        <Text style={styles.speedometer}>{speed} KM/H</Text>
        <View style={styles.road}>
          <View style={styles.car}><Text style={styles.carGraphic}>🏎️</Text></View>
        </View>
        <View style={styles.controls}>
          <Pressable style={styles.btn} onPressIn={() => setSpeed(180)} onPressOut={() => setSpeed(0)}>
            <Text style={styles.btnText}>NITRO</Text>
          </Pressable>
        </View>
      </View>
    </GameWrapper>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, backgroundColor: '#333', justifyContent: 'space-between' },
  speedometer: { color: '#FFCC00', fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 20 },
  road: { flex: 1, backgroundColor: '#555', marginHorizontal: 40, borderLeftWidth: 4, borderRightWidth: 4, borderColor: '#FFF', justifyContent: 'flex-end', alignItems: 'center' },
  car: { marginBottom: 40 },
  carGraphic: { fontSize: 45 },
  controls: { padding: 20, alignItems: 'center' },
  btn: { width: 100, padding: 14, backgroundColor: '#E74C3C', borderRadius: 50, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '900' },
});
