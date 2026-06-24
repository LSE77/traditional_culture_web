import { MythicalCreature } from "../../types";


// Detailed list of 42 Mythical Creatures matching categories requested by User
export const MYTHICAL_CREATURES: MythicalCreature[] = [
  // 1. 귀신
  {
    id: "egg-ghost",
    name: "귀신이름",
    category: "귀신",
    tagline: "한 줄 설명",
    description: "묘사",
    habits: "습관",
    origin: "출처",
    stats: { mysticism: 85, power: 55, friendliness: 10 },
    glowingColor: "rgba(224, 242, 254, 1)"
  }
];
