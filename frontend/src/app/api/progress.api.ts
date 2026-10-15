import { apiClient } from "./client";
import { StudentProgress } from "../types";

export async function getMyProgress(): Promise<StudentProgress> {
  const { data } = await apiClient.get<StudentProgress>("/progress/my_progress/");
  return data;
}
