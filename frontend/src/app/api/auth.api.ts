import axios from "axios";
import { AuthTokens } from "../types";

const BASE_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : "http://127.0.0.1:8000/api";

export async function obtainTokens(username: string, password: string): Promise<AuthTokens> {
  const { data } = await axios.post<AuthTokens>(`${BASE_URL}/token/`, { username, password });
  return data;
}

export async function refreshTokens(refresh: string): Promise<{ access: string }> {
  const { data } = await axios.post<{ access: string }>(`${BASE_URL}/token/refresh/`, { refresh });
  return data;
}

// Decode JWT payload (SimpleJWT puts user_id in the payload)
export function decodeJwtPayload(token: string): { user_id?: number; [key: string]: unknown } {
  try {
    const part = token.split(".")[1];
    const padded = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return {};
  }
}
