
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';
import { useAppTheme } from '../../theme/AppThemeContext';

type LabTask = {
  id: string;
  title: string;
  done: boolean;
};

type LabData = {
  notes: string;
  creatorDraft: string;
  tasks: LabTask[];
  betaFeedback: string;
  accentIndex: number;
};

type ModuleId =
  | 'ai'
  | 'experience'
  | 'creator'
  | 'productivity'
  | 'beta';

const STORAGE_PREFIX = '@britume/labs-v1/';

const NEON = [
  '#28A9FF',
  '#B15CFF',
  '#20F0B0',
  '#FFD34E',
  '#FF4FA3',
  '#39F5FF',
];

const DEFAULT_DATA: LabData = {
  notes: '',
  creatorDraft: '',
  tasks: [],
  betaFeedback: '',
  accentIndex: 0,
};

const MODULES: {
  id: ModuleId;
  title: string;
  subtitle: string;
  symbol: string;
}[] = [
  {
    id: 'ai',
    title: 'BRITUME AI LAB',
    subtitle: 'Prepare prompts and organize AI work',
    symbol: '✦',
  },
  {
    id: 'experience',
    title: 'EXPERIENCE LAB',
    subtitle: 'Customize your BRITUME experience',
    symbol: '◈',
  },
  {
    id: 'creator',
    title: 'CREATOR LAB',
    subtitle: 'Draft posts and creative ideas',
    symbol: '▣',
  },
  {
    id: 'productivity',
    title: 'PRODUCTIVITY LAB',
    subtitle: 'Notes, tasks and daily planning',
    symbol: '✓',
  },
  {
    id: 'beta',
    title: 'BETA EXPERIMENTS',
    subtitle: 'Share feedback and explore ideas',
    symbol: '⚗',
  },
];

export default function LabsScreen() {
  const {
    palette,
    experiments,
    updateExperiment,
    loading: preferencesLoading,
    loadError,
  } = useAppTheme();

  const [userKey, setUserKey] = useState('guest');
  const [data, setData] = useState<LabData>(DEFAULT_DATA);
  const [hydrated, setHydrated] = useState(false);
  const [openModule, setOpenModule] =
    useState<ModuleId | null>('ai');

  const [savingExperiment, setSavingExperiment] =
    useState<string | null>(null);

  const [screenError, setScreenError] = useState('');
  const [aiRequest, setAiRequest] = useState('');
  const [preparedPrompt, setPreparedPrompt] = useState('');
  const [newTask, setNewTask] = useState('');
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const accent = NEON[data.accentIndex] ?? palette.accent;

  const styles = useMemo(
    () => makeStyles(palette, accent),
    [palette, accent],
  );

  // Load the local workspace for the signed-in user.
  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      try {
        const { data: authData, error } =
          await supabase.auth.getUser();

        if (error) {
          throw error;
        }

        const key = authData.user?.id ?? 'guest';
        const saved = await AsyncStorage.getItem(
          `${STORAGE_PREFIX}${key}`,
        );

        if (!active) return;

        setUserKey(key);

        if (saved) {
          try {
            const parsed = JSON.parse(saved) as Partial<LabData>;

            setData({
              ...DEFAULT_DATA,
              ...parsed,
              tasks: Array.isArray(parsed.tasks)
                ? parsed.tasks
                : [],
              accentIndex:
                Number.isInteger(parsed.accentIndex)
                  ? Math.max(
                      0,
                      Math.min(
                        NEON.length - 1,
                        parsed.accentIndex as number,
                      ),
                    )
                  : 0,
            });
          } catch {
            setData(DEFAULT_DATA);
          }
        }
      } catch {
        if (active) {
          setScreenError(
            'Could not load your workspace. You can still use Labs.',
          );
        }
      } finally {
        if (active) setHydrated(true);
      }
    }

    void loadWorkspace();

    return () => {
      active = false;
    };
  }, []);

  // Save notes, drafts, tasks and local settings.
  useEffect(() => {
    if (!hydrated) return;

    AsyncStorage.setItem(
      `${STORAGE_PREFIX}${userKey}`,
      JSON.stringify(data),
    ).catch(() => {
      setScreenError(
        'Could not save your workspace. Check device storage.',
      );
    });
  }, [data, hydrated, userKey]);

  async function toggleExperiment(
    id: 'focus-mode' | 'compact-home',
    enabled: boolean,
  ) {
    if (savingExperiment) return;

    setSavingExperiment(id);
    setScreenError('');

    try {
      await updateExperiment(id, enabled);
    } catch (error) {
      setScreenError(
        error instanceof Error
          ? error.message
          : 'Could not save this account preference.',
      );
    } finally {
      setSavingExperiment(null);
    }
  }

  function preparePrompt(template: string) {
    const request = aiRequest.trim();

    if (!request) {
      setScreenError('Write your request first.');
      return;
    }

    setScreenError('');

    setPreparedPrompt(
      `${template}\n\nUser request:\n${request}\n\n` +
        'Instructions: Be accurate, clear and practical. ' +
        'Ask questions if important information is missing.',
    );
  }

  function addTask() {
    const title = newTask.trim();

    if (!title) return;

    setData(current => ({
      ...current,
      tasks: [
        {
          id: `${Date.now()}-${Math.random()}`,
          title,
          done: false,
        },
        ...current.tasks,
      ],
    }));

    setNewTask('');
  }

  function saveFeedbackLocally() {
    if (!data.betaFeedback.trim()) {
      setScreenError('Write your feedback first.');
      return;
    }

    setScreenError('');
    setFeedbackSaved(true);
  }

  function renderModule(id: ModuleId) {
    if (id === 'ai') {
      return (
        <View style={styles.inner}>
          <Text style={styles.body}>
            Prepare requests for explanations, brainstorming
            and project planning. Real AI answers require a
            secure AI backend.
          </Text>

          <TextInput
            value={aiRequest}
            onChangeText={setAiRequest}
            placeholder="What would you like help with?"
            placeholderTextColor={palette.muted}
            multiline
            style={[styles.input, styles.multiline]}
            accessibilityLabel="Describe your AI request"
          />

          <View style={styles.buttonRow}>
            <Action
              label="Explain a topic"
              styles={styles}
              onPress={() =>
                preparePrompt(
                  'Explain this topic simply, with an example and summary.',
                )
              }
            />

            <Action
              label="Plan a project"
              styles={styles}
              onPress={() =>
                preparePrompt(
                  'Create a realistic step-by-step project plan.',
                )
              }
            />
          </View>

          <Action
            label="Brainstorm ideas"
            styles={styles}
            onPress={() =>
              preparePrompt(
                'Suggest original, practical ideas and explain their pros and cons.',
              )
            }
          />

          {preparedPrompt ? (
            <View style={styles.resultBox}>
              <Text style={styles.label}>PREPARED PROMPT</Text>

              <Text selectable style={styles.body}>
                {preparedPrompt}
              </Text>

              <Action
                label="Clear prompt"
                secondary
                styles={styles}
                onPress={() => setPreparedPrompt('')}
              />
            </View>
          ) : null}

          <Text style={styles.smallNote}>
            This prepares prompts; it does not generate AI
            answers until an AI service is connected.
          </Text>
        </View>
      );
    }

    if (id === 'experience') {
      return (
        <View style={styles.inner}>
          <Text style={styles.body}>
            Preview neon accents and control your existing
            LIVING screen experiments.
          </Text>

          <Text style={styles.label}>NEON ACCENT PREVIEW</Text>

          <View style={styles.swatches}>
            {NEON.map((colour, index) => (
              <Pressable
                key={colour}
                accessibilityRole="button"
                accessibilityLabel={`Choose accent ${index + 1}`}
                accessibilityState={{
                  selected: data.accentIndex === index,
                }}
                onPress={() =>
                  setData(current => ({
                    ...current,
                    accentIndex: index,
                  }))
                }
                style={[
                  styles.swatch,
                  {
                    backgroundColor: colour,
                    borderColor:
                      data.accentIndex === index
                        ? palette.text
                        : colour,
                    borderWidth:
                      data.accentIndex === index ? 3 : 1,
                  },
                ]}
              />
            ))}
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.cardTitle}>Focus Mode</Text>
              <Text style={styles.body}>
                Simplifies the LIVING introduction.
              </Text>
            </View>

            <Switch
              accessibilityLabel="Enable Focus Mode"
              value={experiments['focus-mode']}
              disabled={
                preferencesLoading ||
                savingExperiment !== null
              }
              onValueChange={value =>
                void toggleExperiment('focus-mode', value)
              }
              trackColor={{
                false: '#384454',
                true: accent,
              }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingCopy}>
              <Text style={styles.cardTitle}>
                Compact Home
              </Text>
              <Text style={styles.body}>
                Uses smaller tiles on the LIVING screen.
              </Text>
            </View>

            <Switch
              accessibilityLabel="Enable Compact Home"
              value={experiments['compact-home']}
              disabled={
                preferencesLoading ||
                savingExperiment !== null
              }
              onValueChange={value =>
                void toggleExperiment('compact-home', value)
              }
              trackColor={{
                false: '#384454',
                true: accent,
              }}
            />
          </View>

          {savingExperiment ? (
            <Text style={styles.smallNote}>
              Saving account preference…
            </Text>
          ) : null}

          {loadError ? (
            <Text style={styles.error}>
              Account preferences: {loadError}
            </Text>
          ) : null}

          <Text style={styles.smallNote}>
            Accent changes currently preview this Labs screen.
            Global theme changes need integration with the
            shared theme provider.
          </Text>
        </View>
      );
    }

    if (id === 'creator') {
      return (
        <View style={styles.inner}>
          <Text style={styles.body}>
            Prepare captions, video ideas, music concepts
            and other creative drafts before sharing them.
          </Text>

          <TextInput
            value={data.creatorDraft}
            onChangeText={value =>
              setData(current => ({
                ...current,
                creatorDraft: value,
              }))
            }
            placeholder="Write a caption or creative idea..."
            placeholderTextColor={palette.muted}
            multiline
            style={[styles.input, styles.multiline]}
            accessibilityLabel="Creator draft"
          />

          <Text style={styles.smallNote}>
            {data.creatorDraft.length} characters · saved locally
          </Text>

          <Action
            label="Clear draft"
            secondary
            styles={styles}
            onPress={() =>
              Alert.alert(
                'Clear draft?',
                'This removes the saved creator draft.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () =>
                      setData(current => ({
                        ...current,
                        creatorDraft: '',
                      })),
                  },
                ],
              )
            }
          />
        </View>
      );
    }

    if (id === 'productivity') {
      return (
        <View style={styles.inner}>
          <Text style={styles.label}>QUICK NOTE</Text>

          <TextInput
            value={data.notes}
            onChangeText={value =>
              setData(current => ({
                ...current,
                notes: value,
              }))
            }
            placeholder="Write a note or reminder..."
            placeholderTextColor={palette.muted}
            multiline
            style={[styles.input, styles.multiline]}
            accessibilityLabel="Productivity note"
          />

          <Text style={styles.label}>TASKS</Text>

          <View style={styles.buttonRow}>
            <TextInput
              value={newTask}
              onChangeText={setNewTask}
              placeholder="Add a task"
              placeholderTextColor={palette.muted}
              style={[styles.input, styles.taskInput]}
              onSubmitEditing={addTask}
              returnKeyType="done"
              accessibilityLabel="New task"
            />

            <Action
              label="Add"
              styles={styles}
              onPress={addTask}
            />
          </View>

          {data.tasks.length === 0 ? (
            <Text style={styles.smallNote}>
              No tasks yet. Add one above.
            </Text>
          ) : null}

          {data.tasks.map(task => (
            <View key={task.id} style={styles.taskRow}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.done }}
                onPress={() =>
                  setData(current => ({
                    ...current,
                    tasks: current.tasks.map(item =>
                      item.id === task.id
                        ? { ...item, done: !item.done }
                        : item,
                    ),
                  }))
                }
                style={[
                  styles.taskCheck,
                  task.done && {
                    backgroundColor: accent,
                    borderColor: accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.taskCheckText,
                    task.done && { color: '#07101B' },
                  ]}
                >
                  {task.done ? '✓' : ''}
                </Text>
              </Pressable>

              <Text
                style={[
                  styles.taskText,
                  task.done && styles.taskDone,
                ]}
              >
                {task.title}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete task ${task.title}`}
                onPress={() =>
                  setData(current => ({
                    ...current,
                    tasks: current.tasks.filter(
                      item => item.id !== task.id,
                    ),
                  }))
                }
              >
                <Text style={styles.deleteText}>×</Text>
              </Pressable>
            </View>
          ))}

          <Text style={styles.smallNote}>
            Notes and tasks are saved locally on this device.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.inner}>
        <Text style={styles.body}>
          Suggest an improvement or report a bug. This
          first version saves feedback locally and does not
          send it to BRITUME servers.
        </Text>

        <TextInput
          value={data.betaFeedback}
          onChangeText={value => {
            setData(current => ({
              ...current,
              betaFeedback: value,
            }));
            setFeedbackSaved(false);
          }}
          placeholder="Describe your idea or the problem..."
          placeholderTextColor={palette.muted}
          multiline
          style={[styles.input, styles.multiline]}
          accessibilityLabel="Beta feedback"
        />

        <Action
          label="Save feedback on this device"
          styles={styles}
          onPress={saveFeedbackLocally}
        />

        {feedbackSaved ? (
          <Text style={styles.success}>
            Feedback saved locally. Cloud submission is
            not connected yet.
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Text style={[styles.heroSymbol, { color: accent }]}>
            ⚗
          </Text>
        </View>

        <Text style={styles.kicker}>
          BRITUME • INNOVATION SPACE
        </Text>

        <Text style={styles.title}>Labs</Text>

        <Text style={styles.body}>
          Explore. Create. Experiment.
        </Text>

        <Text style={styles.smallNote}>
          Your workspace is saved on this device.
          Focus Mode and Compact Home use your existing
          BRITUME account settings.
        </Text>
      </View>

      {!hydrated ? (
        <View style={styles.loading}>
          <ActivityIndicator color={accent} />
          <Text style={styles.body}>
            Loading your workspace…
          </Text>
        </View>
      ) : null}

      {screenError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {screenError}
        </Text>
      ) : null}

      {MODULES.map(module => {
        const expanded = openModule === module.id;

        return (
          <View key={module.id} style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() =>
                setOpenModule(
                  expanded ? null : module.id,
                )
              }
              style={styles.moduleHeader}
            >
              <View style={styles.moduleIcon}>
                <Text
                  style={[
                    styles.moduleSymbol,
                    { color: accent },
                  ]}
                >
                  {module.symbol}
                </Text>
              </View>

              <View style={styles.moduleCopy}>
                <Text style={styles.cardTitle}>
                  {module.title}
                </Text>
                <Text style={styles.body}>
                  {module.subtitle}
                </Text>
              </View>

              <Text style={[styles.chevron, { color: accent }]}>
                {expanded ? '−' : '+'}
              </Text>
            </Pressable>

            {expanded ? renderModule(module.id) : null}
          </View>
        );
      })}

      <Text style={styles.footer}>
        BRITUME LABS · Early feature set
      </Text>
    </ScrollView>
  );
}

function Action({
  label,
  onPress,
  styles,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.action,
        secondary && styles.actionSecondary,
      ]}
    >
      <Text
        style={[
          styles.actionText,
          secondary && styles.actionTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(
  palette: {
    background: string;
    surface: string;
    text: string;
    muted: string;
    border: string;
  },
  accent: string,
) {
  return StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 16,
      paddingBottom: 40,
      gap: 12,
    },
    hero: {
      borderWidth: 1,
      borderColor: accent + '80',
      borderRadius: 22,
      padding: 20,
      backgroundColor: palette.surface,
      marginBottom: 4,
    },
    heroIcon: {
      width: 54,
      height: 54,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: accent,
      marginBottom: 14,
      backgroundColor: palette.background,
    },
    heroSymbol: {
      fontSize: 30,
      fontWeight: '900',
    },
    kicker: {
      color: accent,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.8,
      marginBottom: 6,
    },
    title: {
      color: palette.text,
      fontSize: 30,
      fontWeight: '900',
      marginBottom: 3,
    },
    body: {
      color: palette.muted,
      fontSize: 13,
      lineHeight: 19,
      flexShrink: 1,
    },
    smallNote: {
      color: palette.muted,
      opacity: 0.85,
      fontSize: 11,
      lineHeight: 16,
      marginTop: 8,
    },
    card: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface,
      overflow: 'hidden',
    },
    moduleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
    },
    moduleIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.background,
      borderWidth: 1,
      borderColor: accent + '80',
    },
    moduleSymbol: {
      fontSize: 22,
      fontWeight: '900',
    },
    moduleCopy: {
      flex: 1,
      gap: 3,
    },
    cardTitle: {
      color: palette.text,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0.3,
    },
    chevron: {
      fontSize: 25,
      fontWeight: '500',
      paddingHorizontal: 4,
    },
    inner: {
      borderTopWidth: 1,
      borderTopColor: palette.border,
      padding: 14,
      gap: 12,
    },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      color: palette.text,
      backgroundColor: palette.background,
      fontSize: 13,
    },
    multiline: {
      minHeight: 94,
      textAlignVertical: 'top',
    },
    buttonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    action: {
      borderRadius: 11,
      paddingVertical: 11,
      paddingHorizontal: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: accent,
      minHeight: 40,
    },
    actionSecondary: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: palette.border,
    },
    actionText: {
      color: '#07101B',
      fontSize: 12,
      fontWeight: '900',
    },
    actionTextSecondary: {
      color: palette.text,
    },
    label: {
      color: accent,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.3,
    },
    resultBox: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 13,
      padding: 12,
      gap: 9,
      backgroundColor: palette.background,
    },
    swatches: {
      flexDirection: 'row',
      gap: 10,
      flexWrap: 'wrap',
    },
    swatch: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingTop: 12,
    },
    settingCopy: {
      flex: 1,
      gap: 4,
    },
    taskInput: {
      flex: 1,
      minWidth: 80,
    },
    taskRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: palette.border,
      paddingVertical: 9,
    },
    taskCheck: {
      width: 23,
      height: 23,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: palette.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    taskCheckText: {
      color: palette.text,
      fontWeight: '900',
      fontSize: 13,
    },
    taskText: {
      color: palette.text,
      flex: 1,
      fontSize: 13,
    },
    taskDone: {
      textDecorationLine: 'line-through',
      opacity: 0.6,
    },
    deleteText: {
      color: '#FF7596',
      fontSize: 23,
      paddingHorizontal: 6,
    },
    error: {
      color: '#FF8A9D',
      fontSize: 12,
      lineHeight: 18,
      padding: 10,
    },
    success: {
      color: '#7DE6B3',
      fontSize: 12,
      lineHeight: 18,
    },
    loading: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
      padding: 12,
    },
    footer: {
      textAlign: 'center',
      color: palette.muted,
      fontSize: 10,
      letterSpacing: 1.2,
      marginTop: 8,
    },
  });
}
