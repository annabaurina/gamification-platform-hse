import { apiClient, unwrapList } from "./client";
import { Grade, GradeCreate } from "../types";

export async function getGrades(): Promise<Grade[]> {
  const { data } = await apiClient.get("/grades/");
  return unwrapList<Grade>(data);
}

export async function getGrade(id: number): Promise<Grade> {
  const { data } = await apiClient.get<Grade>(`/grades/${id}/`);
  return data;
}

export async function createGrade(payload: GradeCreate): Promise<Grade> {
  const { data } = await apiClient.post<Grade>("/grades/", payload);
  return data;
}

export async function updateGrade(id: number, payload: Partial<GradeCreate>): Promise<Grade> {
  const { data } = await apiClient.patch<Grade>(`/grades/${id}/`, payload);
  return data;
}

export async function deleteGrade(id: number): Promise<void> {
  await apiClient.delete(`/grades/${id}/`);
}
