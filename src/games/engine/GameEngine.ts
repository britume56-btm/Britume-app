import { supabase } from '../../../lib/supabase';

export interface ScoreEntry {
  user_id: string;
  game_name: string;
  score: number;
}

export const GameEngine = {
  async saveScore(gameName: string, score: number): Promise<boolean> {
    if (!gameName.trim() || !Number.isFinite(score)) return false;
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return false;
      const { error } = await supabase
        .from('game_scores')
        .insert({ user_id: user.id, game_name: gameName.trim(), score });
      return !error;
    } catch {
      return false;
    }
  },

  async getHighScores(gameName: string, limit = 10): Promise<ScoreEntry[]> {
    if (!gameName.trim()) return [];
    const safeLimit = Math.max(1, Math.min(Math.floor(limit), 100));
    try {
      const { data, error } = await supabase
        .from('game_scores')
        .select('user_id, game_name, score')
        .eq('game_name', gameName.trim())
        .order('score', { ascending: false })
        .limit(safeLimit);
      return error ? [] : (data ?? []) as ScoreEntry[];
    } catch {
      return [];
    }
  },
};
