/**
 * Hardcoded list of popular Singapore locations with coordinates.
 * Used for the location picker dropdown in the Add Memory form.
 */
export interface SGLocation {
  key: string;
  name: string;
  lat: number;
  lng: number;
}

export const SG_LOCATIONS: SGLocation[] = [
  { key: "marina-bay", name: "Marina Bay", lat: 1.2814, lng: 103.8585 },
  { key: "orchard", name: "Orchard Road", lat: 1.3048, lng: 103.8318 },
  { key: "sentosa", name: "Sentosa", lat: 1.2494, lng: 103.8303 },
  { key: "gardens-by-the-bay", name: "Gardens by the Bay", lat: 1.2816, lng: 103.8636 },
  { key: "bugis", name: "Bugis", lat: 1.3009, lng: 103.8558 },
  { key: "changi-airport", name: "Changi Airport", lat: 1.3644, lng: 103.9915 },
  { key: "nus", name: "NUS", lat: 1.2966, lng: 103.7764 },
  { key: "ntu", name: "NTU", lat: 1.3483, lng: 103.6831 },
  { key: "tampines", name: "Tampines", lat: 1.3496, lng: 103.9568 },
  { key: "jurong-east", name: "Jurong East", lat: 1.3329, lng: 103.7436 },
  { key: "punggol", name: "Punggol", lat: 1.4041, lng: 103.9025 },
  { key: "woodlands", name: "Woodlands", lat: 1.4382, lng: 103.7891 },
  { key: "chinatown", name: "Chinatown", lat: 1.2833, lng: 103.8433 },
  { key: "little-india", name: "Little India", lat: 1.3066, lng: 103.8518 },
  { key: "clarke-quay", name: "Clarke Quay", lat: 1.2906, lng: 103.8465 },
  { key: "east-coast-park", name: "East Coast Park", lat: 1.3008, lng: 103.9123 },
  { key: "botanic-gardens", name: "Botanic Gardens", lat: 1.3138, lng: 103.8159 },
  { key: "merlion-park", name: "Merlion Park", lat: 1.2868, lng: 103.8545 },
  { key: "haji-lane", name: "Haji Lane", lat: 1.3016, lng: 103.8595 },
  { key: "holland-village", name: "Holland Village", lat: 1.3112, lng: 103.7960 },
];
