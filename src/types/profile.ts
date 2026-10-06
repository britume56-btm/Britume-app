export type ProfileRecord = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
  /** Read-only fallback for rows that have not yet had the legacy migration applied. */
  avatar_url?: string | null;
  phone: string | null;
  created_at?: string;
  updated_at?: string;
};
