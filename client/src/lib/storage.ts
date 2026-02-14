/**
 * localStorage utility for persisting memories across sessions.
 * Handles save, load, delete, and reset operations.
 */
import type { Memory } from "./types";

const STORAGE_KEY = "singapore-love-map-memories";

export function loadMemories(): Memory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Memory[];
  } catch {
    return [];
  }
}

export function saveMemories(memories: Memory[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  } catch (e) {
    console.warn("Failed to save memories to localStorage:", e);
  }
}

export function addMemory(memory: Memory): Memory[] {
  const existing = loadMemories();
  const updated = [...existing, memory];
  saveMemories(updated);
  return updated;
}

export function deleteMemory(id: string): Memory[] {
  const existing = loadMemories();
  const updated = existing.filter((m) => m.id !== id);
  saveMemories(updated);
  return updated;
}

export function clearAllMemories(): void {
  localStorage.removeItem(STORAGE_KEY);
}
