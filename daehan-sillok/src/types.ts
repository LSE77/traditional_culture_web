/**
 * Types & Interfaces for the Daehan Sillok (대한실록) App
 */

export type ActiveTab = "home" | "history" | "folktales";

export interface HistoricalEvent {
  id: string;
  title: string;
  year: number;
  dateStr: string;
  mapX: number; // 0-100 percentage layout position
  mapY: number; // 0-100 percentage layout position
  locationName: string;
  description: string;
  details: string[];
  category: "정치" | "외교" | "반란" | "문화" | "조영";
  iconName: "swords" | "crown" | "flag" | "scroll" | "home";
  aiExplanation?: string;
}

export interface HistoricalBook {
  id: string;
  title: string;
  dynasty: string;
  description: string;
  coverColor: string; // Hex color for traditional representation
  accentColor: string;
  events: HistoricalEvent[];
}

export interface MythicalCreature {
  id: string;
  name: string;
  category: "귀신" | "도깨비" | "인간/변신형" | "동물형" | "식물형" | "비생물형" | "거대괴수";
  tagline: string;
  description: string;
  habits: string; // 습성
  origin: string; // 출전 문헌
  stats: {
    mysticism: number; // 신비성 (0-100)
    power: number;     // 위력
    friendliness: number; // 인간 친화력
  };
  glowingColor: string; // Accent color (e.g., cyan/teal-blue)
  quotes: string; // 어록이나 전승 구절
}
