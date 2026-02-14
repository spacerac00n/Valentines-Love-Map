/**
 * Core data model for a memory pin on the Singapore Love Map.
 * Each memory represents a photo + caption at a specific Singapore location.
 */
export type Memory = {
  id: string;
  createdAt: number;
  memoryDate?: string; // ISO date string (YYYY-MM-DD) for when the memory happened
  locationKey: string; // from dropdown
  lat: number;
  lng: number;
  caption: string;
  imageDataUrl: string; // stored as compressed data URL
};
