import { apiClient, unwrapList } from "./client";
import { CourseGroup } from "../types";

export async function getCourseGroups(): Promise<CourseGroup[]> {
  const { data } = await apiClient.get("/course-groups/");
  return unwrapList<CourseGroup>(data);
}

export async function getCourseGroup(id: number): Promise<CourseGroup> {
  const { data } = await apiClient.get<CourseGroup>(`/course-groups/${id}/`);
  return data;
}

export async function createCourseGroup(payload: {
  discipline: number;
  group: number;
  year: number;
  module: 1 | 2 | 3 | 4;
}): Promise<CourseGroup> {
  const { data } = await apiClient.post<CourseGroup>("/course-groups/", payload);
  return data;
}

export async function updateCourseGroup(
  id: number,
  payload: Partial<{ discipline: number; group: number; year: number; module: 1 | 2 | 3 | 4 }>
): Promise<CourseGroup> {
  const { data } = await apiClient.patch<CourseGroup>(`/course-groups/${id}/`, payload);
  return data;
}

export async function deleteCourseGroup(id: number): Promise<void> {
  await apiClient.delete(`/course-groups/${id}/`);
}
