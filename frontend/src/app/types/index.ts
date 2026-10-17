// TypeScript types derived from backend api/serializers.py

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Student {
  id: number;
  user: User;
  full_name: string;
  total_points: number;
  is_headman: boolean;
}

export interface Group {
  id: number;
  name: string;
  students_count: number;
}

export interface StudentGroup {
  id: number;
  student: Student;
  group: Group;
  year: number;
}

export interface Discipline {
  id: number;
  name: string;
  code: string;
}

export interface CourseGroup {
  id: number;
  discipline: Discipline;
  group: Group;
  year: number;
  module: 1 | 2 | 3 | 4;
  module_display: string;
}

export interface Grade {
  id: number;
  student: Student;
  course_group: CourseGroup;
  score: number;
  date: string;
}

export interface GradeCreate {
  student: number;
  course_group: number;
  score: number;
}

export interface Attendance {
  id: number;
  student: Student;
  course_group: CourseGroup;
  date: string;
  is_present: boolean;
}

export interface AttendanceCreate {
  student: number;
  course_group: number;
  date: string;
  is_present: boolean;
}

export type BonusEventType = 'event' | 'olympiad' | 'achievement' | 'custom';
export type BonusEventStatus = 'pending' | 'approved' | 'rejected';

export interface BonusEvent {
  id: number;
  student: number;
  title: string;
  description: string;
  type: BonusEventType;
  type_display: string;
  proof: string;
  points_awarded: number;
  status: BonusEventStatus;
  status_display: string;
  admin_comment: string;
  date: string;
  reviewed_at: string | null;
}

export interface BonusEventCreate {
  title: string;
  description?: string;
  type: BonusEventType;
  proof?: string;
}

export interface BonusEventReview {
  points_awarded?: number;
  admin_comment?: string;
}

export interface BonusEventStats {
  pending: number;
  approved: number;
  rejected: number;
  total_points_awarded: number;
}

export interface StudentProgress {
  coins: number;
  maxCoins: number;
  percent: number;
  level: string;
  nextLevel: string;
  coinsToNextLevel: number;
  bestStudent: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface ApiError {
  detail?: string;
  [field: string]: string | string[] | undefined;
}

// DRF may return array or paginated object
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
