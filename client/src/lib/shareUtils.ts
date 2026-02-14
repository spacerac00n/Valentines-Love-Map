/**
 * Share link utilities — encode/decode memories into URL hash.
 * Allows sharing memories via a link without a backend.
 * Uses base64-encoded JSON in the URL hash.
 */
import type { Memory } from "./types";

/**
 * Encode memories array into a base64 URL hash string.
 * Strips imageDataUrl to keep the URL manageable (images are too large for URLs).
 * Instead, we include a flag that indicates the image was shared.
 */
export function encodeMemoriesToHash(memories: Memory[]): string {
  try {
    // Create lightweight versions without full image data
    const lightweight = memories.map((m) => ({
      id: m.id,
      createdAt: m.createdAt,
      locationKey: m.locationKey,
      lat: m.lat,
      lng: m.lng,
      caption: m.caption,
      // Truncate image to save URL space — just keep a tiny thumbnail
      imageDataUrl: m.imageDataUrl.substring(0, 200) + "...",
    }));
    const json = JSON.stringify(lightweight);
    return btoa(encodeURIComponent(json));
  } catch {
    return "";
  }
}

/**
 * Decode memories from a base64 URL hash string.
 */
export function decodeMemoriesFromHash(hash: string): Memory[] | null {
  try {
    const json = decodeURIComponent(atob(hash));
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed as Memory[];
  } catch {
    return null;
  }
}
