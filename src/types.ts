export type FeedbackStatus = 'Pending' | 'Draft' | 'Submitted' | 'Shared' | 'Acknowledged';

export type ImportBucket = 'new' | 'profile_update_safe' | 'profile_update_preserve' | 'invalid' | 'duplicate';

export interface ImportRow {
  employee: Employee;
  bucket: ImportBucket;
  reasons?: string[];
  originalIndex: number;
}

export interface ImportResult {
  buckets: Record<ImportBucket, ImportRow[]>;
  totalCount: number;
  warnings: string[];
}

export type GreatPillar = 
  | 'Growth Mindset' 
  | 'Vision & Strategy' 
  | 'Champion the Customer' 
  | 'Invest in People' 
  | 'Execute with Excellence';

export interface GreatQuestion {
  pillar: GreatPillar;
  text: string;
}

export interface GreatQuestionSet {
  level_key: string;
  level_label: string;
  questions: GreatQuestion[];
}

export interface GreatReflection {
  question_id: string;       // stable ID: `${level_key}__${pillar_slug}__${pillar_index}`
  pillar: GreatPillar;
  question_text: string;     // stored with response so audit history is intact across question revisions
  response: string;          // manager's written response (empty if skipped or N/A)
  not_applicable: boolean;
  not_applicable_reason?: string;
}

export interface MidYearCheckin {
  key_contributions: string;
  development_evolution: string;
  /** @deprecated use leadership_mastery for new reviews */
  great_reflections?: GreatReflection[];
  leadership_mastery?: string;
  performance_trending_rating?: string; // Moved to private but kept in type for UI convenience
  promotion_readiness?: 'ready_next_year_end' | 'ready_next_mid_year' | 'reassess_next_year' | null;
  additional_notes: string;
  submitted_at?: string;
  shared_at?: string;
  shared_by?: string;
}

export interface ManagerPrivateData {
  performance_trending_rating: string;
  promotion_readiness: 'ready_next_year_end' | 'ready_next_mid_year' | 'reassess_next_year' | null;
  additional_notes?: string;
  updated_at: string;
  manager_email: string;
  hrbp_email: string;
}

export interface Employee {
  id: string; // employee_email
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  gender?: string;
  employee_name: string;
  employee_email: string;
  hire_date?: string;
  last_promotion_date?: string;
  tenure_in_freshworks?: string;
  tenure_in_position?: string;
  tenure_in_job_profile?: string;
  termination_date?: string;
  num_direct_reports?: number | null;
  manager_name?: string;
  manager_email: string;
  hrbp_name?: string;
  hrbp_email?: string;
  job_title?: string;
  job_family?: string;
  work_location?: string;
  grade?: string;
  management_chain_l6?: string;
  management_chain_l7?: string;
  management_chain_l8?: string;
  management_chain_l9?: string;
  management_chain_l10?: string;
  rating_2024?: string;
  rating_2025?: string;
  
  // Feedback data
  mid_year_checkin?: MidYearCheckin;
  status: FeedbackStatus;
  updated_at?: string;
  acknowledged_at?: string;
}

export interface EmployeeAuditEntry {
  id?: string;
  employee_id: string;          // employee's email
  actor_email: string;          // who performed the action
  actor_name?: string | null;          // display name at time of action
  event_type: 'submit' | 'shared' | 'acknowledge' | 'admin_override';
  timestamp: string;            // ISO date
  snapshot?: MidYearCheckin;    // review content at time of event
  previous_snapshot?: MidYearCheckin;  // only for admin_override — state before the edit
  notes?: string;               // required for admin_override ("reason for override")
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}
