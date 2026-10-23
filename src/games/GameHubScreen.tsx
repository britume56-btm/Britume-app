import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 3;

const CATEGORIES = ['ALL', 'BOARD', 'CARDS', 'RACING', '3D', 'PUZZLE', 'ACTION'] as const;

interface GameItem {
  id: string;
  name: string;
  category: typeof CATEGORIES[number];
  icon: string;
  bestScore: number;
  onlinePlayers: number;
}

const ALL_GAMES: GameItem[] = [
  { id: 'ChessGame', name: 'Chess', category: 'BOARD', icon: '♟️', bestScore: 1200, onlinePlayers: 142 },
  { id: 'EightBallPool', name: '8-Ball Pool', category: '3D', icon: '🎱', bestScore: 450, onlinePlayers: 512 },
  { id: 'CarRacing3D', name: 'Car Racing', category: '3D', icon: '🏎️', bestScore: 9420, onlinePlayers: 310 },
  { id: 'CircuitConnect', name: 'Circuit Connect', category: 'PUZZLE', icon: '⚡', bestScore: 45, onlinePlayers: 89 },
  { id: 'StickmanFight', name: 'Stickman Fight', category: 'ACTION', icon: '🤼', bestScore: 2300, onlinePlayers: 654 },
  { id: 'Football3D', name: 'Football 3D', category: '3D', icon: '⚽', bestScore: 12, onlinePlayers: 420 },
  { id: 'Poker', name: 'Poker', category: 'CARDS', icon: '🃏', bestScore: 5000, onlinePlayers: 215 },
  { id: 'Uno', name: 'Uno', category: 'CARDS', icon: '🎴', bestScore: 820, onlinePlayers: 190 },
  { id: 'Solitaire', name: 'Solitaire', category: 'CARDS', icon: '🀄', bestScore: 610, onlinePlayers: 45 },
  { id: 'BikeRacing', name: 'Bike Racing', category: 'RACING', icon: '🏍️', bestScore: 4890, onlinePlayers: 112 },
  { id: 'KartRacing', name: 'Kart Racing', category: 'RACING', icon: '🏎️', bestScore: 5200, onlinePlayers: 94 },
  { id: 'Sudoku', name: 'Sudoku', category: 'PUZZLE', icon: '🔢', bestScore: 180, onlinePlayers: 73 },
  { id: '2048', name: '2048', category: 'PUZZLE', icon: '🧮', bestScore: 20480, onlinePlayers: 156 },
  { id: 'CookingGame', name: 'Cooking Mama', category: 'ACTION', icon: '🍳', bestScore: 95, onlinePlayers: 88 },
  { id: 'Ludo', name: 'Ludo', category: 'BOARD', icon: '🎲', bestScore: 400, onlinePlayers: 312 },
  { id: 'Checkers', name: 'Checkers', category: 'BOARD', icon: '🏁', bestScore: 350, onlinePlayers: 42 },
  { id: 'Snake', name: 'Snake', category: 'ACTION', icon: '🐍', bestScore: 120, onlinePlayers: 67 },
  { id: 'Tetris', name: 'Tetris', category: 'PUZZLE', icon: '🧱', bestScore: 45000, onlinePlayers: 110 },
  { id: 'BubbleShooter', name: 'Bubbles', category: 'PUZZLE', icon: '🔮', bestScore: 8900, onlinePlayers: 240 },
  { id: 'Bowling', name: 'Bowling', category: '3D', icon: '🎳', bestScore: 300, onlinePlayers: 54 },
  { id: 'AirHockey', name: 'Air Hockey', category: 'ACTION', icon: '🏓', bestScore: 15, onlinePlayers: 83 },
  { id: 'Golf3D', name: 'Golf 3D', category: '3D', icon: '⛳', bestScore: -4, onlinePlayers: 29 },
  { id: 'Basketball', name: 'Basketball', category: '3D', icon: '🏀', bestScore: 88, onlinePlayers: 147 },
  { id: 'Boxing', name: 'Boxing', category: 'ACTION', icon: '🥊', bestScore: 3400, onlinePlayers: 198 },
  { id: 'FruitNinja', name: 'Fruit Slice', category: 'ACTION', icon: '🍉', bestScore: 450, onlinePlayers: 320 },
  { id: 'Maze', name: 'Maze Run', category: 'PUZZLE', icon: '🕸️', bestScore: 55, onlinePlayers: 38 },
  { id: 'CarParking', name: 'Car Parking', category: 'PUZZLE', icon: '🅿️', bestScore: 120, onlinePlayers: 92 },
  { id: 'BuildBridge', name: 'Bridge Build', category: 'PUZZLE', icon: '🌉', bestScore: 75, onlinePlayers: 41 },
  { id: 'TicTacToe', name: 'Tic Tac Toe', category: 'BOARD', icon: '❌', bestScore: 100, onlinePlayers: 300 },
  { id: 'Dominoes', name: 'Dominoes', category: 'BOARD', icon: '🂾', bestScore: 250, onlinePlayers: 84 },
];

export default function GameHubScreen({ navigation }: any) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>('ALL');

  const filteredGames = ALL_GAMES.filter((game) => {
    const matchesSearch = game.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'ALL' || game.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brand}>BRITUME GAMES</Text>
        <TextInput
          style={styles.searchBar}
          placeholder="Search matches..."
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.categoryWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryContainer}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat}
              style={[styles.categoryBtn, activeCategory === cat && styles.categoryBtnActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.gridContainer}>
        <View style={styles.grid}>
          {filteredGames.map((game) => (
            <Pressable
              key={game.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => navigation.navigate(game.id)}
            >
              <Text style={styles.gameIcon}>{game.icon}</Text>
              <Text style={styles.gameName} numberOfLines={1}>{game.name}</Text>
              <Text style={styles.gameMeta}>🏆 {game.bestScore}</Text>
              <Text style={styles.gameOnline}>🟢 {game.onlinePlayers}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#EAEAEA' },
  brand: { fontSize: 14, fontWeight: '900', letterSpacing: 2, color: '#333', marginBottom: 12 },
  searchBar: { height: 40, backgroundColor: '#F0F2F5', borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: '#333' },
  categoryWrapper: { height: 50, borderBottomWidth: 1, borderColor: '#EAEAEA', backgroundColor: '#FFF' },
  categoryContainer: { paddingHorizontal: 12, alignItems: 'center' },
  categoryBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginRight: 8, backgroundColor: '#F0F2F5' },
  categoryBtnActive: { backgroundColor: '#333' },
  categoryText: { fontSize: 12, fontWeight: '700', color: '#666' },
  categoryTextActive: { color: '#FFF' },
  gridContainer: { padding: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: CARD_WIDTH, backgroundColor: '#FFF', borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EAEAEA' },
  cardPressed: { opacity: 0.7 },
  gameIcon: { fontSize: 28, marginBottom: 4 },
  gameName: { fontSize: 11, fontWeight: '800', color: '#333', marginBottom: 2 },
  gameMeta: { fontSize: 9, color: '#666', fontWeight: '600' },
  gameOnline: { fontSize: 8, color: '#4CD964', marginTop: 2, fontWeight: '700' },
});
