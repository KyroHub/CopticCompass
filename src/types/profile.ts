import type { Tables } from "@/types/supabase";

export type ProfileRow = Tables<"profiles">;
export type ProfileRole = ProfileRow["role"];
