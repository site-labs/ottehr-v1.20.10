export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  UNKNOWN = 'unknown',
}

export interface WellnessRecord {
  /** LOINC for the document type (tolerate existing misspelling) */
  ioinc?: string; // e.g. "34133-9"
  loinc?: string; // preferred spelling if they start sending it

  /** Human-friendly type label, e.g., "Wellness Summary" */
  displayTitle?: string;

  /** High-level bucket: "survey", "laboratory", etc. */
  category?: string;

  /** ISO datetime for when the doc was finalized (used for sorting) */
  finalized_at?: string;

  /** Optional explicit list label; if missing we'll build one from type + date */
  doc_title?: string;

  /** Optional: URL variant if you sometimes send a link instead of base64 */
  pdf_url?: string;

  location_id?: string;
  first_name?: string;
  last_name?: string;
  order_id?: string;
  old_id?: string;
  opt_in?: number;
  patient_id?: string | null;
  practice_id?: string;
  external_order_id?: number;
  dob?: string;
  zip?: number;
  sex?: Gender;
  is_pregnant?: number;
  ethnicity?: string;
  race?: string;
  provider_text?: string;
  collection_date?: string;
  old_collection_date?: string | null;
  height?: string;
  weight?: string;
  bmi?: number;
  bp?: string;
  hr?: number;
  tc?: number;
  hdl?: number;
  ldl?: number;
  tri?: number;
  glucose?: number;
  a1c?: number;
  has_diabetes?: number;
  has_high_bp?: number;
  has_high_cholesterol?: number;
  has_copd?: number;
  has_kidney_disease?: number;
  has_heart_failure?: number;
  diagnosis?: string;
  has_pcp?: number;
  has_visited_pcp?: number;
  has_health_insurance?: number;
  smokes?: number;
  numbness_tingling?: number;
  updated?: string | null;
  updated_at?: string;
  abnormal_results?: string | null;
  given_pcp_flyer?: number;
  follow_up?: number;
  cone_follow_up?: number;
  ch_ref_visit_1?: number;
  ch_ref_visit_2?: number;
  ignore_order?: number;
  is_billed?: number;
  dont_bill?: number;
  deleted?: number;
  source?: string;
  fix_ignored?: string | null;
  ins_medicare?: number;
  ins_medicaid?: number;
  ins_commercial?: number;
  ins_other?: number;
  ins_multi?: number;
  insurance_type?: string;
  site?: string;
  pharmacy?: string;
  global_id?: string;
  entry_id?: number;
  age?: number;
  allergies?: string;
  has_seen_pcp?: string;
  has_insurance?: string;
  vapes?: string;
  phi_consent?: string;
  terms_of_service_consent?: string;
  signature?: string;
  test_date?: string;
  systolic?: string;
  diastolic?: string;
  subjective?: string;
  assessment?: string;
  plan?: string;
  approved_by?: string;
  approved?: string;
  status?: string;
  created_at?: string;
  submitted_at?: string;
  arc_status?: string;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  abnormal?: string;
  critical?: string;
  pdfContent?: string;
}

export interface ValidateWellnessResult {
  isValid: boolean;
  isPhoneValid?: boolean | null;
  isEmailValid?: boolean | null;
  isLocationValid?: boolean | null;
  data: {
    location: string | null;
    practitioner: string | null;
    errorMessage: string | null;
  };
}

export interface LogRecord {
  global_id: string;
  import_timestamp: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  zip: string;
  dob: string;
  action: string;
  user: string;
  patient: string;
  relatedPerson: string;
  person: string;
  appointment: string;
  encounter: string;
  documentReference: string;
  inviteCodeGenerated: string;
  practitioner: string;
  location: string;
  application: string;
}

export type Role = {
  id: string;
  name: string;
  memberCount: number;
};

export type ResultData = Record<string, any>;
