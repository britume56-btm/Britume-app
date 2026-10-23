import { createClient } from '@supabase/supabase-base'; // Adjust to your relative path import

// Mock client instantiation fallback if your paths differ
const supabase = (global as any).supabase || {};

export interface ScoreEntry {
  user_id: string;
  game_name: string;
  score: number;
}

export const GameEngine = {
  saveScore: async (gameName: string, score: number): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('game_scores')
        .insert([{ user_id: user.id, game_name: gameName, score }]);

      return !error;
    } catch {
      return false;
    }
  },

  getHighScores: async (gameName: string, limit = 10) => {
    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select('*')
        .eq('game_name', gameName)
        .order('score', { ascending: false })
        .limit(limit);
      return error ? [] : data;
    } catch {
      return [];
    }
  }
};
