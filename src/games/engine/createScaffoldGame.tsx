import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameWrapper } from './GameWrapper';

export function createScaffoldGame(gameName: string) {
  return function GenericScaffold({ navigation }: any) {
    return (
      <GameWrapper title={gameName} onRestart={() => {}} onHome={() => navigation.goBack()}>
        <View style={styles.center}>
          <Text style={styles.title}>{gameName}</Text>
          <Text style={styles.subtitle}>Subsystem staging pipeline configured. Ready for runtime extension deployment hooks.</Text>
        </View>
      </GameWrapper>
    );
  };
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  title: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 12 },
  subtitle: { color: '#AAA', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
