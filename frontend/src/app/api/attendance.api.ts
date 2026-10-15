import { apiClient, unwrapList } from "./client";
import { Attendance, AttendanceCreate } from "../types";

export async function getAttendance(): Promise<Attendance[]> {
  const { data } = await apiClient.get("/attendance/");
  return unwrapList<Attendance>(data);
}

export async function createAttendance(payload: AttendanceCreate): Promise<Attendance> {
  const { data } = await apiClient.post<Attendance>("/attendance/", payload);
  return data;
}

export async function updateAttendance(
  id: number,
  payload: Partial<AttendanceCreate>
): Promise<Attendance> {
  const { data } = await apiClient.patch<Attendance>(`/attendance/${id}/`, payload);
  return data;
}

// Bulk-mark attendance for all students in a course group
// Returns: { status: "ok", created: N, total: N }
export async function markGroupAttendance(payload: {
  course_group_id: number;
  present_students: number[];
}): Promise<{ status: string; created: number; total: number }> {
  const { data } = await apiClient.post("/attendance/mark_group/", payload);
  return data;
}
