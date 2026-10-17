import { apiClient, unwrapList } from "./client";
import { StudentGroup } from "../types";

export async function getStudentGroups(): Promise<StudentGroup[]> {
  const { data } = await apiClient.get("/student-groups/");
  return unwrapList<StudentGroup>(data);
}

export async function createStudentGroup(payload: {
  student: number;
  group: number;
  year: number;
}): Promise<StudentGroup> {
  const { data } = await apiClient.post<StudentGroup>("/student-groups/", payload);
  return data;
}

export async function deleteStudentGroup(id: number): Promise<void> {
  await apiClient.delete(`/student-groups/${id}/`);
}
