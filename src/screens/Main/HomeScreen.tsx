
import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../theme/AppThemeContext';
import { listFeed } from '../../services/socialService';
import { supabase } from '../../../lib/supabase';

const NEON_COLORS = [
  '#28A9FF', // Electric Blue
  '#B15CFF', // Neon Purple
  '#20F0B0', // Emerald
  '#FFD34E', // Gold
  '#FF4FA3', // Rose Pink
  '#39F5FF', // Ice Cyan
];

const SHORTCUTS = [
  { label: 'Games', icon: '🎮', route: 'Games' },
  { label: 'Technologies', icon: '⚡', route: 'TECHNOLOGIES' },
  { label: 'Social', icon: '👥', route: 'Social' },
  { label: 'AI', icon: '✦', route: 'AI' },
  { label: 'Diary', icon: '📔', route: 'DIARY' },
  { label: 'Library', icon: '📚', route: 'LIBRARY' },
  { label: 'Space 1', icon: '＋', route: 'SPACE1' },
  { label: 'Space 2', icon: '＋', route: 'SPACE2' },
];

type LivingPost = {
  id: string;
  body: string;
  author?: {
    username?: string | null;
    display_name?: string | null;
  };
  created_at?: string;
};

export default function LivingGlassScreen({ navigation }: any) {
  const { palette, backgroundUri } = useAppTheme();
  const [colorIndex, setColorIndex] = useState(0);
  const [autoCycle, setAutoCycle] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [posts, setPosts] = useState<LivingPost[]>([]);
  const [feedMessage, setFeedMessage] = useState('Loading BRITUME posts...');
  const glow = NEON_COLORS[colorIndex];

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReducedMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!autoCycle || reducedMotion) return;

    const timer = setInterval(() => {
      setColorIndex((current) => (current + 1) % NEON_COLORS.length);
    }, 10000);

    return () => clearInterval(timer);
  }, [autoCycle, reducedMotion]);

  useEffect(() => {
    let active = true;

    async function loadFeed() {
      try {
        const { data, error } = await supabase.auth.getUser();

        if (error) throw error;

        if (!data.user) {
          if (active) setFeedMessage('Sign in to see your BRITUME feed.');
          return;
        }

        const result = await listFeed(data.user.id);

        if (active) {
          setPosts(result);
          setFeedMessage(
            result.length ? '' : 'No posts yet. Be the first to share something!'
          );
        }
      } catch {
        if (active) {
          setFeedMessage('Your feed could not load. Check your connection and try again.');
        }
      }
    }

    void loadFeed();

    return () => {
      active = false;
    };
  }, []);

  function openShortcut(route: string) {
    if (route === 'Games' || route === 'Social') {
      navigation.navigate(route);
    } else if (route === 'TECHNOLOGIES') {
      navigation.navigate('Module', { section: 'TECHNOLOGIES' });
    } else if (route === 'AI' || route === 'DIARY' || route === 'LIBRARY') {
      navigation.navigate('Module', { section: route });
    } else {
      // Configurable shortcuts will be connected to user choices later.
      navigation.navigate('SETTINGS');
    }
  }

  function openPostAuthor(post: LivingPost) {
    // Open a profile only when the existing post data supplies an author ID
    // and the current navigation supports that destination.
    if (post.id) {
      navigation.navigate('Social');
    }
  }

  return (
    <ScrollView
      style={[
        styles.screen,
        { backgroundColor: palette.background },
      ]}
      contentContainerStyle={styles.content}
    >
      {/* BRITUME EYES */}
      <View style={styles.eyesRow}>
        {[0, 1].map((eye) => (
          <View
            key={eye}
            style={[
              styles.eyeGlow,
              {
                borderColor: glow,
                shadowColor: glow,
                backgroundColor: `${glow}22`,
              },
            ]}
          >
            <View style={[styles.eye, { borderColor: glow }]}>
              <View style={[styles.pupil, { backgroundColor: glow }]} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.headingRow}>
        <View>
          <Text style={[styles.brand, { color: glow }]}>BRITUME</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            See Beyond. Move Forward.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change neon theme color"
          onPress={() => {
            setAutoCycle(false);
            setColorIndex((current) => (current + 1) % NEON_COLORS.length);
          }}
          style={[styles.colorButton, { borderColor: glow }]}
        >
          <Text style={{ color: glow, fontSize: 20 }}>✦</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => setAutoCycle((value) => !value)}
        style={[styles.cycleButton, { borderColor: glow }]}
      >
        <Text style={[styles.cycleText, { color: palette.text }]}>
          Neon: {autoCycle ? 'Automatic' : NEON_COLORS[colorIndex]}
          {'  '}· Tap to {autoCycle ? 'pause' : 'resume'}
        </Text>
      </Pressable>

      {/* HORIZONTAL SHORTCUTS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.shortcutRow}
      >
        {SHORTCUTS.map((item) => (
          <Pressable
            key={item.label}
            accessibilityRole="button"
            onPress={() => openShortcut(item.route)}
            style={({ pressed }) => [
              styles.shortcut,
              {
                borderColor: glow,
                backgroundColor: `${glow}14`,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={styles.shortcutIcon}>{item.icon}</Text>
            <Text
              numberOfLines={1}
              style={[styles.shortcutLabel, { color: palette.text }]}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* REAL SUPABASE FEED */}
      <View style={styles.feedHeading}>
        <Text style={[styles.feedTitle, { color: palette.text }]}>
          Your Living Feed
        </Text>
        <Text style={[styles.feedCaption, { color: palette.muted }]}>
          Real BRITUME posts
        </Text>
      </View>

      {posts.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              borderColor: glow,
              backgroundColor: `${palette.surface}A6`,
            },
          ]}
        >
          <Text style={[styles.emptyText, { color: palette.muted }]}>
            {feedMessage}
          </Text>
        </View>
      ) : (
        <View style={styles.feedGrid}>
          {posts.map((post, index) => {
            const fullWidth = index % 3 === 2;
            const author =
              post.author?.display_name ||
              post.author?.username ||
              'BRITUME member';

            return (
              <Pressable
                key={post.id}
                onPress={() => openPostAuthor(post)}
                style={[
                  styles.postCard,
                  fullWidth ? styles.fullPost : styles.halfPost,
                  {
                    borderColor: `${glow}CC`,
                    backgroundColor: `${palette.surface}A6`,
                    shadowColor: glow,
                  },
                ]}
              >
                <Text style={[styles.postAuthor, { color: glow }]}>
                  {author}
                </Text>
                <Text
                  numberOfLines={fullWidth ? 8 : 5}
                  style={[styles.postBody, { color: palette.text }]}
                >
                  {post.body}
                </Text>
                <Text style={[styles.postFooter, { color: palette.muted }]}>
                  BRITUME · Post
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Existing app navigation remains managed by the app navigator. */}
      <View style={[styles.noteCard, { borderColor: palette.border }]}>
        <Text style={[styles.noteText, { color: palette.muted }]}>
          Your existing BRITUME navigation and saved themes remain in place.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 32,
  },
  eyesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 18,
  },
  eyeGlow: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.75,
    shadowRadius: 10,
    elevation: 4,
  },
  eye: {
    width: 30,
    height: 30,
    borderWidth: 1.5,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 3,
  },
  colorButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 12,
  },
  cycleText: { fontSize: 11, fontWeight: '600' },
  shortcutRow: {
    gap: 9,
    paddingVertical: 18,
  },
  shortcut: {
    width: 78,
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 7,
  },
  shortcutIcon: { fontSize: 22, marginBottom: 5 },
  shortcutLabel: { fontSize: 10, fontWeight: '700' },
  feedHeading: { marginTop: 4, marginBottom: 12 },
  feedTitle: { fontSize: 21, fontWeight: '800' },
  feedCaption: { fontSize: 12, marginTop: 3 },
  feedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  postCard: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 13,
    shadowOpacity: 0.18,
    shadowRadius: 9,
    elevation: 3,
  },
  halfPost: { width: '48%' },
  fullPost: { width: '100%' },
  postAuthor: { fontSize: 12, fontWeight: '800', marginBottom: 9 },
  postBody: { fontSize: 14, lineHeight: 20 },
  postFooter: { fontSize: 10, marginTop: 14 },
  emptyCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  emptyText: { fontSize: 13, lineHeight: 20 },
  noteCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 22,
  },
  noteText: { fontSize: 11, lineHeight: 17 },
});
