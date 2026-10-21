export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      annotations: {
        Row: {
          body_markdown: string
          book_id: string
          created_at: string | null
          highlight_id: string | null
          id: string
          location_anchor: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body_markdown: string
          book_id: string
          created_at?: string | null
          highlight_id?: string | null
          id?: string
          location_anchor: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body_markdown?: string
          book_id?: string
          created_at?: string | null
          highlight_id?: string | null
          id?: string
          location_anchor?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_notes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reader_notes_highlight_id_fkey"
            columns: ["highlight_id"]
            isOneToOne: false
            referencedRelation: "highlights"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          ends_at: string
          id: string
          is_active: boolean | null
          is_dismissible: boolean | null
          language: string
          link_text: string | null
          link_url: string | null
          starts_at: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          ends_at: string
          id?: string
          is_active?: boolean | null
          is_dismissible?: boolean | null
          language?: string
          link_text?: string | null
          link_url?: string | null
          starts_at: string
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean | null
          is_dismissible?: boolean | null
          language?: string
          link_text?: string | null
          link_url?: string | null
          starts_at?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          correlation_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          correlation_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          user_agent?: string | null
        }
        Relationships: []
      }
      authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      book_authors: {
        Row: {
          author_id: string
          book_id: string
          position: number
        }
        Insert: {
          author_id: string
          book_id: string
          position?: number
        }
        Update: {
          author_id?: string
          book_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "book_authors_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_authors_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_files: {
        Row: {
          book_id: string | null
          checksum: string | null
          created_at: string | null
          format: string
          id: string
          is_primary: boolean | null
          language: string
          mime_type: string | null
          size: number | null
          storage_path: string | null
          version: number | null
        }
        Insert: {
          book_id?: string | null
          checksum?: string | null
          created_at?: string | null
          format: string
          id?: string
          is_primary?: boolean | null
          language?: string
          mime_type?: string | null
          size?: number | null
          storage_path?: string | null
          version?: number | null
        }
        Update: {
          book_id?: string | null
          checksum?: string | null
          created_at?: string | null
          format?: string
          id?: string
          is_primary?: boolean | null
          language?: string
          mime_type?: string | null
          size?: number | null
          storage_path?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "book_formats_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      book_genres: {
        Row: {
          book_id: string
          genre_id: string
        }
        Insert: {
          book_id: string
          genre_id: string
        }
        Update: {
          book_id?: string
          genre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_genres_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      book_subjects: {
        Row: {
          book_id: string
          subject_id: string
        }
        Insert: {
          book_id: string
          subject_id: string
        }
        Update: {
          book_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_subjects_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          book_id: string
          created_at: string | null
          id: string
          label: string | null
          page_number: number
          user_id: string
        }
        Insert: {
          book_id: string
          created_at?: string | null
          id?: string
          label?: string | null
          page_number: number
          user_id: string
        }
        Update: {
          book_id?: string
          created_at?: string | null
          id?: string
          label?: string | null
          page_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          cover_url: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          edition: string | null
          embedding: string | null
          fts: unknown
          id: string
          is_archived: boolean
          is_featured: boolean | null
          is_published: boolean
          is_textbook: boolean | null
          isbn: string | null
          language: string | null
          language_id: string | null
          pages: number | null
          publisher: string | null
          release_date: string | null
          series: string | null
          series_order: number | null
          title: string
          updated_at: string | null
          version: number
          view_count: number | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          edition?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          is_archived?: boolean
          is_featured?: boolean | null
          is_published?: boolean
          is_textbook?: boolean | null
          isbn?: string | null
          language?: string | null
          language_id?: string | null
          pages?: number | null
          publisher?: string | null
          release_date?: string | null
          series?: string | null
          series_order?: number | null
          title: string
          updated_at?: string | null
          version?: number
          view_count?: number | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          edition?: string | null
          embedding?: string | null
          fts?: unknown
          id?: string
          is_archived?: boolean
          is_featured?: boolean | null
          is_published?: boolean
          is_textbook?: boolean | null
          isbn?: string | null
          language?: string | null
          language_id?: string | null
          pages?: number | null
          publisher?: string | null
          release_date?: string | null
          series?: string | null
          series_order?: number | null
          title?: string
          updated_at?: string | null
          version?: number
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "books_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_books: {
        Row: {
          book_id: string
          collection_id: string
          created_at: string
          position: number
        }
        Insert: {
          book_id: string
          collection_id: string
          created_at?: string
          position?: number
        }
        Update: {
          book_id?: string
          collection_id?: string
          created_at?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "collection_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_books_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      discovery_search_documents: {
        Row: {
          authors: string[]
          average_rating: number
          book_id: string
          description: string | null
          download_count: number | null
          fts_tokens: unknown
          genres: string[]
          indexed_at: string | null
          indexed_by: string | null
          is_public: boolean
          language: string
          last_index_duration_ms: number | null
          last_index_reason: string | null
          last_projection_version: number | null
          popularity_score: number | null
          projection_version: number | null
          publication_year: number | null
          rating_count: number
          slug: string
          source_updated_at: string | null
          subjects: string[]
          subtitle: string | null
          title: string
          view_count: number
        }
        Insert: {
          authors?: string[]
          average_rating?: number
          book_id: string
          description?: string | null
          download_count?: number | null
          fts_tokens?: unknown
          genres?: string[]
          indexed_at?: string | null
          indexed_by?: string | null
          is_public?: boolean
          language: string
          last_index_duration_ms?: number | null
          last_index_reason?: string | null
          last_projection_version?: number | null
          popularity_score?: number | null
          projection_version?: number | null
          publication_year?: number | null
          rating_count?: number
          slug?: string
          source_updated_at?: string | null
          subjects?: string[]
          subtitle?: string | null
          title: string
          view_count?: number
        }
        Update: {
          authors?: string[]
          average_rating?: number
          book_id?: string
          description?: string | null
          download_count?: number | null
          fts_tokens?: unknown
          genres?: string[]
          indexed_at?: string | null
          indexed_by?: string | null
          is_public?: boolean
          language?: string
          last_index_duration_ms?: number | null
          last_index_reason?: string | null
          last_projection_version?: number | null
          popularity_score?: number | null
          projection_version?: number | null
          publication_year?: number | null
          rating_count?: number
          slug?: string
          source_updated_at?: string | null
          subjects?: string[]
          subtitle?: string | null
          title?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "discovery_search_documents_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      faqs: {
        Row: {
          answer: string
          category: string | null
          created_at: string | null
          display_order: number | null
          id: string
          language: string
          question: string
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          language?: string
          question: string
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          language?: string
          question?: string
        }
        Relationships: []
      }
      featured_books: {
        Row: {
          book_id: string
          created_at: string
          ends_at: string | null
          position: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          ends_at?: string | null
          position?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          ends_at?: string | null
          position?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      highlights: {
        Row: {
          book_id: string
          color: string | null
          created_at: string | null
          id: string
          location_anchor: Json
          selected_text: string
          user_id: string
        }
        Insert: {
          book_id: string
          color?: string | null
          created_at?: string | null
          id?: string
          location_anchor: Json
          selected_text: string
          user_id: string
        }
        Update: {
          book_id?: string
          color?: string | null
          created_at?: string | null
          id?: string
          location_anchor?: Json
          selected_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_highlights_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      job_failures: {
        Row: {
          error: string
          failed_at: string
          id: string
          job_type: string
          payload: Json
          retry_count: number
          stack_trace: string | null
          worker: string | null
        }
        Insert: {
          error: string
          failed_at?: string
          id?: string
          job_type: string
          payload: Json
          retry_count?: number
          stack_trace?: string | null
          worker?: string | null
        }
        Update: {
          error?: string
          failed_at?: string
          id?: string
          job_type?: string
          payload?: Json
          retry_count?: number
          stack_trace?: string | null
          worker?: string | null
        }
        Relationships: []
      }
      job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string | null
          id: string
          job_type: string
          last_error: string | null
          payload: Json
          scheduled_at: string
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          payload: Json
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          payload?: Json
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      languages: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          native_name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          native_name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          native_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      library_books: {
        Row: {
          added_at: string | null
          book_id: string
          id: string
          queue_order: number | null
          status: Database["public"]["Enums"]["reading_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          added_at?: string | null
          book_id: string
          id?: string
          queue_order?: number | null
          status?: Database["public"]["Enums"]["reading_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          added_at?: string | null
          book_id?: string
          id?: string
          queue_order?: number | null
          status?: Database["public"]["Enums"]["reading_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      login_notifications_log: {
        Row: {
          attempts: number
          claimed_at: string | null
          created_at: string
          idempotency_key: string | null
          last_error: string | null
          processed_at: string | null
          request_id: string | null
          session_id: string
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          idempotency_key?: string | null
          last_error?: string | null
          processed_at?: string | null
          request_id?: string | null
          session_id: string
          status: string
          user_id: string
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          idempotency_key?: string | null
          last_error?: string | null
          processed_at?: string | null
          request_id?: string | null
          session_id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          book_id: string | null
          content: string | null
          created_at: string | null
          id: string
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          book_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          book_id?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          body: string
          created_at: string
          event_name: string
          id: string
          metadata: Json | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          body: string
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          body?: string
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      outbox_events: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string | null
          event_type: string
          event_version: number
          id: string
          last_error: string | null
          lease_expires_at: string | null
          lease_id: string | null
          occurred_at: string
          payload: Json
          processed_at: string | null
          retry_count: number
          status: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          event_type: string
          event_version?: number
          id?: string
          last_error?: string | null
          lease_expires_at?: string | null
          lease_id?: string | null
          occurred_at?: string
          payload: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string | null
          event_type?: string
          event_version?: number
          id?: string
          last_error?: string | null
          lease_expires_at?: string | null
          lease_id?: string | null
          occurred_at?: string
          payload?: Json
          processed_at?: string | null
          retry_count?: number
          status?: string
        }
        Relationships: []
      }
      platform_reports: {
        Row: {
          created_at: string
          description: string
          email: string | null
          id: string
          status: string
          title: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description: string
          email?: string | null
          id?: string
          status?: string
          title: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          email?: string | null
          id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      processed_events: {
        Row: {
          duration_ms: number | null
          event_id: string
          handler: string
          processed_at: string
        }
        Insert: {
          duration_ms?: number | null
          event_id: string
          handler: string
          processed_at?: string
        }
        Update: {
          duration_ms?: number | null
          event_id?: string
          handler?: string
          processed_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string
          location: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id: string
          location?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          location?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reading_goals: {
        Row: {
          created_at: string | null
          current_value: number | null
          end_date: string | null
          goal_type: string
          id: string
          is_active: boolean | null
          start_date: string | null
          target_value: number
          updated_at: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          end_date?: string | null
          goal_type: string
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          target_value: number
          updated_at?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          end_date?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          start_date?: string | null
          target_value?: number
          updated_at?: string | null
          user_id?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reading_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_progress: {
        Row: {
          book_id: string
          last_read_at: string
          location_anchor: Json
          user_id: string
        }
        Insert: {
          book_id: string
          last_read_at?: string
          location_anchor: Json
          user_id: string
        }
        Update: {
          book_id?: string
          last_read_at?: string
          location_anchor?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_positions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      reading_sessions: {
        Row: {
          book_id: string
          current_page: number | null
          finished_at: string | null
          id: string
          last_read_at: string | null
          pages: number | null
          percentage: number | null
          reading_time_minutes: number | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          current_page?: number | null
          finished_at?: string | null
          id?: string
          last_read_at?: string | null
          pages?: number | null
          percentage?: number | null
          reading_time_minutes?: number | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          current_page?: number | null
          finished_at?: string | null
          id?: string
          last_read_at?: string | null
          pages?: number | null
          percentage?: number | null
          reading_time_minutes?: number | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reader_sessions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string | null
          permission: string
          role: string
        }
        Insert: {
          created_at?: string | null
          permission: string
          role: string
        }
        Update: {
          created_at?: string | null
          permission?: string
          role?: string
        }
        Relationships: []
      }
      search_history: {
        Row: {
          clicked_document_id: string | null
          execution_time_ms: number | null
          filters: Json | null
          id: string
          is_slow_query: boolean | null
          is_zero_result: boolean | null
          normalized_query: string
          query: string
          result_count: number | null
          searched_at: string | null
          sort_strategy: string | null
          user_id: string | null
        }
        Insert: {
          clicked_document_id?: string | null
          execution_time_ms?: number | null
          filters?: Json | null
          id?: string
          is_slow_query?: boolean | null
          is_zero_result?: boolean | null
          normalized_query: string
          query: string
          result_count?: number | null
          searched_at?: string | null
          sort_strategy?: string | null
          user_id?: string | null
        }
        Update: {
          clicked_document_id?: string | null
          execution_time_ms?: number | null
          filters?: Json | null
          id?: string
          is_slow_query?: boolean | null
          is_zero_result?: boolean | null
          normalized_query?: string
          query?: string
          result_count?: number | null
          searched_at?: string | null
          sort_strategy?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_history_clicked_document_id_fkey"
            columns: ["clicked_document_id"]
            isOneToOne: false
            referencedRelation: "discovery_search_documents"
            referencedColumns: ["book_id"]
          },
        ]
      }
      shelf_items: {
        Row: {
          added_at: string | null
          book_id: string
          id: string
          position: number | null
          shelf_id: string
        }
        Insert: {
          added_at?: string | null
          book_id: string
          id?: string
          position?: number | null
          shelf_id: string
        }
        Update: {
          added_at?: string | null
          book_id?: string
          id?: string
          position?: number | null
          shelf_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shelf_items_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelf_items_shelf_id_fkey"
            columns: ["shelf_id"]
            isOneToOne: false
            referencedRelation: "shelves"
            referencedColumns: ["id"]
          },
        ]
      }
      shelves: {
        Row: {
          cover_image: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_image?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trending_books_projection: {
        Row: {
          all_time_rank: number | null
          all_time_score: number
          book_id: string
          daily_rank: number | null
          daily_score: number
          monthly_rank: number | null
          monthly_score: number
          updated_at: string
          weekly_rank: number | null
          weekly_score: number
        }
        Insert: {
          all_time_rank?: number | null
          all_time_score?: number
          book_id: string
          daily_rank?: number | null
          daily_score?: number
          monthly_rank?: number | null
          monthly_score?: number
          updated_at?: string
          weekly_rank?: number | null
          weekly_score?: number
        }
        Update: {
          all_time_rank?: number | null
          all_time_score?: number
          book_id?: string
          daily_rank?: number | null
          daily_score?: number
          monthly_rank?: number | null
          monthly_score?: number
          updated_at?: string
          weekly_rank?: number | null
          weekly_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "trending_books_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: true
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      user_book_completions: {
        Row: {
          book_id: string
          completed_at: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          completed_at?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          completed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_book_completions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_book_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          created_at: string
          email_alerts_enabled: boolean
          push_notifications_enabled: boolean
          reading_reminders_enabled: boolean
          recommendations_enabled: boolean
          system_announcements_enabled: boolean
          updated_at: string
          user_id: string
          weekly_digest_enabled: boolean
        }
        Insert: {
          created_at?: string
          email_alerts_enabled?: boolean
          push_notifications_enabled?: boolean
          reading_reminders_enabled?: boolean
          recommendations_enabled?: boolean
          system_announcements_enabled?: boolean
          updated_at?: string
          user_id: string
          weekly_digest_enabled?: boolean
        }
        Update: {
          created_at?: string
          email_alerts_enabled?: boolean
          push_notifications_enabled?: boolean
          reading_reminders_enabled?: boolean
          recommendations_enabled?: boolean
          system_announcements_enabled?: boolean
          updated_at?: string
          user_id?: string
          weekly_digest_enabled?: boolean
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          file_name: string | null
          file_size: number | null
          granted: boolean
          id: string
          mime_type: string | null
          permission_type: string
          resource_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          granted?: boolean
          id?: string
          mime_type?: string | null
          permission_type: string
          resource_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          granted?: boolean
          id?: string
          mime_type?: string | null
          permission_type?: string
          resource_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          content_languages: string[]
          created_at: string | null
          dictionary_language: string | null
          font_family: string | null
          font_size: number | null
          line_height: number | null
          reader_theme: string | null
          theme: string | null
          ui_language: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_languages?: string[]
          created_at?: string | null
          dictionary_language?: string | null
          font_family?: string | null
          font_size?: number | null
          line_height?: number | null
          reader_theme?: string | null
          theme?: string | null
          ui_language?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_languages?: string[]
          created_at?: string | null
          dictionary_language?: string | null
          font_family?: string | null
          font_size?: number | null
          line_height?: number | null
          reader_theme?: string | null
          theme?: string | null
          ui_language?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      user_statistics: {
        Row: {
          books_completed: number | null
          books_started: number | null
          current_streak: number | null
          last_read_date: string | null
          longest_streak: number | null
          minutes_read: number | null
          pages_read: number | null
          seconds_read: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          books_completed?: number | null
          books_started?: number | null
          current_streak?: number | null
          last_read_date?: string | null
          longest_streak?: number | null
          minutes_read?: number | null
          pages_read?: number | null
          seconds_read?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          books_completed?: number | null
          books_started?: number | null
          current_streak?: number | null
          last_read_date?: string | null
          longest_streak?: number | null
          minutes_read?: number | null
          pages_read?: number | null
          seconds_read?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_statistics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_statistics_event_log: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string | null
          user_id: string
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string | null
          user_id: string
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_statistics_event_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      trending_searches: {
        Row: {
          last_searched_at: string | null
          normalized_query: string | null
          search_count: number | null
        }
        Relationships: []
      }
      trending_searches_v1: {
        Row: {
          last_searched_at: string | null
          normalized_query: string | null
          search_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_book_popularity_metrics: {
        Args: { p_book_id?: string; p_window_interval?: string }
        Returns: {
          bayesian_rating: number
          book_id: string
          completion_signal: number
          composite_score: number
          decayed_reading_velocity: number
          log_views: number
          raw_average_rating: number
          raw_completions: number
          raw_rating_count: number
          raw_reading_minutes: number
          raw_views: number
        }[]
      }
      claim_outbox_events_legacy_pub_v0: {
        Args: { limit_count: number }
        Returns: {
          aggregate_id: string
          aggregate_type: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string | null
          event_type: string
          event_version: number
          id: string
          last_error: string | null
          lease_expires_at: string | null
          lease_id: string | null
          occurred_at: string
          payload: Json
          processed_at: string | null
          retry_count: number
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "outbox_events"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_expired_rate_limits: { Args: never; Returns: undefined }
      create_notification_idempotent: {
        Args: {
          p_aggregate_id: string
          p_aggregate_type: string
          p_body: string
          p_event_id: string
          p_event_name: string
          p_handler: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: boolean
      }
      execute_book_search_v1: {
        Args: {
          p_genres?: string[]
          p_include_unavailable?: boolean
          p_languages?: string[]
          p_page?: number
          p_page_size?: number
          p_publication_years?: number[]
          p_query?: string
          p_sort?: string
          p_subjects?: string[]
        }
        Returns: {
          authors: string[]
          average_rating: number
          book_id: string
          cover_url: string
          genres: string[]
          is_typo_fallback: boolean
          language: string
          popularity_score: number
          rating_count: number
          relevance_score: number
          slug: string
          subjects: string[]
          subtitle: string
          suggested_query: string
          title: string
          total_count: number
        }[]
      }
      format_file_size: { Args: { size_bytes: number }; Returns: string }
      get_active_announcements: {
        Args: { p_user_role?: string }
        Returns: {
          content: string
          ends_at: string
          id: string
          starts_at: string
          title: string
          type: string
        }[]
      }
      get_recent_searches_v1: {
        Args: { p_user_id: string }
        Returns: {
          query: string
          searched_at: string
        }[]
      }
      get_search_autocomplete_v1: {
        Args: { p_query: string }
        Returns: {
          author: string
          book_id: string
          reason: string
          slug: string
          title: string
        }[]
      }
      get_search_facets_v1: {
        Args: {
          p_genres?: string[]
          p_include_unavailable?: boolean
          p_languages?: string[]
          p_publication_years?: number[]
          p_query?: string
          p_subjects?: string[]
        }
        Returns: {
          facet_key: string
          facet_value: string
          match_count: number
        }[]
      }
      get_user_genre_distribution: {
        Args: { matches_user_id: string }
        Returns: {
          count: number
          genre: string
        }[]
      }
      get_user_permissions: {
        Args: { p_user_id: string }
        Returns: {
          permission: string
        }[]
      }
      has_permission: {
        Args: { p_permission: string; p_user_id: string }
        Returns: boolean
      }
      immutable_array_to_string: {
        Args: { arr: string[]; sep: string }
        Returns: string
      }
      increment_analytics_book_completed: {
        Args: { p_book_id: string }
        Returns: undefined
      }
      increment_analytics_book_pages: {
        Args: { p_book_id: string; p_pages: number }
        Returns: undefined
      }
      increment_analytics_book_reads: {
        Args: { p_book_id: string }
        Returns: undefined
      }
      increment_analytics_daily_completed: {
        Args: { p_date: string; p_user_id: string }
        Returns: undefined
      }
      increment_analytics_daily_pages: {
        Args: { p_date: string; p_pages: number; p_user_id: string }
        Returns: undefined
      }
      increment_analytics_genre_completed: {
        Args: { p_genre: string; p_user_id: string }
        Returns: undefined
      }
      increment_analytics_genre_likes: {
        Args: { p_genre: string; p_user_id: string }
        Returns: undefined
      }
      increment_analytics_genre_pages: {
        Args: { p_genre: string; p_pages: number; p_user_id: string }
        Returns: undefined
      }
      increment_analytics_genre_rating: {
        Args: { p_genre: string; p_user_id: string }
        Returns: undefined
      }
      increment_analytics_genre_started: {
        Args: { p_genre: string; p_user_id: string }
        Returns: undefined
      }
      increment_analytics_monthly_completed: {
        Args: { p_month: string; p_user_id: string }
        Returns: undefined
      }
      increment_analytics_monthly_pages: {
        Args: { p_month: string; p_pages: number; p_user_id: string }
        Returns: undefined
      }
      increment_book_view_count: {
        Args: { p_book_id: string }
        Returns: number
      }
      log_search_analytics: {
        Args: {
          p_execution_time_ms: number
          p_filters: Json
          p_id: string
          p_is_slow_query: boolean
          p_is_zero_result: boolean
          p_normalized_query: string
          p_query: string
          p_result_count: number
          p_searched_at: string
          p_sort_strategy: string
          p_user_id: string
        }
        Returns: undefined
      }
      match_books: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          author: string
          cover_url: string
          id: string
          similarity: number
          title: string
        }[]
      }
      normalize_search_query: { Args: { p_query: string }; Returns: string }
      prune_system_logs: { Args: never; Returns: undefined }
      recalculate_analytics_book_rating: {
        Args: { p_book_id: string }
        Returns: undefined
      }
      recalculate_trending_projections: { Args: never; Returns: number }
      recalculate_user_statistics: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      record_analytics_book_completed_idempotent: {
        Args: {
          p_book_id: string
          p_date: string
          p_event_id: string
          p_genre?: string
          p_month: string
          p_user_id: string
        }
        Returns: boolean
      }
      record_analytics_pages_read_idempotent: {
        Args: {
          p_book_id: string
          p_date: string
          p_event_id: string
          p_genre?: string
          p_month: string
          p_pages: number
          p_user_id: string
        }
        Returns: boolean
      }
      refresh_category_document: {
        Args: { target_category: string }
        Returns: undefined
      }
      refresh_outdated_discovery_projections: {
        Args: { batch_limit?: number }
        Returns: number
      }
      refresh_recommendation_signals: {
        Args: { target_user_id?: string }
        Returns: undefined
      }
      refresh_search_document: {
        Args: { target_book_id: string }
        Returns: undefined
      }
      refresh_trending_searches_v1: { Args: never; Returns: undefined }
      sanitize_account_logs: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      save_book_action_with_events: {
        Args: {
          p_action_data: Json
          p_action_type: string
          p_book_id: string
          p_events: Json
          p_user_id: string
        }
        Returns: undefined
      }
      save_book_aggregate_with_events: {
        Args: { p_book: Json; p_events: Json }
        Returns: undefined
      }
      save_reader_session_with_events: {
        Args: {
          p_book_id: string
          p_current_page: number
          p_events: Json
          p_library_status: string
          p_percentage: number
          p_user_id: string
        }
        Returns: undefined
      }
      toggle_maintenance_mode: {
        Args: { p_enabled: boolean; p_message?: string }
        Returns: Json
      }
      update_reading_queue_order: {
        Args: { updates: Json }
        Returns: undefined
      }
    }
    Enums: {
      academic_subject_type:
        | "Computer Science"
        | "Mathematics"
        | "Physics"
        | "Chemistry"
        | "Biology"
        | "Engineering"
        | "Business"
        | "Economics"
        | "Psychology"
        | "History"
        | "Literature"
        | "Philosophy"
        | "Medicine"
        | "Law"
        | "Education"
      reading_status: "want_to_read" | "currently_reading" | "finished"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      academic_subject_type: [
        "Computer Science",
        "Mathematics",
        "Physics",
        "Chemistry",
        "Biology",
        "Engineering",
        "Business",
        "Economics",
        "Psychology",
        "History",
        "Literature",
        "Philosophy",
        "Medicine",
        "Law",
        "Education",
      ],
      reading_status: ["want_to_read", "currently_reading", "finished"],
    },
  },
} as const
