import React, { useEffect, useRef, useState } from 'react';
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
author_id: string;
body: string;
created_at?: string;
author?: {
id?: string;
username?: string | null;
display_name?: string | null;
};
};

function addHexOpacity(color: string, opacity: number): string {
const normalized = color.trim();

if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
const alpha = Math.round(Math.max(0, Math.min(100, opacity)) * 2.55)
.toString(16)
.padStart(2, '0');

return `${normalized}${alpha}`;

}

// Preserve valid theme colours if they are not six-digit hex colours.
return normalized;
}

export default function HomeScreen({ navigation }: any) {
const { palette } = useAppTheme();

const [colorIndex, setColorIndex] = useState(0);
const [autoCycle, setAutoCycle] = useState(true);
const [cycleSeconds, setCycleSeconds] = useState(10);
const [blinkSeconds, setBlinkSeconds] = useState(1.6);
const [glowStrength, setGlowStrength] = useState(75);
const [glassOpacity, setGlassOpacity] = useState(65);
const [showControls, setShowControls] = useState(false);
const [reducedMotion, setReducedMotion] = useState(false);
const [posts, setPosts] = useState<LivingPost[]>([]);
const [feedMessage, setFeedMessage] = useState(
'Loading BRITUME posts...'
);

const blinkScale = useRef(new Animated.Value(1)).current;
const glow = NEON_COLORS[colorIndex];
const glowOpacity = glowStrength / 100;

const glassBackground = addHexOpacity(
palette.surface,
glassOpacity
);

useEffect(() => {
let active = true;

AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    if (active) {
      setReducedMotion(enabled);
    }
  })
  .catch(() => {});

const subscription = AccessibilityInfo.addEventListener(
  'reduceMotionChanged',
  setReducedMotion
);

return () => {
  active = false;
  subscription.remove();
};

}, []);

// Cycle through the six neon colours.
useEffect(() => {
if (!autoCycle || reducedMotion) {
return;
}

const timer = setInterval(() => {
  setColorIndex((current) => (current + 1) % NEON_COLORS.length);
}, cycleSeconds * 1000);

return () => clearInterval(timer);

}, [autoCycle, cycleSeconds, reducedMotion]);

// Blink gently, respecting the device's reduced-motion preference.
useEffect(() => {
if (reducedMotion) {
blinkScale.stopAnimation();
blinkScale.setValue(1);
return;
}

const timer = setInterval(() => {
  Animated.sequence([
    Animated.timing(blinkScale, {
      toValue: 0.08,
      duration: 90,
      useNativeDriver: true,
    }),
    Animated.delay(100),
    Animated.timing(blinkScale, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }),
  ]).start();
}, blinkSeconds * 1000);

return () => {
  clearInterval(timer);
  blinkScale.stopAnimation();
  blinkScale.setValue(1);
};

}, [blinkScale, blinkSeconds, reducedMotion]);

// Load the signed-in user's existing BRITUME feed.
useEffect(() => {
let active = true;

async function loadFeed() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!data.user) {
      if (active) {
        setPosts([]);
        setFeedMessage('Sign in to see your BRITUME feed.');
      }
      return;
    }

    const result = await listFeed(data.user.id);

    if (active) {
      setPosts(result);
      setFeedMessage(
        result.length
          ? ''
          : 'No posts yet. Be the first to share something!'
      );
    }
  } catch {
    if (active) {
      setPosts([]);
      setFeedMessage(
        'Your feed could not load. Check your connection and try again.'
      );
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
return;
}

if (route === 'TECHNOLOGIES') {
  navigation.navigate('Module', { section: 'TECHNOLOGIES' });
  return;
}

if (route === 'SPACE1' || route === 'SPACE2') {
  setShowControls(true);
  return;
}

if (route === 'AI' || route === 'DIARY' || route === 'LIBRARY') {
  setFeedMessage(
    `${route} needs its own screen before this shortcut can open it.`
  );
}

}

function openPostAuthor(post: LivingPost) {
if (!post.author_id) {
return;
}

navigation.navigate('PublicProfile', {
  userId: post.author_id,
});

}

return (
<ScrollView
style={[
styles.screen,
{ backgroundColor: palette.background },
]}
contentContainerStyle={styles.content}
>
{/* Ambient neon lighting */}
<View
pointerEvents="none"
style={[
styles.ambientLight,
{
backgroundColor: addHexOpacity(glow, 9),
opacity: glowOpacity,
},
]}
/>

  {/* BRITUME neon eyes */}
  <View style={styles.eyesRow}>
    {[0, 1].map((eye) => (
      <View
        key={eye}
        style={[
          styles.eyeGlow,
          {
            borderColor: glow,
            shadowColor: glow,
            shadowOpacity: glowOpacity,
            backgroundColor: addHexOpacity(glow, 13),
          },
        ]}
      >
        <Animated.View
          style={[
            styles.eye,
            {
              borderColor: glow,
              transform: [{ scaleY: blinkScale }],
            },
          ]}
        >
          <View
            style={[
              styles.pupil,
              { backgroundColor: glow },
            ]}
          />
        </Animated.View>
      </View>
    ))}
  </View>

  {/* Brand heading */}
  <View style={styles.headingRow}>
    <View>
      <Text style={[styles.brand, { color: glow }]}>
        BRITUME
      </Text>
      <Text style={[styles.subtitle, { color: palette.muted }]}>
        See Beyond. Move Forward.
      </Text>
    </View>

    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open Living glass theme controls"
      onPress={() => setShowControls((value) => !value)}
      style={[
        styles.colorButton,
        { borderColor: glow },
      ]}
    >
      <Text style={{ color: glow, fontSize: 22 }}>✦</Text>
    </Pressable>
  </View>

  {/* Automatic colour cycling */}
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={
      autoCycle ? 'Pause neon colour cycling' : 'Resume neon colour cycling'
    }
    onPress={() => setAutoCycle((value) => !value)}
    style={[
      styles.cycleButton,
      { borderColor: glow },
    ]}
  >
    <Text style={[styles.cycleText, { color: palette.text }]}>
      Neon: {autoCycle ? `Auto · ${cycleSeconds}s` : 'Paused'}
      {'  '}· Tap to {autoCycle ? 'pause' : 'resume'}
    </Text>
  </Pressable>

  {/* Theme controls */}
  {showControls && (
    <View
      style={[
        styles.controlCard,
        {
          backgroundColor: glassBackground,
          borderColor: glow,
        },
      ]}
    >
      <Text style={[styles.controlTitle, { color: palette.text }]}>
        Living Glass Settings
      </Text>

      <Text style={[styles.controlLabel, { color: palette.muted }]}>
        Neon colour
      </Text>

      <View style={styles.colourChoices}>
        {NEON_COLORS.map((colour, index) => (
          <Pressable
            key={colour}
            accessibilityRole="button"
            accessibilityLabel={`Select neon colour ${index + 1}`}
            accessibilityState={{ selected: index === colorIndex }}
            onPress={() => {
              setColorIndex(index);
              setAutoCycle(false);
            }}
            style={[
              styles.colourDot,
              {
                backgroundColor: colour,
                borderColor:
                  index === colorIndex ? palette.text : colour,
                borderWidth: index === colorIndex ? 3 : 1,
              },
            ]}
          />
        ))}
      </View>

      <Text style={[styles.controlLabel, { color: palette.text }]}>
        Glow strength: {glowStrength}%
      </Text>

      <View style={styles.adjustRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decrease glow strength"
          onPress={() =>
            setGlowStrength((value) => Math.max(0, value - 5))
          }
          style={[styles.adjustButton, { borderColor: glow }]}
        >
          <Text style={{ color: palette.text }}>−</Text>
        </Pressable>

        <View style={styles.adjustValue}>
          <View
            style={[
              styles.adjustBar,
              {
                width: `${glowStrength}%`,
                backgroundColor: glow,
              },
            ]}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Increase glow strength"
          onPress={() =>
            setGlowStrength((value) => Math.min(100, value + 5))
          }
          style={[styles.adjustButton, { borderColor: glow }]}
        >
          <Text style={{ color: palette.text }}>＋</Text>
        </Pressable>
      </View>

      <Text style={[styles.controlLabel, { color: palette.text }]}>
        Glass opacity: {glassOpacity}%
      </Text>

      <View style={styles.adjustRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Decrease glass opacity"
          onPress={() =>
            setGlassOpacity((value) => Math.max(20, value - 5))
          }
          style={[styles.adjustButton, { borderColor: glow }]}
        >
          <Text style={{ color: palette.text }}>−</Text>
        </Pressable>

        <View style={styles.adjustValue}>
          <View
            style={[
              styles.adjustBar,
              {
                width: `${glassOpacity}%`,
                backgroundColor: glow,
              },
            ]}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Increase glass opacity"
          onPress={() =>
            setGlassOpacity((value) => Math.min(100, value + 5))
          }
          style={[styles.adjustButton, { borderColor: glow }]}
        >
          <Text style={{ color: palette.text }}>＋</Text>
        </Pressable>
      </View>

      <Text style={[styles.controlLabel, { color: palette.text }]}>
        Colour cycle interval
      </Text>

      <View style={styles.optionRow}>
        {[5, 10, 15, 20].map((seconds) => (
          <Pressable
            key={seconds}
            accessibilityRole="button"
            accessibilityState={{ selected: cycleSeconds === seconds }}
            onPress={() => setCycleSeconds(seconds)}
            style={[
              styles.optionButton,
              {
                borderColor: glow,
                backgroundColor:
                  cycleSeconds === seconds
                    ? addHexOpacity(glow, 21)
                    : 'transparent',
              },
            ]}
          >
            <Text style={{ color: palette.text }}>{seconds}s</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.controlLabel, { color: palette.text }]}>
        Eye blink interval
      </Text>

      <View style={styles.optionRow}>
        {[1.3, 1.6, 2, 3].map((seconds) => (
          <Pressable
            key={seconds}
            accessibilityRole="button"
            accessibilityState={{ selected: blinkSeconds === seconds }}
            onPress={() => setBlinkSeconds(seconds)}
            style={[
              styles.optionButton,
              {
                borderColor: glow,
                backgroundColor:
                  blinkSeconds === seconds
                    ? addHexOpacity(glow, 21)
                    : 'transparent',
              },
            ]}
          >
            <Text style={{ color: palette.text }}>{seconds}s</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )}

  {/* Eight shortcuts */}
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.shortcutRow}
  >
    {SHORTCUTS.map((item) => (
      <Pressable
        key={item.label}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.label}`}
        onPress={() => openShortcut(item.route)}
        style={({ pressed }) => [
          styles.shortcut,
          {
            borderColor: glow,
            shadowColor: glow,
            shadowOpacity: glowOpacity * 0.35,
            backgroundColor: addHexOpacity(glow, glassOpacity * 0.45),
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Text style={styles.shortcutIcon}>{item.icon}</Text>
        <Text
          numberOfLines={1}
          style={[
            styles.shortcutLabel,
            { color: palette.text },
          ]}
        >
          {item.label}
        </Text>
      </Pressable>
    ))}
  </ScrollView>

  {/* Existing Supabase feed */}
  <View style={styles.feedHeading}>
    <Text style={[styles.feedTitle, { color: palette.text }]}>
      Your Living Feed
    </Text>
    <Text style={[styles.feedCaption, { color: palette.muted }]}>
      Posts from your BRITUME network
    </Text>
  </View>

  {posts.length === 0 ? (
    <View
      style={[
        styles.emptyCard,
        {
          borderColor: glow,
          backgroundColor: glassBackground,
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
            accessibilityRole="button"
            accessibilityLabel={`Open ${author}'s profile`}
            onPress={() => openPostAuthor(post)}
            style={[
              styles.postCard,
              fullWidth ? styles.fullPost : styles.halfPost,
              {
                borderColor: addHexOpacity(glow, 80),
                backgroundColor: glassBackground,
                shadowColor: glow,
                shadowOpacity: glowOpacity * 0.25,
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

  <View style={[styles.noteCard, { borderColor: palette.border }]}>
    <Text style={[styles.noteText, { color: palette.muted }]}>
      Your existing BRITUME account, social feed and theme system are
      retained. AI, Diary, Library and custom shortcut destinations
      still need their own screen implementations.
    </Text>
  </View>
</ScrollView>

);
}

const styles = StyleSheet.create({
screen: {
flex: 1,
},
content: {
paddingHorizontal: 14,
paddingTop: 14,
paddingBottom: 32,
},
ambientLight: {
position: 'absolute',
top: 0,
left: 0,
right: 0,
height: 220,
borderBottomLeftRadius: 120,
borderBottomRightRadius: 120,
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
cycleText: {
fontSize: 11,
fontWeight: '600',
},
controlCard: {
borderWidth: 1,
borderRadius: 18,
padding: 14,
marginTop: 14,
},
controlTitle: {
fontSize: 16,
fontWeight: '800',
marginBottom: 12,
},
controlLabel: {
fontSize: 12,
fontWeight: '600',
marginTop: 10,
marginBottom: 7,
},
colourChoices: {
flexDirection: 'row',
gap: 12,
flexWrap: 'wrap',
},
colourDot: {
width: 30,
height: 30,
borderRadius: 15,
},
adjustRow: {
flexDirection: 'row',
alignItems: 'center',
gap: 10,
},
adjustButton: {
width: 34,
height: 34,
borderWidth: 1,
borderRadius: 10,
alignItems: 'center',
justifyContent: 'center',
},
adjustValue: {
flex: 1,
height: 8,
borderRadius: 4,
overflow: 'hidden',
backgroundColor: '#77777735',
},
adjustBar: {
height: 8,
borderRadius: 4,
},
optionRow: {
flexDirection: 'row',
gap: 8,
flexWrap: 'wrap',
},
optionButton: {
borderWidth: 1,
borderRadius: 10,
paddingHorizontal: 12,
paddingVertical: 8,
},
shortcutRow: {
gap: 9,
paddingVertical: 18,
},
shortcut: {
width: 82,
minHeight: 78,
borderWidth: 1,
borderRadius: 14,
alignItems: 'center',
justifyContent: 'center',
padding: 7,
shadowRadius: 7,
elevation: 2,
},
shortcutIcon: {
fontSize: 22,
marginBottom: 5,
},
shortcutLabel: {
fontSize: 10,
fontWeight: '700',
},
feedHeading: {
marginTop: 4,
marginBottom: 12,
},
feedTitle: {
fontSize: 21,
fontWeight: '800',
},
feedCaption: {
fontSize: 12,
marginTop: 3,
},
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
shadowRadius: 9,
elevation: 3,
},
halfPost: {
width: '48%',
},
fullPost: {
width: '100%',
},
postAuthor: {
fontSize: 12,
fontWeight: '800',
marginBottom: 9,
},
postBody: {
fontSize: 14,
lineHeight: 20,
},
postFooter: {
fontSize: 10,
marginTop: 14,
},
emptyCard: {
borderWidth: 1,
borderRadius: 16,
padding: 18,
},
emptyText: {
fontSize: 13,
lineHeight: 20,
},
noteCard: {
borderWidth: 1,
borderRadius: 14,
padding: 12,
marginTop: 22,
},
noteText: {
fontSize: 11,
lineHeight: 17,
},
});
