// Registration Types
export type RegistrationType =
  | 'team_with_idea'
  | 'individual_with_idea'
  | 'individual_no_idea'
  | 'team_no_idea'

// Project Field / Competition Types
export type ProjectField =
  | 'مسابقة التنقل الذكي'
  | 'مسابقة ابتكار التكنولوجيا الحيوية'
  | 'مسابقة تقنيات البيئة والطاقة'
  | 'مسابقة تقنيات التعليم'
  | 'مسابقة تقنيات المعيشة الخالية من العوائق'
  | 'مسابقة أفكار التكنولوجيا المالية'
  | 'مسابقة التكنولوجيا لصالح البشرية'
  | 'مسابقة تطبيقات التكنولوجيا في علم النفس'
  | 'مسابقة الذكاء الاصطناعي في الصحة'
  | 'مسابقة التقنيات الصناعية'
  | 'مسابقة التكنولوجيا الزراعية'
  | 'مسابقة هاكاثون السفر'
  | 'مسابقة تقنيات السياحة'
  | 'مسابقة معالجة اللغة التركية'
  | 'مسابقة الذكاء الاصطناعي في النقل'
  | 'مسابقة تطبيقات نماذج اللغة الضخمة'
  | 'مسابقة تقنيات أنظمة الدفاع الجويّة'

export type Gender = 'male' | 'female'

export const PROJECT_FIELDS: { value: ProjectField; label: string; labelEn: string }[] = [
  { value: 'مسابقة التنقل الذكي', label: 'مسابقة التنقل الذكي', labelEn: 'Smart Mobility Competition' },
  { value: 'مسابقة ابتكار التكنولوجيا الحيوية', label: 'مسابقة ابتكار التكنولوجيا الحيوية', labelEn: 'Biotechnology Innovation Competition' },
  { value: 'مسابقة تقنيات البيئة والطاقة', label: 'مسابقة تقنيات البيئة والطاقة', labelEn: 'Environment and Energy Technologies Competition' },
  { value: 'مسابقة تقنيات التعليم', label: 'مسابقة تقنيات التعليم', labelEn: 'Education Technologies Competition' },
  { value: 'مسابقة تقنيات المعيشة الخالية من العوائق', label: 'مسابقة تقنيات المعيشة الخالية من العوائق', labelEn: 'Barrier-Free Living Technologies Competition' },
  { value: 'مسابقة أفكار التكنولوجيا المالية', label: 'مسابقة أفكار التكنولوجيا المالية', labelEn: 'Financial Technologies (FinTech) Ideas Competition' },
  { value: 'مسابقة التكنولوجيا لصالح البشرية', label: 'مسابقة التكنولوجيا لصالح البشرية', labelEn: 'Technology for Humanity Competition' },
  { value: 'مسابقة تطبيقات التكنولوجيا في علم النفس', label: 'مسابقة تطبيقات التكنولوجيا في علم النفس', labelEn: 'Technological Applications in Psychology Competition' },
  { value: 'مسابقة الذكاء الاصطناعي في الصحة', label: 'مسابقة الذكاء الاصطناعي في الصحة', labelEn: 'Artificial Intelligence in Healthcare Competition' },
  { value: 'مسابقة التقنيات الصناعية', label: 'مسابقة التقنيات الصناعية', labelEn: 'Industrial Digital Technologies Competition' },
  { value: 'مسابقة التكنولوجيا الزراعية', label: 'مسابقة التكنولوجيا الزراعية', labelEn: 'Agricultural Technologies Competition' },
  { value: 'مسابقة هاكاثون السفر', label: 'مسابقة هاكاثون السفر', labelEn: 'Travel Hackathon Competition' },
  { value: 'مسابقة تقنيات السياحة', label: 'مسابقة تقنيات السياحة', labelEn: 'Tourism Technologies Competition' },
  { value: 'مسابقة معالجة اللغة التركية', label: 'مسابقة معالجة اللغة التركية', labelEn: 'Turkish Natural Language Processing Competition' },
  { value: 'مسابقة الذكاء الاصطناعي في النقل', label: 'مسابقة الذكاء الاصطناعي في النقل', labelEn: 'Artificial Intelligence in Transportation Competition' },
  { value: 'مسابقة تطبيقات نماذج اللغة الضخمة', label: 'مسابقة تطبيقات نماذج اللغة الضخمة', labelEn: 'Large Language Model Applications – T3 AI Hackathon' },
  { value: 'مسابقة تقنيات أنظمة الدفاع الجويّة', label: 'مسابقة تقنيات أنظمة الدفاع الجويّة', labelEn: 'Air Defense Systems Technologies Competition' },
]

// Team Member
export interface TeamMember {
  id?: number
  full_name: string
  email: string
  phone: string
  is_leader: boolean
  team_id?: number
  created_at?: string
  membership_number?: string
}

// Team
export interface Team {
  id?: number
  team_name: string
  registration_type: RegistrationType
  field: ProjectField
  initial_idea?: string
  telegram_group_link?: string
  is_active?: boolean
  created_at?: string
  members: TeamMember[]
  gender: Gender
}

// Individual
export interface Individual {
  id?: number
  registration_type: RegistrationType
  full_name: string
  email: string
  phone: string
  technical_skills: string
  interests: string
  experience_level: string
  preferred_field: ProjectField
  project_idea?: string
  assigned_team_id?: number
  is_assigned?: boolean
  created_at?: string
  gender: Gender
}

// Project Submission Create (using email to find team)
export interface ProjectSubmissionCreate {
  member_email: string
  title: string
  problem_statement: string
  technical_description: string
  scientific_reference: string
  field: ProjectField
}

// Project Submission Response
export interface ProjectSubmission {
  id?: number
  team_id: number
  program_version_id?: number
  submission_version?: number
  title: string
  problem_statement: string
  technical_description: string
  scientific_reference: string
  field: ProjectField
  image_path?: string
  diagram_path?: string
  design_path?: string
  has_attachments?: boolean
  is_complete?: boolean
  is_featured?: boolean
  character_count?: number
  created_at?: string
  updated_at?: string
  team?: Team
  total_score?: number
  admin_score?: number
  ai_score?: number
}

// Evaluation
export interface Evaluation {
  id?: number
  project_id: number
  admin_id?: number
  is_ai_evaluation: boolean
  score: number
  notes?: string
  detailed_scores?: Record<string, number>
  created_at?: string
}

// Admin
export interface Admin {
  id?: number
  username: string
  email: string
  full_name: string
  evaluation_weight: number
  is_active?: boolean
  is_superadmin?: boolean
  created_at?: string
}

// Auth
export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterCredentials {
  username: string
  email: string
  password: string
  full_name: string
  registration_code: string
}

export interface AuthToken {
  access_token: string
  token_type: string
}

// Top Team
export interface TopTeam {
  rank: number
  project_title: string
  project_description: string
  field: ProjectField
  team_name: string
  team_members: string[]
  total_score: number
  admin_score: number
  ai_score: number
}

// Team with available space
export interface TeamWithSpace {
  id: number
  team_name: string
  field: ProjectField
  member_count: number
  available_slots: number
  members: {
    id: number
    full_name: string
    email: string
    is_leader: boolean
  }[]
  gender: Gender
}
