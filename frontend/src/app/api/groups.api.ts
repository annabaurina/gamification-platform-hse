import { apiClient, unwrapList } from "./client";
import { Group } from "../types";

export async function getGroups(): Promise<Group[]> {
  const { data } = await apiClient.get("/groups/");
  return unwrapList<Group>(data);
}

export async function getGroup(id: number): Promise<Group> {
  const { data } = await apiClient.get<Group>(`/groups/${id}/`);
  return data;
}

export async function createGroup(payload: { name: string }): Promise<Group> {
  const { data } = await apiClient.post<Group>("/groups/", payload);
  return data;
}

export async function updateGroup(id: number, payload: { name: string }): Promise<Group> {
  const { data } = await apiClient.patch<Group>(`/groups/${id}/`, payload);
  return data;
}

export async function deleteGroup(id: number): Promise<void> {
  await apiClient.delete(`/groups/${id}/`);
}
