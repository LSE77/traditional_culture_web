import { HistoricalBook } from "../../types";
import { createMockEvents } from "./events";

const rawBookNames = [
  "승정원일기"
];

const bookDescriptions: Record<string, string> = {
  "책 내용": "책 설명"
};

// Seed 32 books
export const HISTORICAL_BOOKS: HistoricalBook[] = rawBookNames.map((name, idx) => {
  const colorGradients = [
    "from-[#471E19] to-[#250906]", // Deep mahogany
    "from-[#382E1C] to-[#1E170C]", // Amber wood
    "from-[#2B1B17] to-[#140A07]", // Dark chestnut
    "from-[#522915] to-[#2B1205]", // Reddish wood
    "from-[#4A1510] to-[#260502]", // Royal crimson dark
    "from-[#3D3A37] to-[#1F1D1B]"  // Antique charcoal
  ];
  return {
    id: `book-${idx}`,
    title: `${name} (${name.length === 5 ? "登記冊" : "日誌"})`,
    dynasty: idx % 3 === 0 ? "조선초기" : idx % 3 === 1 ? "조선중기" : "조선후기",
    description: bookDescriptions[name] || `${name}은(는) 조선 왕조 통치의 엄정한 기틀과 백성들의 목소리를 성실히 기록한 기록서입니다.`,
    coverColor: colorGradients[idx % colorGradients.length],
    accentColor: idx % 2 === 0 ? "#8B2518" : "#D4AF37",
    events: createMockEvents(name, idx)
  };
});
