import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AdSlot } from '../../components/monetization/MonetizationSlots';
import { useAppTheme } from '../../theme/AppThemeContext';

type Question = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

type Category = {
  id: string;
  title: string;
  icon: string;
  description: string;
  questions: Question[];
};

type Progress = {
  points: number;
  sessions: number;
  best: Record<string, number>;
  achievements: string[];
};

const STORAGE_KEY = 'britume-brain-learn-v1';

const CATEGORIES: Category[] = [
  {
    id: 'money',
    title: 'Money Smart',
    icon: '💰',
    description: 'Learn budgeting and saving.',
    questions: [
      {
        prompt: 'You have P500. You spend P180 on food and P70 on transport. How much remains?',
        options: ['P250', 'P320', 'P430', 'P750'],
        answer: 0,
        explanation: 'P180 + P70 = P250 spent. P500 − P250 = P250 remaining.',
      },
      {
        prompt: 'Three notebooks cost P24. What is the price of one notebook?',
        options: ['P6', 'P8', 'P12', 'P21'],
        answer: 1,
        explanation: 'Divide P24 by 3 notebooks. Each notebook costs P8.',
      },
      {
        prompt: 'You want to save P600 over six months. How much must you save monthly?',
        options: ['P60', 'P90', 'P100', 'P120'],
        answer: 2,
        explanation: 'P600 ÷ 6 months = P100 per month.',
      },
    ],
  },
  {
    id: 'business',
    title: 'Business Builder',
    icon: '🚀',
    description: 'Think like an entrepreneur.',
    questions: [
      {
        prompt: 'A business sells 20 notebooks at P15 each. Stock costs P180 and transport costs P40. What is the profit?',
        options: ['P80', 'P120', 'P220', 'P300'],
        answer: 0,
        explanation: 'Revenue is 20 × P15 = P300. Total costs are P220. Profit is P300 − P220 = P80.',
      },
      {
        prompt: 'A product sells for P50 and costs P32 to buy. What is the profit before other expenses?',
        options: ['P18', 'P32', 'P50', 'P82'],
        answer: 0,
        explanation: 'Selling price minus cost: P50 − P32 = P18.',
      },
      {
        prompt: 'What should you do before investing money in a new product?',
        options: [
          'Buy unlimited stock',
          'Ignore customers',
          'Research what customers need',
          'Spend all your savings',
        ],
        answer: 2,
        explanation: 'Research helps you discover whether people need the product before you risk your money.',
      },
    ],
  },
  {
    id: 'life',
    title: 'Life Skills',
    icon: '🧭',
    description: 'Make smarter everyday decisions.',
    questions: [
      {
        prompt: 'A message asks for your banking PIN to give you a prize. What should you do?',
        options: [
          'Send your PIN',
          'Share it privately',
          'Never share it; verify the offer independently',
          'Post it online',
        ],
        answer: 2,
        explanation: 'Never share your PIN. Unexpected prize messages can be scams. Verify offers using official contact details.',
      },
      {
        prompt: 'You have several tasks due today. What is the best first step?',
        options: [
          'Ignore deadlines',
          'List tasks and prioritise them',
          'Do everything simultaneously',
          'Wait until tomorrow',
        ],
        answer: 1,
        explanation: 'Listing tasks and prioritising by urgency and importance helps you plan your time.',
      },
      {
        prompt: 'You disagree with a teammate. What is the most constructive response?',
        options: [
          'Insult them',
          'Listen and explain your reasoning respectfully',
          'Interrupt repeatedly',
          'Refuse to communicate',
        ],
        answer: 1,
        explanation: 'Respectful listening and comparing reasons helps a team find solutions.',
      },
    ],
  },
  {
    id: 'world',
    title: 'World Knowledge',
    icon: '🌍',
    description: 'Discover science and geography.',
    questions: [
      {
        prompt: 'What is the change from liquid water into water vapour called?',
        options: ['Freezing', 'Condensation', 'Evaporation', 'Melting'],
        answer: 2,
        explanation: 'Evaporation changes liquid water into water vapour. Condensation changes vapour into liquid.',
      },
      {
        prompt: 'Which action can reduce electricity use?',
        options: [
          'Leave every light on',
          'Switch off lights in empty rooms',
          'Keep unused devices running',
          'Open the fridge repeatedly',
        ],
        answer: 1,
        explanation: 'Switching off unnecessary lights reduces the electricity they consume.',
      },
      {
        prompt: 'What does a map scale show?',
        options: [
          'Map distance compared with real distance',
          'The age of every building',
          'Tomorrow’s weather with certainty',
          'Every household’s population',
        ],
        answer: 0,
        explanation: 'A map scale relates distance on the map to the corresponding distance on the ground.',
      },
    ],
  },
];

const INITIAL_PROGRESS: Progress = {
  points: 0,
  sessions: 0,
  best: {},
  achievements: [],
};

export default function GamesScreen() {
  const { palette } = useAppTheme();
  const [progress, setProgress] = useState<Progress>(INITIAL_PROGRESS);
  const [category, setCategory] = useState<Category | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (active && saved) {
          try {
            setProgress({ ...INITIAL_PROGRESS, ...JSON.parse(saved) });
          } catch {
            setProgress(INITIAL_PROGRESS);
          }
        }
      })
      .catch(() => {
        // Gameplay remains available without saved progress.
      });

    return () => {
      active = false;
    };
  }, []);

  const saveProgress = async (next: Progress) => {
    setProgress(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Progress remains available for this session.
    }
  };

  const start = (item: Category) => {
    setCategory(item);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  const question = category?.questions[index];

  const choose = (choice: number) => {
    if (selected !== null || !question) return;

    setSelected(choice);

    if (choice === question.answer) {
      setScore((current) => current + 1);
    }
  };

  const next = async () => {
    if (!category || !question) return;

    if (index < category.questions.length - 1) {
      setIndex((current) => current + 1);
      setSelected(null);
      return;
    }

    const finalScore = score;
    const percentage = Math.round(
      (finalScore / category.questions.length) * 100,
    );
    const passed = percentage >= 80;
    const nextProgress: Progress = {
      points: progress.points + finalScore * 100,
      sessions: progress.sessions + 1,
      best: {
        ...progress.best,
        [category.id]: Math.max(
          progress.best[category.id] ?? 0,
          percentage,
        ),
      },
      achievements: passed
        ? Array.from(
            new Set([...progress.achievements, category.id]),
          )
        : progress.achievements,
    };

    await saveProgress(nextProgress);
    setFinished(true);
  };

  const reset = () => {
    setCategory(null);
    setSelected(null);
    setIndex(0);
    setScore(0);
    setFinished(false);
  };

  const cardStyle = {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { backgroundColor: palette.background },
      ]}
    >
      <Text style={[styles.kicker, { color: palette.accent }]}>
        BRITUME • PLAY TO GROW
      </Text>

      <Text style={[styles.title, { color: palette.text }]}>
        BRAIN &amp; LEARN
      </Text>

      <Text style={[styles.body, { color: palette.muted }]}>
        Build useful skills. Solve puzzles. Learn something new every day.
        All questions in this first version work offline.
      </Text>

      <View style={[styles.card, cardStyle]}>
        <Text style={[styles.heading, { color: palette.text }]}>
          Your progress
        </Text>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.number, { color: palette.accent }]}>
              {progress.points}
            </Text>
            <Text style={[styles.muted, { color: palette.muted }]}>
              Points
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.number, { color: palette.accent }]}>
              {progress.sessions}
            </Text>
            <Text style={[styles.muted, { color: palette.muted }]}>
              Sessions
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.number, { color: palette.accent }]}>
              {progress.achievements.length}
            </Text>
            <Text style={[styles.muted, { color: palette.muted }]}>
              Achievements
            </Text>
          </View>
        </View>
      </View>

      {!category ? (
        <>
          <Text style={[styles.heading, { color: palette.text }]}>
            Choose a learning path
          </Text>

          {CATEGORIES.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => start(item)}
              style={({ pressed }) => [
                styles.category,
                cardStyle,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <View style={styles.categoryText}>
                <Text style={[styles.categoryTitle, { color: palette.text }]}>
                  {item.title}
                </Text>
                <Text style={[styles.muted, { color: palette.muted }]}>
                  {item.description}
                </Text>
                <Text style={[styles.best, { color: palette.accent }]}>
                  Best score: {progress.best[item.id] ?? 0}%
                </Text>
              </View>
              <Text style={[styles.arrow, { color: palette.accent }]}>›</Text>
            </Pressable>
          ))}

          <View style={[styles.card, cardStyle]}>
            <Text style={[styles.heading, { color: palette.text }]}>
              🏅 Achievements
            </Text>
            <Text style={[styles.muted, { color: palette.muted }]}>
              Score at least 80% in a learning path to unlock its achievement.
            </Text>
            {progress.achievements.map((id) => {
              const item = CATEGORIES.find((entry) => entry.id === id);
              return item ? (
                <Text
                  key={id}
                  style={[styles.achievement, { color: palette.accent }]}
                >
                  ✓ {item.title} completed
                </Text>
              ) : null;
            })}
          </View>
        </>
      ) : finished ? (
        <View style={[styles.card, cardStyle]}>
          <Text style={styles.resultIcon}>
            {score / category.questions.length >= 0.8 ? '🏅' : '🧠'}
          </Text>
          <Text style={[styles.heading, { color: palette.text }]}>
            {score / category.questions.length >= 0.8
              ? 'Learning path passed!'
              : 'Keep practising!'}
          </Text>
          <Text style={[styles.result, { color: palette.accent }]}>
            {score} / {category.questions.length} correct
          </Text>
          <Text style={[styles.muted, { color: palette.muted }]}>
            {score / category.questions.length >= 0.8
              ? 'Achievement unlocked. This is a local completion record, not a verified certificate.'
              : 'Read the explanations and try again. You need at least 80% to pass.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => start(category)}
            style={[styles.button, { backgroundColor: palette.accent }]}
          >
            <Text style={[styles.buttonText, { color: palette.background }]}>
              Play again
            </Text>
          </Pressable>
          <Pressable onPress={reset} style={styles.backButton}>
            <Text style={{ color: palette.accent }}>
              Back to learning paths
            </Text>
          </Pressable>
        </View>
      ) : question ? (
        <View style={[styles.card, cardStyle]}>
          <Pressable onPress={reset}>
            <Text style={[styles.backLink, { color: palette.accent }]}>
              ‹ All learning paths
            </Text>
          </Pressable>

          <Text style={[styles.best, { color: palette.accent }]}>
            {category.title.toUpperCase()}
          </Text>
          <Text style={[styles.muted, { color: palette.muted }]}>
            Question {index + 1} of {category.questions.length}
          </Text>

          <Text style={[styles.question, { color: palette.text }]}>
            {question.prompt}
          </Text>

          {question.options.map((option, i) => {
            const correct = i === question.answer;
            const chosen = selected === i;
            const answered = selected !== null;

            return (
              <Pressable
                key={option}
                disabled={answered}
                onPress={() => choose(i)}
                style={[
                  styles.option,
                  {
                    backgroundColor: palette.background,
                    borderColor:
                      answered && correct
                        ? '#238653'
                        : answered && chosen
                          ? '#c44949'
                          : palette.border,
                  },
                ]}
              >
                <Text style={[styles.optionText, { color: palette.text }]}>
                  {String.fromCharCode(65 + i)}. {option}
                </Text>
                {answered && correct ? (
                  <Text style={styles.check}>✓</Text>
                ) : null}
              </Pressable>
            );
          })}

          {selected !== null ? (
            <View style={styles.explanation}>
              <Text
                style={[
                  styles.heading,
                  { color: selected === question.answer ? '#238653' : palette.accent },
                ]}
              >
                {selected === question.answer
                  ? 'Correct! +100 points'
                  : 'Let’s learn why'}
              </Text>
              <Text style={[styles.muted, { color: palette.muted }]}>
                {question.explanation}
              </Text>
              <Pressable
                onPress={() => void next()}
                style={[styles.button, { backgroundColor: palette.accent }]}
              >
                <Text style={[styles.buttonText, { color: palette.background }]}>
                  {index === category.questions.length - 1
                    ? 'Finish learning path'
                    : 'Next question'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}

      <AdSlot label="Games sponsor slot" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: 18 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  heading: { fontSize: 17, fontWeight: '800', marginBottom: 10 },
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  number: { fontSize: 22, fontWeight: '900' },
  muted: { fontSize: 13, lineHeight: 20, marginTop: 6 },
  category: { flexDirection: 'row', alignItems: 'center', borderRadius: 15, borderWidth: 1, padding: 14, marginBottom: 10 },
  icon: { fontSize: 28, marginRight: 12 },
  categoryText: { flex: 1 },
  categoryTitle: { fontSize: 16, fontWeight: '800' },
  best: { fontSize: 11, fontWeight: '800', marginTop: 8 },
  arrow: { fontSize: 28, marginLeft: 8 },
  achievement: { fontSize: 13, fontWeight: '700', marginTop: 9 },
  pressed: { opacity: 0.75 },
  resultIcon: { fontSize: 40, marginBottom: 10 },
  result: { fontSize: 20, fontWeight: '900', marginBottom: 8 },
  question: { fontSize: 19, lineHeight: 27, fontWeight: '800', marginTop: 14, marginBottom: 18 },
  option: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 9, flexDirection: 'row', justifyContent: 'space-between' },
  optionText: { fontSize: 14, lineHeight: 20, flex: 1 },
  check: { color: '#238653', fontSize: 20, fontWeight: '900', marginLeft: 8 },
  explanation: { marginTop: 12, paddingTop: 12 },
  button: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 14 },
  buttonText: { fontSize: 14, fontWeight: '900' },
  backButton: { alignItems: 'center', padding: 13 },
  backLink: { fontWeight: '800', marginBottom: 12 },
});
