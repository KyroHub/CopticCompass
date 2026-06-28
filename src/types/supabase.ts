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

export type DatabasePracticeSourceType = "dictionary" | "grammar";
export type DatabasePracticeTemplate = string;
export type DatabasePracticeDisplayDialect =
  | "A"
  | "B"
  | "F"
  | "Fb"
  | "L"
  | "M"
  | "O"
  | "S"
  | "Sa"
  | "Sf"
  | "Sl"
  | null;

export type Database = {
  public: {
    Tables: {
      practice_items: {
        Row: {
          created_at: string;
          display_dialect: DatabasePracticeDisplayDialect;
          due_at: string;
          id: string;
          locale: "en" | "nl";
          scheduler_card: Json;
          source_id: string;
          source_type: DatabasePracticeSourceType;
          suspended_at: string | null;
          template: DatabasePracticeTemplate;
          updated_at: string;
          user_id: string;
          variant_key: string;
        };
        Insert: {
          created_at?: string;
          display_dialect?: DatabasePracticeDisplayDialect;
          due_at: string;
          id?: string;
          locale: "en" | "nl";
          scheduler_card: Json;
          source_id: string;
          source_type: DatabasePracticeSourceType;
          suspended_at?: string | null;
          template: DatabasePracticeTemplate;
          updated_at?: string;
          user_id: string;
          variant_key: string;
        };
        Update: {
          created_at?: string;
          display_dialect?: DatabasePracticeDisplayDialect;
          due_at?: string;
          id?: string;
          locale?: "en" | "nl";
          scheduler_card?: Json;
          source_id?: string;
          source_type?: DatabasePracticeSourceType;
          suspended_at?: string | null;
          template?: DatabasePracticeTemplate;
          updated_at?: string;
          user_id?: string;
          variant_key?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "practice_items_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      practice_reviews: {
        Row: {
          id: string;
          locale: "en" | "nl";
          practice_item_id: string;
          rating: "again" | "easy" | "good" | "hard";
          reviewed_at: string;
          scheduler_card: Json;
          scheduler_log: Json;
          source_id: string;
          source_type: DatabasePracticeSourceType;
          template: DatabasePracticeTemplate;
          user_id: string;
          variant_key: string;
        };
        Insert: {
          id?: string;
          locale: "en" | "nl";
          practice_item_id: string;
          rating: "again" | "easy" | "good" | "hard";
          reviewed_at?: string;
          scheduler_card: Json;
          scheduler_log: Json;
          source_id: string;
          source_type: DatabasePracticeSourceType;
          template: DatabasePracticeTemplate;
          user_id: string;
          variant_key: string;
        };
        Update: {
          id?: string;
          locale?: "en" | "nl";
          practice_item_id?: string;
          rating?: "again" | "easy" | "good" | "hard";
          reviewed_at?: string;
          scheduler_card?: Json;
          scheduler_log?: Json;
          source_id?: string;
          source_type?: DatabasePracticeSourceType;
          template?: DatabasePracticeTemplate;
          user_id?: string;
          variant_key?: string;
        };
        Relationships: [
          {
            columns: ["practice_item_id"];
            foreignKeyName: "practice_reviews_practice_item_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "practice_items";
          },
          {
            columns: ["user_id"];
            foreignKeyName: "practice_reviews_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
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
      chat_sessions: {
        Row: {
          created_at: string;
          id: string;
          metadata: Json;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          metadata?: Json;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            columns: ["user_id"];
            foreignKeyName: "chat_sessions_user_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
        ];
      };
      chat_messages: {
        Row: {
          client_message_id: string | null;
          content: string;
          created_at: string;
          id: string;
          metadata: Json;
          role: string;
          session_id: string;
        };
        Insert: {
          client_message_id?: string | null;
          content: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          role: string;
          session_id: string;
        };
        Update: {
          client_message_id?: string | null;
          content?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          role?: string;
          session_id?: string;
        };
        Relationships: [
          {
            columns: ["session_id"];
            foreignKeyName: "chat_messages_session_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "chat_sessions";
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
      distill_runs: {
        Row: {
          id: string;
          created_by: string | null;
          status: string;
          teacher_name: string;
          learner_name: string;
          source_filter: Json;
          input_chunk_count: number;
          generated_example_count: number;
          approved_example_count: number;
          metadata: Json;
          error: string | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          status?: string;
          teacher_name?: string;
          learner_name?: string;
          source_filter?: Json;
          input_chunk_count?: number;
          generated_example_count?: number;
          approved_example_count?: number;
          metadata?: Json;
          error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string | null;
          status?: string;
          teacher_name?: string;
          learner_name?: string;
          source_filter?: Json;
          input_chunk_count?: number;
          generated_example_count?: number;
          approved_example_count?: number;
          metadata?: Json;
          error?: string | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      distill_examples: {
        Row: {
          id: number;
          run_id: string;
          source_document_id: number | null;
          source_chunk_hash: string;
          split: string;
          task_type: string;
          prompt: string;
          teacher_answer: string;
          student_target: Json;
          quality_score: number | null;
          approved: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          run_id: string;
          source_document_id?: number | null;
          source_chunk_hash: string;
          split?: string;
          task_type: string;
          prompt: string;
          teacher_answer: string;
          student_target?: Json;
          quality_score?: number | null;
          approved?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          run_id?: string;
          source_document_id?: number | null;
          source_chunk_hash?: string;
          split?: string;
          task_type?: string;
          prompt?: string;
          teacher_answer?: string;
          student_target?: Json;
          quality_score?: number | null;
          approved?: boolean;
          metadata?: Json;
          created_at?: string;
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
          status:
            | "accepted"
            | "bounced"
            | "complained"
            | "dead_letter"
            | "delayed"
            | "delivered"
            | "failed"
            | "processing"
            | "queued"
            | "sent"
            | "suppressed";
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
          status?:
            | "accepted"
            | "bounced"
            | "complained"
            | "dead_letter"
            | "delayed"
            | "delivered"
            | "failed"
            | "processing"
            | "queued"
            | "sent"
            | "suppressed";
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
          status?:
            | "accepted"
            | "bounced"
            | "complained"
            | "dead_letter"
            | "delayed"
            | "delivered"
            | "failed"
            | "processing"
            | "queued"
            | "sent"
            | "suppressed";
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
          status:
            | "accepted"
            | "bounced"
            | "complained"
            | "delayed"
            | "delivered"
            | "failed"
            | "sent"
            | "suppressed";
        };
        Insert: {
          channel?: "email";
          created_at?: string;
          error?: string | null;
          event_id: string;
          id?: string;
          provider_message_id?: string | null;
          recipient: string;
          status:
            | "accepted"
            | "bounced"
            | "complained"
            | "delayed"
            | "delivered"
            | "failed"
            | "sent"
            | "suppressed";
        };
        Update: {
          channel?: "email";
          created_at?: string;
          error?: string | null;
          event_id?: string;
          id?: string;
          provider_message_id?: string | null;
          recipient?: string;
          status?:
            | "accepted"
            | "bounced"
            | "complained"
            | "delayed"
            | "delivered"
            | "failed"
            | "sent"
            | "suppressed";
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
          attempt_count: number;
          bcc_recipients: string[];
          cc_recipients: string[];
          created_at: string;
          from_email: string | null;
          html_body: string | null;
          id: string;
          last_attempt_at: string | null;
          last_error: string | null;
          lock_expires_at: string | null;
          locked_at: string | null;
          max_attempts: number;
          next_attempt_at: string;
          notification_event_id: string;
          processed_at: string | null;
          provider_message_id: string | null;
          reply_to_recipients: string[];
          status:
            | "accepted"
            | "dead_letter"
            | "failed"
            | "processing"
            | "queued"
            | "retry_scheduled"
            | "sent";
          subject: string;
          text_body: string;
          to_recipients: string[];
        };
        Insert: {
          attempt_count?: number;
          bcc_recipients?: string[];
          cc_recipients?: string[];
          created_at?: string;
          from_email?: string | null;
          html_body?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          last_error?: string | null;
          lock_expires_at?: string | null;
          locked_at?: string | null;
          max_attempts?: number;
          next_attempt_at?: string;
          notification_event_id: string;
          processed_at?: string | null;
          provider_message_id?: string | null;
          reply_to_recipients?: string[];
          status?:
            | "accepted"
            | "dead_letter"
            | "failed"
            | "processing"
            | "queued"
            | "retry_scheduled"
            | "sent";
          subject: string;
          text_body: string;
          to_recipients: string[];
        };
        Update: {
          attempt_count?: number;
          bcc_recipients?: string[];
          cc_recipients?: string[];
          created_at?: string;
          from_email?: string | null;
          html_body?: string | null;
          id?: string;
          last_attempt_at?: string | null;
          last_error?: string | null;
          lock_expires_at?: string | null;
          locked_at?: string | null;
          max_attempts?: number;
          next_attempt_at?: string;
          notification_event_id?: string;
          processed_at?: string | null;
          provider_message_id?: string | null;
          reply_to_recipients?: string[];
          status?:
            | "accepted"
            | "dead_letter"
            | "failed"
            | "processing"
            | "queued"
            | "retry_scheduled"
            | "sent";
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
      notification_email_job_audit_events: {
        Row: {
          action: "manual_retry";
          actor_id: string | null;
          created_at: string;
          id: string;
          metadata: Json;
          notification_email_job_id: string;
          reason: string;
        };
        Insert: {
          action: "manual_retry";
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          notification_email_job_id: string;
          reason: string;
        };
        Update: {
          action?: "manual_retry";
          actor_id?: string | null;
          created_at?: string;
          id?: string;
          metadata?: Json;
          notification_email_job_id?: string;
          reason?: string;
        };
        Relationships: [
          {
            columns: ["actor_id"];
            foreignKeyName: "notification_email_job_audit_events_actor_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "profiles";
          },
          {
            columns: ["notification_email_job_id"];
            foreignKeyName: "notification_email_job_audit_events_notification_email_job_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "notification_email_jobs";
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
          source:
            | "contact_form"
            | "dashboard"
            | "public_preferences"
            | "resend_webhook"
            | "signup"
            | "system";
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
          source:
            | "contact_form"
            | "dashboard"
            | "public_preferences"
            | "resend_webhook"
            | "signup"
            | "system";
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
          source?:
            | "contact_form"
            | "dashboard"
            | "public_preferences"
            | "resend_webhook"
            | "signup"
            | "system";
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
      audience_preference_requests: {
        Row: {
          audience_contact_id: string;
          created_at: string;
          expires_at: string;
          id: string;
          locale: "en" | "nl";
          token_hash: string;
          used_at: string | null;
        };
        Insert: {
          audience_contact_id: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          locale?: "en" | "nl";
          token_hash: string;
          used_at?: string | null;
        };
        Update: {
          audience_contact_id?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          locale?: "en" | "nl";
          token_hash?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            columns: ["audience_contact_id"];
            foreignKeyName: "audience_preference_requests_audience_contact_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "audience_contacts";
          },
        ];
      };
      audience_consent_events: {
        Row: {
          action:
            | "opted_in"
            | "opted_out"
            | "suppressed"
            | "suppression_lifted";
          audience_contact_id: string;
          created_at: string;
          dedupe_key: string | null;
          id: string;
          metadata: Json;
          occurred_at: string;
          opt_in_request_id: string | null;
          policy_version: string;
          provider_event_id: string | null;
          source:
            | "admin_migration"
            | "contact_form"
            | "dashboard"
            | "public_preferences"
            | "resend_webhook"
            | "signup"
            | "system";
          topic: "all" | "books" | "general_updates" | "lessons";
        };
        Insert: {
          action:
            | "opted_in"
            | "opted_out"
            | "suppressed"
            | "suppression_lifted";
          audience_contact_id: string;
          created_at?: string;
          dedupe_key?: string | null;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          opt_in_request_id?: string | null;
          policy_version: string;
          provider_event_id?: string | null;
          source:
            | "admin_migration"
            | "contact_form"
            | "dashboard"
            | "public_preferences"
            | "resend_webhook"
            | "signup"
            | "system";
          topic: "all" | "books" | "general_updates" | "lessons";
        };
        Update: {
          action?:
            | "opted_in"
            | "opted_out"
            | "suppressed"
            | "suppression_lifted";
          audience_contact_id?: string;
          created_at?: string;
          dedupe_key?: string | null;
          id?: string;
          metadata?: Json;
          occurred_at?: string;
          opt_in_request_id?: string | null;
          policy_version?: string;
          provider_event_id?: string | null;
          source?:
            | "admin_migration"
            | "contact_form"
            | "dashboard"
            | "public_preferences"
            | "resend_webhook"
            | "signup"
            | "system";
          topic?: "all" | "books" | "general_updates" | "lessons";
        };
        Relationships: [
          {
            columns: ["audience_contact_id"];
            foreignKeyName: "audience_consent_events_audience_contact_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "audience_contacts";
          },
          {
            columns: ["opt_in_request_id"];
            foreignKeyName: "audience_consent_events_opt_in_request_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "audience_opt_in_requests";
          },
        ];
      };
      audience_suppressions: {
        Row: {
          audience_contact_id: string;
          created_at: string;
          id: string;
          lifted_at: string | null;
          metadata: Json;
          provider: "manual" | "resend" | "system" | null;
          provider_event_id: string | null;
          reason:
            | "hard_bounce"
            | "invalid_address"
            | "manual"
            | "provider_unsubscribe"
            | "spam_complaint";
          suppressed_at: string;
          updated_at: string;
        };
        Insert: {
          audience_contact_id: string;
          created_at?: string;
          id?: string;
          lifted_at?: string | null;
          metadata?: Json;
          provider?: "manual" | "resend" | "system" | null;
          provider_event_id?: string | null;
          reason:
            | "hard_bounce"
            | "invalid_address"
            | "manual"
            | "provider_unsubscribe"
            | "spam_complaint";
          suppressed_at?: string;
          updated_at?: string;
        };
        Update: {
          audience_contact_id?: string;
          created_at?: string;
          id?: string;
          lifted_at?: string | null;
          metadata?: Json;
          provider?: "manual" | "resend" | "system" | null;
          provider_event_id?: string | null;
          reason?:
            | "hard_bounce"
            | "invalid_address"
            | "manual"
            | "provider_unsubscribe"
            | "spam_complaint";
          suppressed_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            columns: ["audience_contact_id"];
            foreignKeyName: "audience_suppressions_audience_contact_id_fkey";
            isOneToOne: false;
            referencedColumns: ["id"];
            referencedRelation: "audience_contacts";
          },
        ];
      };
      provider_webhook_events: {
        Row: {
          attempt_count: number;
          event_type: string;
          id: string;
          last_error: string | null;
          payload: Json;
          processed_at: string | null;
          provider: "resend";
          provider_created_at: string | null;
          provider_event_id: string;
          received_at: string;
          status: "failed" | "ignored" | "processed" | "received";
        };
        Insert: {
          attempt_count?: number;
          event_type: string;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          processed_at?: string | null;
          provider: "resend";
          provider_created_at?: string | null;
          provider_event_id: string;
          received_at?: string;
          status?: "failed" | "ignored" | "processed" | "received";
        };
        Update: {
          attempt_count?: number;
          event_type?: string;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          processed_at?: string | null;
          provider?: "resend";
          provider_created_at?: string | null;
          provider_event_id?: string;
          received_at?: string;
          status?: "failed" | "ignored" | "processed" | "received";
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
          preferred_dictionary_dialect:
            | "A"
            | "ALL"
            | "B"
            | "F"
            | "L"
            | "M"
            | "S";
          role: "admin" | "student";
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          preferred_dictionary_dialect?:
            | "A"
            | "ALL"
            | "B"
            | "F"
            | "L"
            | "M"
            | "S";
          role?: "admin" | "student";
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          preferred_dictionary_dialect?:
            | "A"
            | "ALL"
            | "B"
            | "F"
            | "L"
            | "M"
            | "S";
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
      apply_audience_preference_request: {
        Args: {
          p_books_opt_in: boolean;
          p_general_updates_opt_in: boolean;
          p_lessons_opt_in: boolean;
          p_occurred_at: string;
          p_policy_version: string;
          p_token_hash: string;
        };
        Returns: {
          audience_contact_id: string | null;
          books_opt_in: boolean | null;
          email: string | null;
          full_name: string | null;
          general_updates_opt_in: boolean | null;
          lessons_opt_in: boolean | null;
          locale: string | null;
          request_id: string | null;
          status: string;
        }[];
      };
      apply_audience_preferences: {
        Args: {
          p_actor: string;
          p_books_opt_in: boolean;
          p_dedupe_prefix: string | null;
          p_email: string;
          p_full_name: string | null;
          p_general_updates_opt_in: boolean;
          p_lessons_opt_in: boolean;
          p_locale: string;
          p_occurred_at: string;
          p_opt_in_request_id: string | null;
          p_policy_version: string;
          p_profile_id: string | null;
          p_source: string;
        };
        Returns: Database["public"]["Tables"]["audience_contacts"]["Row"];
      };
      enqueue_notification_email_job: {
        Args: {
          p_aggregate_id: string;
          p_aggregate_type: string;
          p_bcc_recipients?: string[];
          p_cc_recipients?: string[];
          p_dedupe_key?: string | null;
          p_event_type: string;
          p_from_email?: string | null;
          p_html_body?: string | null;
          p_max_attempts?: number;
          p_payload?: Json;
          p_recipient: string;
          p_reply_to_recipients?: string[];
          p_subject: string;
          p_text_body: string;
          p_to_recipients: string[];
        };
        Returns: {
          event_id: string;
          event_status:
            | "accepted"
            | "bounced"
            | "complained"
            | "dead_letter"
            | "delayed"
            | "delivered"
            | "failed"
            | "processing"
            | "queued"
            | "sent"
            | "suppressed";
          job_already_existed: boolean;
          job_id: string;
          job_status:
            | "accepted"
            | "dead_letter"
            | "failed"
            | "processing"
            | "queued"
            | "retry_scheduled"
            | "sent";
        }[];
      };
      claim_notification_email_jobs: {
        Args: {
          p_job_id?: string;
          p_lease_seconds?: number;
          p_limit?: number;
        };
        Returns: {
          attempt_count: number;
          bcc_recipients: string[];
          cc_recipients: string[];
          created_at: string;
          from_email: string | null;
          html_body: string | null;
          id: string;
          last_attempt_at: string | null;
          last_error: string | null;
          lock_expires_at: string | null;
          locked_at: string | null;
          max_attempts: number;
          next_attempt_at: string;
          notification_event_id: string;
          processed_at: string | null;
          provider_message_id: string | null;
          reply_to_recipients: string[];
          status:
            | "accepted"
            | "dead_letter"
            | "failed"
            | "processing"
            | "queued"
            | "retry_scheduled"
            | "sent";
          subject: string;
          text_body: string;
          to_recipients: string[];
        }[];
      };
      retry_notification_email_job: {
        Args: {
          p_job_id: string;
          p_reason: string;
        };
        Returns: {
          event_id: string;
          job_id: string;
          job_status:
            | "accepted"
            | "dead_letter"
            | "failed"
            | "processing"
            | "queued"
            | "retry_scheduled"
            | "sent";
        }[];
      };
      confirm_audience_opt_in_request: {
        Args: {
          p_occurred_at: string;
          p_policy_version: string;
          p_token_hash: string;
        };
        Returns: {
          audience_contact_id: string | null;
          books_opt_in: boolean | null;
          email: string | null;
          full_name: string | null;
          general_updates_opt_in: boolean | null;
          lessons_opt_in: boolean | null;
          locale: string | null;
          request_id: string | null;
          status: string;
        }[];
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      match_coptic_documents: {
        Args: {
          query_embedding: string;
          match_threshold: number;
          match_count: number;
        };
        Returns: {
          id: number;
          content: string;
          metadata: Json | null;
          similarity: number;
        }[];
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
