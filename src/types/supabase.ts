/**
 * Generated Supabase database types used throughout the app for typed row and
 * insert/update helpers.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      entry_favorites: {
        Row: {
          created_at: string;
          entry_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entry_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          entry_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "entry_favorites_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      entry_reports: {
        Row: {
          commentary: string;
          created_at: string;
          entry_headword: string;
          entry_id: string;
          id: string;
          reason: "grammar" | "other" | "relation" | "translation" | "typo";
          status: "dismissed" | "open" | "resolved" | "reviewed";
          user_id: string;
        };
        Insert: {
          commentary: string;
          created_at?: string;
          entry_headword: string;
          entry_id: string;
          id?: string;
          reason: "grammar" | "other" | "relation" | "translation" | "typo";
          status?: "dismissed" | "open" | "resolved" | "reviewed";
          user_id: string;
        };
        Update: {
          commentary?: string;
          created_at?: string;
          entry_headword?: string;
          entry_id?: string;
          id?: string;
          reason?: "grammar" | "other" | "relation" | "translation" | "typo";
          status?: "dismissed" | "open" | "resolved" | "reviewed";
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "entry_reports_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          inquiry_type: string;
          locale: "en" | "nl";
          message: string;
          name: string;
          responded_at: string | null;
          status: "answered" | "archived" | "in_progress" | "new";
          wants_updates: boolean;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          inquiry_type: string;
          locale: "en" | "nl";
          message: string;
          name: string;
          responded_at?: string | null;
          status?: "answered" | "archived" | "in_progress" | "new";
          wants_updates?: boolean;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          inquiry_type?: string;
          locale?: "en" | "nl";
          message?: string;
          name?: string;
          responded_at?: string | null;
          status?: "answered" | "archived" | "in_progress" | "new";
          wants_updates?: boolean;
        };
        Relationships: [];
      };
      chat_feedback_events: {
        Row: {
          assistant_message_id: string | null;
          assistant_response_text: string;
          chat_id: string | null;
          created_at: string;
          feedback_text: string | null;
          id: string;
          inference_provider: "gemini" | "hf" | "openrouter";
          is_admin_feedback: boolean;
          page_excerpt: string | null;
          page_path: string | null;
          page_title: string | null;
          page_url: string | null;
          prompt_text: string;
          signal: "admin_feedback" | "dislike" | "like";
          user_id: string;
          user_message_id: string | null;
        };
        Insert: {
          assistant_message_id?: string | null;
          assistant_response_text: string;
          chat_id?: string | null;
          created_at?: string;
          feedback_text?: string | null;
          id?: string;
          inference_provider: "gemini" | "hf" | "openrouter";
          is_admin_feedback?: boolean;
          page_excerpt?: string | null;
          page_path?: string | null;
          page_title?: string | null;
          page_url?: string | null;
          prompt_text: string;
          signal: "admin_feedback" | "dislike" | "like";
          user_id: string;
          user_message_id?: string | null;
        };
        Update: {
          assistant_message_id?: string | null;
          assistant_response_text?: string;
          chat_id?: string | null;
          created_at?: string;
          feedback_text?: string | null;
          id?: string;
          inference_provider?: "gemini" | "hf" | "openrouter";
          is_admin_feedback?: boolean;
          page_excerpt?: string | null;
          page_path?: string | null;
          page_title?: string | null;
          page_url?: string | null;
          prompt_text?: string;
          signal?: "admin_feedback" | "dislike" | "like";
          user_id?: string;
          user_message_id?: string | null;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "chat_feedback_events_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      coptic_documents: {
        Row: {
          content: string;
          embedding: string | null;
          id: number;
          metadata: Json | null;
        };
        Insert: {
          content: string;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Update: {
          content?: string;
          embedding?: string | null;
          id?: number;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      notification_events: {
        Row: {
          aggregate_id: string;
          aggregate_type: string;
          channel: "email";
          created_at: string;
          dedupe_key: string | null;
          event_type: string;
          id: string;
          last_error: string | null;
          payload: Json;
          processed_at: string | null;
          recipient: string;
          status: "failed" | "queued" | "sent";
          subject: string;
        };
        Insert: {
          aggregate_id: string;
          aggregate_type: string;
          channel?: "email";
          created_at?: string;
          dedupe_key?: string | null;
          event_type: string;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          processed_at?: string | null;
          recipient: string;
          status?: "failed" | "queued" | "sent";
          subject: string;
        };
        Update: {
          aggregate_id?: string;
          aggregate_type?: string;
          channel?: "email";
          created_at?: string;
          dedupe_key?: string | null;
          event_type?: string;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          processed_at?: string | null;
          recipient?: string;
          status?: "failed" | "queued" | "sent";
          subject?: string;
        };
        Relationships: [];
      };
      notification_deliveries: {
        Row: {
          channel: "email";
          created_at: string;
          error: string | null;
          event_id: string;
          id: string;
          provider_message_id: string | null;
          recipient: string;
          status: "failed" | "sent";
        };
        Insert: {
          channel?: "email";
          created_at?: string;
          error?: string | null;
          event_id: string;
          id?: string;
          provider_message_id?: string | null;
          recipient: string;
          status: "failed" | "sent";
        };
        Update: {
          channel?: "email";
          created_at?: string;
          error?: string | null;
          event_id?: string;
          id?: string;
          provider_message_id?: string | null;
          recipient?: string;
          status?: "failed" | "sent";
        };
        Relationships: [
          {
            columns: ["event_id"];
            foreignKeyName: "notification_deliveries_event_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "notification_events";
          },
        ];
      };
      notification_email_jobs: {
        Row: {
          bcc_recipients: string[];
          cc_recipients: string[];
          created_at: string;
          from_email: string | null;
          html_body: string | null;
          id: string;
          last_error: string | null;
          notification_event_id: string;
          processed_at: string | null;
          reply_to_recipients: string[];
          status: "failed" | "processing" | "queued" | "sent";
          subject: string;
          text_body: string;
          to_recipients: string[];
        };
        Insert: {
          bcc_recipients?: string[];
          cc_recipients?: string[];
          created_at?: string;
          from_email?: string | null;
          html_body?: string | null;
          id?: string;
          last_error?: string | null;
          notification_event_id: string;
          processed_at?: string | null;
          reply_to_recipients?: string[];
          status?: "failed" | "processing" | "queued" | "sent";
          subject: string;
          text_body: string;
          to_recipients: string[];
        };
        Update: {
          bcc_recipients?: string[];
          cc_recipients?: string[];
          created_at?: string;
          from_email?: string | null;
          html_body?: string | null;
          id?: string;
          last_error?: string | null;
          notification_event_id?: string;
          processed_at?: string | null;
          reply_to_recipients?: string[];
          status?: "failed" | "processing" | "queued" | "sent";
          subject?: string;
          text_body?: string;
          to_recipients?: string[];
        };
        Relationships: [
          {
            columns: ["notification_event_id"];
            foreignKeyName: "notification_email_jobs_notification_event_id_fkey";
            isOneToOne: true;
            referencedColumns: ["id"];
            referencedRelation: "notification_events";
          },
        ];
      };
      audience_contacts: {
        Row: {
          books_opt_in: boolean;
          consented_at: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          general_updates_opt_in: boolean;
          id: string;
          lessons_opt_in: boolean;
          locale: "en" | "nl";
          profile_id: string | null;
          source: "contact_form" | "dashboard" | "signup";
          unsubscribed_at: string | null;
          updated_at: string;
        };
        Insert: {
          books_opt_in?: boolean;
          consented_at?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          general_updates_opt_in?: boolean;
          id?: string;
          lessons_opt_in?: boolean;
          locale?: "en" | "nl";
          profile_id?: string | null;
          source: "contact_form" | "dashboard" | "signup";
          unsubscribed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          books_opt_in?: boolean;
          consented_at?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          general_updates_opt_in?: boolean;
          id?: string;
          lessons_opt_in?: boolean;
          locale?: "en" | "nl";
          profile_id?: string | null;
          source?: "contact_form" | "dashboard" | "signup";
          unsubscribed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ["profile_id"];
            foreignKeyName: "audience_contacts_profile_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      audience_contact_sync_state: {
        Row: {
          audience_contact_id: string;
          created_at: string;
          last_error: string | null;
          last_synced_at: string | null;
          provider: "resend";
          provider_contact_id: string | null;
          updated_at: string;
        };
        Insert: {
          audience_contact_id: string;
          created_at?: string;
          last_error?: string | null;
          last_synced_at?: string | null;
          provider?: "resend";
          provider_contact_id?: string | null;
          updated_at?: string;
        };
        Update: {
          audience_contact_id?: string;
          created_at?: string;
          last_error?: string | null;
          last_synced_at?: string | null;
          provider?: "resend";
          provider_contact_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ["audience_contact_id"];
            foreignKeyName: "audience_contact_sync_state_audience_contact_id_fkey";
            isOneToOne: true;
            referencedColumns: ["id"];
            referencedRelation: "audience_contacts";
          },
        ];
      };
      audience_opt_in_requests: {
        Row: {
          books_requested: boolean;
          confirmed_at: string | null;
          created_at: string;
          email: string;
          expires_at: string;
          full_name: string | null;
          general_updates_requested: boolean;
          id: string;
          lessons_requested: boolean;
          locale: "en" | "nl";
          source: "contact_form" | "signup";
          token_hash: string;
          updated_at: string;
        };
        Insert: {
          books_requested?: boolean;
          confirmed_at?: string | null;
          created_at?: string;
          email: string;
          expires_at: string;
          full_name?: string | null;
          general_updates_requested?: boolean;
          id?: string;
          lessons_requested?: boolean;
          locale?: "en" | "nl";
          source: "contact_form" | "signup";
          token_hash: string;
          updated_at?: string;
        };
        Update: {
          books_requested?: boolean;
          confirmed_at?: string | null;
          created_at?: string;
          email?: string;
          expires_at?: string;
          full_name?: string | null;
          general_updates_requested?: boolean;
          id?: string;
          lessons_requested?: boolean;
          locale?: "en" | "nl";
          source?: "contact_form" | "signup";
          token_hash?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_releases: {
        Row: {
          audience_segment: "books" | "general" | "lessons";
          body_en: string | null;
          body_nl: string | null;
          created_at: string;
          delivery_cursor: string | null;
          delivery_finished_at: string | null;
          delivery_requested_at: string | null;
          delivery_requested_by: string | null;
          delivery_started_at: string | null;
          delivery_summary: Json;
          id: string;
          last_delivery_error: string | null;
          locale_mode: "en_only" | "localized" | "nl_only";
          release_type: "lesson" | "mixed" | "publication";
          sent_at: string | null;
          status:
            | "approved"
            | "cancelled"
            | "draft"
            | "queued"
            | "sending"
            | "sent";
          subject_en: string | null;
          subject_nl: string | null;
          updated_at: string;
        };
        Insert: {
          audience_segment: "books" | "general" | "lessons";
          body_en?: string | null;
          body_nl?: string | null;
          created_at?: string;
          delivery_cursor?: string | null;
          delivery_finished_at?: string | null;
          delivery_requested_at?: string | null;
          delivery_requested_by?: string | null;
          delivery_started_at?: string | null;
          delivery_summary?: Json;
          id?: string;
          last_delivery_error?: string | null;
          locale_mode: "en_only" | "localized" | "nl_only";
          release_type: "lesson" | "mixed" | "publication";
          sent_at?: string | null;
          status?:
            | "approved"
            | "cancelled"
            | "draft"
            | "queued"
            | "sending"
            | "sent";
          subject_en?: string | null;
          subject_nl?: string | null;
          updated_at?: string;
        };
        Update: {
          audience_segment?: "books" | "general" | "lessons";
          body_en?: string | null;
          body_nl?: string | null;
          created_at?: string;
          delivery_cursor?: string | null;
          delivery_finished_at?: string | null;
          delivery_requested_at?: string | null;
          delivery_requested_by?: string | null;
          delivery_started_at?: string | null;
          delivery_summary?: Json;
          id?: string;
          last_delivery_error?: string | null;
          locale_mode?: "en_only" | "localized" | "nl_only";
          release_type?: "lesson" | "mixed" | "publication";
          sent_at?: string | null;
          status?:
            | "approved"
            | "cancelled"
            | "draft"
            | "queued"
            | "sending"
            | "sent";
          subject_en?: string | null;
          subject_nl?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ["delivery_requested_by"];
            foreignKeyName: "content_releases_delivery_requested_by_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      content_release_items: {
        Row: {
          created_at: string;
          id: string;
          item_id: string;
          item_type: "lesson" | "publication";
          release_id: string;
          title_snapshot: string;
          url_snapshot: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          item_id: string;
          item_type: "lesson" | "publication";
          release_id: string;
          title_snapshot: string;
          url_snapshot: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          item_id?: string;
          item_type?: "lesson" | "publication";
          release_id?: string;
          title_snapshot?: string;
          url_snapshot?: string;
        };
        Relationships: [
          {
            columns: ["release_id"];
            foreignKeyName: "content_release_items_release_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "content_releases";
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          preferred_dictionary_dialect: "A" | "ALL" | "B" | "F" | "L" | "S";
          role: "admin" | "student";
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          preferred_dictionary_dialect?: "A" | "ALL" | "B" | "F" | "L" | "S";
          role?: "admin" | "student";
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          preferred_dictionary_dialect?: "A" | "ALL" | "B" | "F" | "L" | "S";
          role?: "admin" | "student";
        };
        Relationships: [];
      };
      lesson_bookmarks: {
        Row: {
          created_at: string;
          lesson_id: string;
          lesson_slug: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          lesson_id: string;
          lesson_slug: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          lesson_id?: string;
          lesson_slug?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "lesson_bookmarks_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      lesson_notes: {
        Row: {
          created_at: string;
          lesson_id: string;
          lesson_slug: string;
          note_text: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          lesson_id: string;
          lesson_slug: string;
          note_text: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          lesson_id?: string;
          lesson_slug?: string;
          note_text?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "lesson_notes_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      lesson_progress: {
        Row: {
          completed_at: string | null;
          last_viewed_at: string;
          lesson_id: string;
          lesson_slug: string;
          started_at: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          last_viewed_at?: string;
          lesson_id: string;
          lesson_slug: string;
          started_at?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          last_viewed_at?: string;
          lesson_id?: string;
          lesson_slug?: string;
          started_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "lesson_progress_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      section_progress: {
        Row: {
          completed_at: string;
          lesson_id: string;
          lesson_slug: string;
          section_id: string;
          section_slug: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string;
          lesson_id: string;
          lesson_slug: string;
          section_id: string;
          section_slug: string;
          user_id: string;
        };
        Update: {
          completed_at?: string;
          lesson_id?: string;
          lesson_slug?: string;
          section_id?: string;
          section_slug?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "section_progress_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      submissions: {
        Row: {
          answers: Json | null;
          created_at: string;
          deleted_at: string | null;
          deleted_by: string | null;
          deletion_reason: string | null;
          exercise_id: string | null;
          feedback_text: string | null;
          id: string;
          lesson_slug: string;
          rating: number | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: "pending" | "reviewed";
          submission_intent_id: string | null;
          submitted_language: "en" | "nl" | null;
          submitted_text: string;
          user_id: string;
        };
        Insert: {
          answers?: Json | null;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          exercise_id?: string | null;
          feedback_text?: string | null;
          id?: string;
          lesson_slug: string;
          rating?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: "pending" | "reviewed";
          submission_intent_id?: string | null;
          submitted_language?: "en" | "nl" | null;
          submitted_text: string;
          user_id: string;
        };
        Update: {
          answers?: Json | null;
          created_at?: string;
          deleted_at?: string | null;
          deleted_by?: string | null;
          deletion_reason?: string | null;
          exercise_id?: string | null;
          feedback_text?: string | null;
          id?: string;
          lesson_slug?: string;
          rating?: number | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: "pending" | "reviewed";
          submission_intent_id?: string | null;
          submitted_language?: "en" | "nl" | null;
          submitted_text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["reviewed_by"];
            foreignKeyName: "submissions_reviewed_by_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
          {
            columns: ["user_id"];
            foreignKeyName: "submissions_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];

export type Tables<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Row"];

export type TablesInsert<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Insert"];

export type TablesUpdate<TableName extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][TableName]["Update"];
