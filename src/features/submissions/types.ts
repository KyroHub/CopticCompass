import type { Tables, TablesInsert, TablesUpdate } from "@/types/supabase";

/**
 * Submission and profile row aliases shared by submission queries, actions, and
 * admin review screens.
 */
export type SubmissionRow = Tables<"submissions">;
export type SubmissionInsert = TablesInsert<"submissions">;
export type SubmissionUpdate = TablesUpdate<"submissions">;

type _SubmissionStatus = SubmissionRow["status"];

export type AdminSubmission = SubmissionRow & {
  studentEmail: string | null;
};
