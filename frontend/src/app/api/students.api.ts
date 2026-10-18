import { apiClient, unwrapList } from "./client";
import type { Student, User } from "../types";

/** Safe fields returned by the non-admin GET /students/ leaderboard response. */
export interface LeaderboardStudent {
  id: number;
  full_name: string;
  total_points: number;
}

export async function getStudents(): Promise<LeaderboardStudent[]> {
  const { data } = await apiClient.get("/students/");
  // Non-admins receive {id, full_name, total_points}; admins receive the full
  // StudentSerializer output, which also contains these fields.
  return unwrapList<LeaderboardStudent>(data);
}

export async function getStudent(id: number): Promise<Student> {
  const { data } = await apiClient.get<Student>(`/students/${id}/`);
  return data;
}

export interface CreateStudentPayload {
  username: string;
  first_name: string;
  last_name: string;
  email?: string;
  password: string;
  is_headman?: boolean;
}

export async function createStudent(payload: CreateStudentPayload): Promise<Student> {
  // StudentSerializer accepts a nested user object, not a flat username/password body.
  const body = {
    user: {
      username: payload.username,
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email ?? "",
      password: payload.password,
    },
    is_headman: payload.is_headman ?? false,
  };
  const { data } = await apiClient.post<Student>("/students/", body);
  return data;
}

export interface UpdateStudentPayload {
  user?: Partial<Pick<User, "username" | "first_name" | "last_name" | "email">> & {
    password?: string;
  };
  is_headman?: boolean;
}

export async function updateStudent(
  id: number,
  payload: UpdateStudentPayload,
): Promise<Student> {
  const { data } = await apiClient.patch<Student>(`/students/${id}/`, payload);
  return data;
}

export async function deleteStudent(id: number): Promise<void> {
  await apiClient.delete(`/students/${id}/`);
}
