import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types — Normalized profile schema

/** Lean identity (profiles table) */
export interface Profile {
  id: string;
  email: string;
  name: string;
  role: "user";
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

/** Preferences & social info (user_preferences table) */
export interface UserPreferences {
  user_id: string;

  location?: string;

  favorite_genre?: string;
  favorite_genres?: string[];
  reading_goal?: number;
  reading_goal_yearly?: number;
  theme?: string;
  reading_mode?: string;
  email_notifications?: boolean;
  push_notifications?: boolean;
}
/** Sensitive / internal (user_private table) */
export interface UserPrivate {
  user_id: string;
  phone_number?: string;

  banned: boolean;
  deleted_at?: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  description?: string;
  release_date?: string;
  cover_url?: string;
  pdf_url?: string; // PDF file URL
  isbn?: string;
  pages?: number;
  publisher?: string;
  language?: string;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  series?: string;
  series_order?: number;
  academic_subject?: string;
  is_textbook?: boolean;
}

export interface Review {
  id: string;
  book_id: string;
  user_id: string;
  content: string;
  flagged: boolean;
  flagged_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface BookLike {
  id: string;
  book_id: string;
  user_id: string;
  created_at: string;
}

export interface Rating {
  id: string;
  book_id: string;
  user_id: string;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface BookComment {
  id: string;
  book_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action_type: "like" | "rate" | "comment" | "review" | "add_to_list";
  book_id?: string;
  metadata?: any;
  created_at: string;
}

// Helper functions
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data as Profile;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function checkUserExists(email: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("email")
    .eq("email", email)
    .single();

  return { exists: !!data, error };
}
