import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppTheme } from '../../theme/AppThemeContext';

type Progress = { points: number; sessions: number; best: number };
const KEY = 'britume-brain-learn-v1';
const QUESTIONS = [
  { prompt: 'What is the change from liquid water into vapour called?', choices: ['Freezing', 'Condensation', 'Evaporation'], answer: 2 },
  { prompt: 'What is 18 + 24?', choices: ['32', '42', '52'], answer: 1 },
  { prompt: 'Which is a strong account-security habit?', choices: ['Reuse one password', 'Share your password', 'Use a unique password'], answer: 2 },
];
export default function GamesScreen() {
  const { palette } = useAppTheme();
  const [progress, setProgress] = useState<Progress>({ points: 0, sessions: 0, best: 0 });
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const question = QUESTIONS[index];
  const next = async () => {
    if (index < QUESTIONS.length - 1) { setIndex(index + 1); setSelected(null); return; }
    const finalScore = score;
    const updated = { points: progress.points + finalScore * 100, sessions: progress.sessions + 1, best: Math.max(progress.best, Math.round((finalScore / QUESTIONS.length) * 100)) };
    setProgress(updated);
    try { await AsyncStorage.setItem(KEY, JSON.stringify(updated)); } catch { Alert.alert('Progress not saved', 'Your score is available for this session only.'); }
    setFinished(true);
  };
  const restart = () => { setIndex(0); setScore(0); setSelected(null); setFinished(false); };
  const card = { backgroundColor: palette.surface, borderColor: palette.border };
  return <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
    <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • PLAY TO GROW</Text><Text style={[styles.title, { color: palette.text }]}>Brain & Learn</Text><Text style={[styles.body, { color: palette.muted }]}>A short offline quiz to build useful everyday knowledge.</Text>
    <View style={[styles.card, card]}><Text style={[styles.heading, { color: palette.text }]}>Progress</Text><Text style={[styles.body, { color: palette.muted }]}>{progress.points} points · {progress.sessions} sessions · best {progress.best}%</Text></View>
    <View style={[styles.card, card]}>{finished ? <><Text style={[styles.heading, { color: palette.text }]}>Quiz complete: {score}/{QUESTIONS.length}</Text><Pressable onPress={restart} style={[styles.button, { backgroundColor: palette.accent }]}><Text style={{ color: palette.background, fontWeight: '900' }}>Play again</Text></Pressable></> : <><Text style={[styles.heading, { color: palette.text }]}>Question {index + 1} of {QUESTIONS.length}</Text><Text style={[styles.question, { color: palette.text }]}>{question.prompt}</Text>{question.choices.map((choice, i) => <Pressable key={choice} disabled={selected !== null} onPress={() => { setSelected(i); if (i === question.answer) setScore(value => value + 1); }} style={[styles.option, { borderColor: selected !== null && i === question.answer ? '#299D79' : palette.border }]}><Text style={{ color: palette.text }}>{choice}</Text></Pressable>)}{selected !== null && <Pressable onPress={() => void next()} style={[styles.button, { backgroundColor: palette.accent }]}><Text style={{ color: palette.background, fontWeight: '900' }}>{index === QUESTIONS.length - 1 ? 'Finish quiz' : 'Next question'}</Text></Pressable>}</>}</View>
  </ScrollView>;
}
const styles = StyleSheet.create({ container: { flexGrow: 1, padding: 20 }, kicker: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 }, title: { fontSize: 28, fontWeight: '900', marginTop: 7 }, body: { fontSize: 14, lineHeight: 21, marginTop: 8 }, card: { borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 16 }, heading: { fontSize: 17, fontWeight: '800' }, question: { fontSize: 18, fontWeight: '700', marginVertical: 18 }, option: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 9 }, button: { minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12 } });
