/**
 * Types & Interfaces for the Daehan Sillok (대한실록) App
 */

export type ActiveTab = "home" | "history" | "folktales";

/**
 * 역사 자료군 정책.
 * historical_books의 archive_category 컬럼과 대응됩니다.
 */
export type HistoricalArchiveCategory =
  | "joseon_sillok"
  | "seungjeongwon_ilgi"
  | "ilseongnok"
  | "translated_classic";

/**
 * 원문 탐색 방식 정책.
 * historical_books의 exploration_type 컬럼과 대응됩니다.
 */
export type HistoricalExplorationType =
  | "royal_chronicle_date"
  | "daily_record_date"
  | "literature_volume"
  | "literature_tree"
  | "unsupported";

/**
 * 자료별 기능 지원 상태.
 * historical_books의 support_status 컬럼과 대응됩니다.
 */
export type HistoricalSupportStatus = "supported" | "planned" | "disabled";

/**
 * Supabase historical_books 테이블 원본 Row 타입.
 * DB 컬럼명 그대로 snake_case를 사용합니다.
 */
export interface SupabaseHistoricalBookRow {
  id: string;
  title: string;
  dynasty: string;
  description: string;
  sort_order: number | null;
  is_active: boolean | null;
  archive_category?: HistoricalArchiveCategory | string | null;
  source_collection_id?: string | null;
  itkc_item_id?: string | null;
  itkc_cate1?: string | null;
  itkc_data_id?: string | null;
  itkc_data_gubun?: string | null;
  exploration_type?: HistoricalExplorationType | string | null;
  support_status?: HistoricalSupportStatus | string | null;
  uses_map?: boolean | null;
  uses_ai?: boolean | null;
}

/**
 * 앱 내부에서 사용하는 책 타입.
 * 책 목록, 간단 설명, 자료군별 탐색 정책을 담당합니다.
 */
export interface HistoricalBook {
  id: string;
  title: string;
  dynasty: string;
  description: string;
  sortOrder?: number | null;
  isActive?: boolean | null;
  archiveCategory?: HistoricalArchiveCategory;
  sourceCollectionId?: string | null;
  itkcItemId?: string | null;
  itkcCate1?: string | null;
  itkcDataId?: string | null;
  itkcDataGubun?: string | null;
  explorationType?: HistoricalExplorationType;
  supportStatus?: HistoricalSupportStatus;
  usesMap?: boolean;
  usesAi?: boolean;
}

/**
 * Supabase history_animation_points 테이블 원본 Row 타입.
 * DB 컬럼명 그대로 snake_case를 사용합니다.
 */
export interface SupabaseMapAnimationPointRow {
  id: number;
  book_id: string;
  sort_order: number | null;
  map_x: number;
  map_y: number;
  animation_duration_ms: number | null;
  pause_after_ms: number | null;
  animation_icon: string | null;
  movement_type: string | null;
  is_active: boolean | null;
  internal_label: string | null;
  created_at: string | null;
}

/**
 * 앱 내부에서 사용하는 지도 애니메이션 포인트 타입.
 * 지도 좌표와 애니메이션 동작에만 사용합니다.
 * 화면 텍스트, 사건 제목, 설명, AI 자문 내용에는 사용하지 않습니다.
 */
export interface MapAnimationPoint {
  id: number;
  bookId: string;
  sortOrder: number;
  mapX: number;
  mapY: number;
  animationDurationMs: number;
  pauseAfterMs: number;
  animationIcon: string;
  movementType: "linear" | "arc" | "fade" | string;
  isActive: boolean;
  internalLabel: string | null;
  createdAt: string | null;
}

export interface MythicalCreature {
  id: string;
  name: string;
  category:
    | "귀신"
    | "도깨비"
    | "인간/변신형"
    | "동물형"
    | "식물형"
    | "비생물형"
    | "거대괴수";
  tagline: string;
  description: string;
  habits: string;
  origin: string;
  glowingColor: string;
}
