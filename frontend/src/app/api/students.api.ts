import { apiClient, unwrapList } from "./client";
import { Student } from "../types";

export async function getStudents(): Promise<Student[]> {
  const { data } = await apiClient.get("/students/");
  return unwrapList<Student>(data);
}

export async function getStudent(id: number): Promise<Student> {
  const { data } = await apiClient.get<Student>(`/students/${id}/`);
  return data;
}

export async function createStudent(payload: {
  username: string;
  first_name: string;
  last_name: string;
  email?: string;
  password: string;
  is_headman?: boolean;
}): Promise<Student> {
  const { data } = await apiClient.post<Student>("/students/", payload);
  return data;
}

export async function updateStudent(
  id: number,
  payload: Partial<{ total_points: number; is_headman: boolean }>
): Promise<Student> {
  const { data } = await apiClient.patch<Student>(`/students/${id}/`, payload);
  return data;
}

export async function deleteStudent(id: number): Promise<void> {
  await apiClient.delete(`/students/${id}/`);
}
