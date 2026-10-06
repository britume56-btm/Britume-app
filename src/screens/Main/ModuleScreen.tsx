import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Module'>;

export default function ModuleScreen({ route }: Props) {
  const { section } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.kicker}>BRITUME • {section}</Text>
      <Text style={styles.title}>{section}</Text>
      <Text style={styles.body}>
        This section is connected to BRITUME navigation. Its features will be built
        one module at a time; nothing in this screen is presented as finished
        functionality.
      </Text>
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Module not built yet</Text>
        <Text style={styles.noticeBody}>
          Your account, profile, private avatar storage, and app lock stay available
          while this section is developed.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b12',
    padding: 20,
  },
  kicker: {
    color: '#d9b867',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    color: '#f4f6fa',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  body: {
    color: '#c5ccd7',
    fontSize: 15,
    lineHeight: 22,
  },
  notice: {
    marginTop: 22,
    padding: 16,
    backgroundColor: '#101722',
    borderWidth: 1,
    borderColor: '#263247',
    borderRadius: 16,
  },
  noticeTitle: {
    color: '#f4f6fa',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  noticeBody: {
    color: '#c5ccd7',
    fontSize: 14,
    lineHeight: 21,
  },
});