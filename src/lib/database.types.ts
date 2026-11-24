// Generated from the Supabase "cero" project schema. Regenerate after schema changes:
// npx supabase gen types typescript --project-id ktewnuqxaogoiefriano > src/lib/database.types.ts

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.18';
  };
  public: {
    Tables: {
      employments: {
        Row: {
          created_at: string;
          days_per_week: number;
          economic_zone: string;
          employer_id: string;
          end_date: string | null;
          end_reason: string | null;
          id: string;
          igss_precapi: boolean;
          incentive_bonus: number;
          invite_code: string;
          job_type: string;
          live_in: boolean;
          monthly_salary: number;
          start_date: string;
          status: string;
          worker_name: string;
          worker_phone: string | null;
          worker_user_id: string | null;
        };
        Insert: {
          created_at?: string;
          days_per_week?: number;
          economic_zone?: string;
          employer_id: string;
          end_date?: string | null;
          end_reason?: string | null;
          id?: string;
          igss_precapi?: boolean;
          incentive_bonus?: number;
          invite_code?: string;
          job_type?: string;
          live_in?: boolean;
          monthly_salary: number;
          start_date: string;
          status?: string;
          worker_name: string;
          worker_phone?: string | null;
          worker_user_id?: string | null;
        };
        Update: {
          created_at?: string;
          days_per_week?: number;
          economic_zone?: string;
          employer_id?: string;
          end_date?: string | null;
          end_reason?: string | null;
          id?: string;
          igss_precapi?: boolean;
          incentive_bonus?: number;
          invite_code?: string;
          job_type?: string;
          live_in?: boolean;
          monthly_salary?: number;
          start_date?: string;
          status?: string;
          worker_name?: string;
          worker_phone?: string | null;
          worker_user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'employments_employer_id_fkey';
            columns: ['employer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'employments_worker_user_id_fkey';
            columns: ['worker_user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          employment_id: string;
          id: string;
          incentive_bonus: number;
          kind: string;
          method: string | null;
          notes: string | null;
          paid_on: string;
          period_end: string | null;
          period_start: string | null;
          worker_confirmed_at: string | null;
        };
        Insert: {
          amount: number;
          created_at?: string;
          employment_id: string;
          id?: string;
          incentive_bonus?: number;
          kind: string;
          method?: string | null;
          notes?: string | null;
          paid_on?: string;
          period_end?: string | null;
          period_start?: string | null;
          worker_confirmed_at?: string | null;
        };
        Update: {
          amount?: number;
          created_at?: string;
          employment_id?: string;
          id?: string;
          incentive_bonus?: number;
          kind?: string;
          method?: string | null;
          notes?: string | null;
          paid_on?: string;
          period_end?: string | null;
          period_start?: string | null;
          worker_confirmed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_employment_id_fkey';
            columns: ['employment_id'];
            isOneToOne: false;
            referencedRelation: 'employments';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          full_name: string;
          id: string;
          phone: string | null;
          role: string;
        };
        Insert: {
          created_at?: string;
          full_name?: string;
          id: string;
          phone?: string | null;
          role: string;
        };
        Update: {
          created_at?: string;
          full_name?: string;
          id?: string;
          phone?: string | null;
          role?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      /** Returns null when the code is wrong or already used. */
      claim_employment: { Args: { code: string }; Returns: string | null };
      confirm_payment: { Args: { payment_id: string }; Returns: undefined };
      reset_invite_code: { Args: { employment_id: string }; Returns: string };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Employment = Database['public']['Tables']['employments']['Row'];
export type Payment = Database['public']['Tables']['payments']['Row'];
