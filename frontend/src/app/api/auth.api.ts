import axios from "axios";
import type { AuthTokens, Student } from "../types";
import { apiClient } from "./client";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/+$/, "");

export type BackendRole = "student" | "starosta" | "admin" | "unassigned";

/** Response from GET /api/students/me/. Role must be computed by the backend. */
export interface CurrentAccount {
  user_id: number;
  username: string;
  first_name: string;
  last_name: string;
  is_staff: boolean;
  is_superuser: boolean;
  role: BackendRole;
  student_id: number | null;
  student: Student | null;
}

export async function obtainTokens(username: string, password: string): Promise<AuthTokens> {
  const { data } = await axios.post<AuthTokens>(`${BASE_URL}/token/`, {
    username,
    password,
  });
  return data;
}

export async function refreshTokens(refresh: string): Promise<{ access: string }> {
  const { data } = await axios.post<{ access: string }>(`${BASE_URL}/token/refresh/`, {
    refresh,
  });
  return data;
}

/**
 * Fetch authenticated account details from the backend. Do not infer a role from
 * the public leaderboard or from unverified JWT payload data.
 */
export async function getCurrentAccount(): Promise<CurrentAccount> {
  const { data } = await apiClient.get<CurrentAccount>("/students/me/");
  return data;
}
