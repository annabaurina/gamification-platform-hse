import { apiClient, unwrapList } from "./client";
import { BonusEvent, BonusEventCreate, BonusEventReview, BonusEventStats } from "../types";

export async function getMyBonusEvents(): Promise<BonusEvent[]> {
  const { data } = await apiClient.get("/bonus-events/my/");
  return unwrapList<BonusEvent>(data);
}

export async function getPendingBonusEvents(): Promise<BonusEvent[]> {
  const { data } = await apiClient.get("/bonus-events/pending/");
  return unwrapList<BonusEvent>(data);
}

export async function getAllBonusEvents(): Promise<BonusEvent[]> {
  const { data } = await apiClient.get("/bonus-events/");
  return unwrapList<BonusEvent>(data);
}

export async function getBonusEventStats(): Promise<BonusEventStats> {
  const { data } = await apiClient.get<BonusEventStats>("/bonus-events/stats/");
  return data;
}

export async function createBonusEvent(payload: BonusEventCreate): Promise<BonusEvent> {
  const { data } = await apiClient.post<BonusEvent>("/bonus-events/", payload);
  return data;
}

export async function approveBonusEvent(
  id: number,
  payload: BonusEventReview
): Promise<BonusEvent> {
  const { data } = await apiClient.patch<BonusEvent>(`/bonus-events/${id}/approve/`, payload);
  return data;
}

export async function rejectBonusEvent(
  id: number,
  payload: BonusEventReview
): Promise<BonusEvent> {
  const { data } = await apiClient.patch<BonusEvent>(`/bonus-events/${id}/reject/`, payload);
  return data;
}
