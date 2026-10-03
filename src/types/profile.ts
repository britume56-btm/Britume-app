export type ProfileRecord = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  created_at?: string;
  updated_at?: string;
};
