import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdSlot } from '../../components/monetization/MonetizationSlots';
import { useAppTheme } from '../../theme/AppThemeContext';

type GameEntry = {
  id: string;
  title: string;
  description: string;
  status: 'ready' | 'coming_soon';
};

// Add approved games here; an empty catalogue is intentional until a real game is shipped.
const GAMES: GameEntry[] = [];

export default function GamesScreen() {
  const { palette } = useAppTheme();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.background }]}>
      <Text style={[styles.kicker, { color: palette.accent }]}>BRITUME • PLAY</Text>
      <Text style={[styles.title, { color: palette.text }]}>Games</Text>
      <Text style={[styles.body, { color: palette.muted }]}>
        A small catalogue for BRITUME games. New games can be added without changing the rest of
        the app.
      </Text>

      {GAMES.length ? (
        <View style={styles.grid}>
          {GAMES.map((game) => (
            <View
              key={game.id}
              style={[styles.gameCard, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Text style={[styles.gameTitle, { color: palette.text }]}>{game.title}</Text>
              <Text style={[styles.muted, { color: palette.muted }]}>{game.description}</Text>
              <Text style={[styles.status, { color: palette.accent }]}>{game.status.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.empty, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Text style={[styles.emptyIcon, { color: palette.accent }]}>◉</Text>
          <Text style={[styles.gameTitle, { color: palette.text }]}>The game shelf is ready</Text>
          <Text style={[styles.muted, { color: palette.muted }]}>
            No games are published yet. A selected game’s details and play view will appear here
            when the first game is added.
          </Text>
        </View>
      )}

      <View style={[styles.playArea, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={[styles.gameTitle, { color: palette.text }]}>Game details &amp; play area</Text>
        <Text style={[styles.muted, { color: palette.muted }]}>
          Choose a game from the catalogue to see its description and launch it.
        </Text>
      </View>
      <AdSlot label="Games sponsor slot" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 36 },
  kicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.6, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gameCard: { borderRadius: 14, borderWidth: 1, minHeight: 120, padding: 14, width: '48%' },
  empty: { alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 22 },
  emptyIcon: { fontSize: 28, marginBottom: 10 },
  gameTitle: { fontSize: 16, fontWeight: '800' },
  muted: { fontSize: 13, lineHeight: 20, marginTop: 7 },
  status: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 12 },
  playArea: { borderRadius: 14, borderWidth: 1, marginTop: 14, minHeight: 110, padding: 15 },
});
