import { apiClient, unwrapList } from "./client";
import { Discipline } from "../types";

export async function getDisciplines(): Promise<Discipline[]> {
  const { data } = await apiClient.get("/disciplines/");
  return unwrapList<Discipline>(data);
}

export async function getDiscipline(id: number): Promise<Discipline> {
  const { data } = await apiClient.get<Discipline>(`/disciplines/${id}/`);
  return data;
}

export async function createDiscipline(payload: { name: string; code?: string }): Promise<Discipline> {
  const { data } = await apiClient.post<Discipline>("/disciplines/", payload);
  return data;
}

export async function updateDiscipline(
  id: number,
  payload: { name?: string; code?: string }
): Promise<Discipline> {
  const { data } = await apiClient.patch<Discipline>(`/disciplines/${id}/`, payload);
  return data;
}

export async function deleteDiscipline(id: number): Promise<void> {
  await apiClient.delete(`/disciplines/${id}/`);
}
