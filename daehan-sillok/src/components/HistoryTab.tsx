import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  HistoricalArchiveCategory,
  HistoricalBook,
  HistoricalExplorationType,
  HistoricalSupportStatus,
  MapAnimationPoint,
} from "../types";
import { supabase } from "../lib/supabaseClient";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  ArrowLeft,
  BookOpen, 
  MapPin, 
  Sparkles
} from "lucide-react";
//----------------------------------------------------------- 조선왕조실록 연동
import ClassicArchiveBrowser, { getRoyalRecordKingOptions } from "./ClassicArchiveBrowser";
import ClassicRecordViewer from "./ClassicRecordViewer";
import TranslatedClassicTreeBrowser from "./TranslatedClassicTreeBrowser";
import type { ClassicDateSelection, ClassicRecord } from "../types/classics";
import { fetchItkcTreeNodes } from "../lib/itkcTreeApi";
import type { ClassicTreeNode } from "../lib/itkcTreeParser";
import { fetchItkcNodeArticles } from "../lib/itkcNodeApi";
import { makeRoyalRecordKingNodeId } from "../lib/classicDataId";

interface HistoryTabProps {
  onMapPlayerToggle?: (isActive: boolean) => void;
}

type SupabaseBookRow = {
  id: string;
  title: string;
  dynasty: string;
  description: string;
  sort_order: number | null;
  is_active: boolean | null;
  archive_category?: string | null;
  source_collection_id?: string | null;
  itkc_item_id?: string | null;
  itkc_cate1?: string | null;
  itkc_data_id?: string | null;
  itkc_data_gubun?: string | null;
  exploration_type?: string | null;
  support_status?: string | null;
  uses_map?: boolean | null;
  uses_ai?: boolean | null;
};

type SupabaseAnimationPointRow = {
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
};

const ARCHIVE_CATEGORY_LABELS: Record<HistoricalArchiveCategory, string> = {
  joseon_sillok: "조선왕조실록",
  seungjeongwon_ilgi: "승정원일기",
  ilseongnok: "일성록",
  translated_classic: "고전번역서",
};

const EXPLORATION_TYPE_LABELS: Record<HistoricalExplorationType, string> = {
  royal_chronicle_date: "왕대 · 재위년 · 월 · 일 · 기사",
  daily_record_date: "날짜 · 기사",
  literature_volume: "문헌 · 권차 · 본문",
  literature_tree: "문헌 · 항목 · 본문",
  unsupported: "원문 탐색 준비 중",
};

const isArchiveCategory = (value: string | null | undefined): value is HistoricalArchiveCategory => {
  return (
    value === "joseon_sillok" ||
    value === "seungjeongwon_ilgi" ||
    value === "ilseongnok" ||
    value === "translated_classic"
  );
};

const isExplorationType = (value: string | null | undefined): value is HistoricalExplorationType => {
  return (
    value === "royal_chronicle_date" ||
    value === "daily_record_date" ||
    value === "literature_volume" ||
    value === "literature_tree" ||
    value === "unsupported"
  );
};

const isSupportStatus = (value: string | null | undefined): value is HistoricalSupportStatus => {
  return value === "supported" || value === "planned" || value === "disabled";
};

const inferArchiveCategory = (book: SupabaseBookRow): HistoricalArchiveCategory => {
  if (isArchiveCategory(book.archive_category)) {
    return book.archive_category;
  }

  const target = `${book.id} ${book.title}`;

  if (target.includes("조선왕조실록") || target.includes("sillok")) {
    return "joseon_sillok";
  }

  if (target.includes("승정원일기") || target.includes("seungjeongwon")) {
    return "seungjeongwon_ilgi";
  }

  if (target.includes("일성록") || target.includes("ilseongnok")) {
    return "ilseongnok";
  }

  return "translated_classic";
};

const inferExplorationType = (
  category: HistoricalArchiveCategory,
  value?: string | null
): HistoricalExplorationType => {
  if (isExplorationType(value)) {
    return value;
  }

  if (category === "joseon_sillok") {
    return "royal_chronicle_date";
  }

  if (category === "seungjeongwon_ilgi" || category === "ilseongnok") {
    return "daily_record_date";
  }

  return "literature_tree";
};

const inferSupportStatus = (
  category: HistoricalArchiveCategory,
  value?: string | null
): HistoricalSupportStatus => {
  if (isSupportStatus(value)) {
    return value;
  }

  return category === "joseon_sillok" ? "supported" : "planned";
};

const getDefaultSourceCollectionId = (category: HistoricalArchiveCategory) => {
  if (category === "joseon_sillok") return "joseon-sillok";
  if (category === "seungjeongwon_ilgi") return "seungjeongwon-ilgi";
  if (category === "ilseongnok") return "ilseongnok";
  return "translated-classic";
};

const getArchiveCategoryLabel = (category?: HistoricalArchiveCategory | null) => {
  return ARCHIVE_CATEGORY_LABELS[category ?? "translated_classic"];
};

const getExplorationTypeLabel = (type?: HistoricalExplorationType | null) => {
  return EXPLORATION_TYPE_LABELS[type ?? "unsupported"];
};

const isDateRecordExplorerReady = (book: HistoricalBook | null) => {
  if (!book || book.supportStatus !== "supported") {
    return false;
  }

  return (
    (book.archiveCategory === "joseon_sillok" &&
      book.explorationType === "royal_chronicle_date") ||
    ((book.archiveCategory === "seungjeongwon_ilgi" ||
      book.archiveCategory === "ilseongnok") &&
      book.explorationType === "daily_record_date")
  );
};

const isLiteratureTreeExplorerReady = (book: HistoricalBook | null) => {
  if (!book || book.supportStatus !== "supported") {
    return false;
  }

  return (
    book.archiveCategory === "translated_classic" &&
    book.explorationType === "literature_tree"
  );
};

const getDateRecordItemId = (book: HistoricalBook | null) => {
  return (book?.itkcItemId || "JT").trim().toUpperCase();
};

const getDateRecordCollectionId = (book: HistoricalBook | null) => {
  return book?.sourceCollectionId || book?.id || "joseon-sillok";
};

function convertBookRowsToBooks(bookRows: SupabaseBookRow[]): HistoricalBook[] {
  return bookRows.map((book) => {
    const archiveCategory = inferArchiveCategory(book);
    const explorationType = inferExplorationType(
      archiveCategory,
      book.exploration_type
    );
    const supportStatus = inferSupportStatus(
      archiveCategory,
      book.support_status
    );

    return {
      id: book.id,
      title: book.title,
      dynasty: book.dynasty,
      description: book.description,
      sortOrder: book.sort_order ?? null,
      isActive: book.is_active ?? true,
      archiveCategory,
      sourceCollectionId:
        book.source_collection_id ?? getDefaultSourceCollectionId(archiveCategory),
      itkcItemId: book.itkc_item_id ?? null,
      itkcCate1: book.itkc_cate1 ?? null,
      itkcDataId: book.itkc_data_id ?? null,
      itkcDataGubun: book.itkc_data_gubun ?? null,
      explorationType,
      supportStatus,
      usesMap: book.uses_map ?? archiveCategory === "joseon_sillok",
      usesAi: book.uses_ai ?? true,
    };
  });
}

function convertAnimationPointRows(
  pointRows: SupabaseAnimationPointRow[]
): MapAnimationPoint[] {
  return pointRows.map((point) => ({
    id: Number(point.id),
    bookId: point.book_id,
    sortOrder: point.sort_order ?? 0,
    mapX: Number(point.map_x),
    mapY: Number(point.map_y),
    animationDurationMs: point.animation_duration_ms ?? 2500,
    pauseAfterMs: point.pause_after_ms ?? 700,
    animationIcon: point.animation_icon ?? "map-pin",
    movementType: point.movement_type ?? "linear",
    isActive: point.is_active ?? true,
    internalLabel: point.internal_label ?? null,
    createdAt: point.created_at ?? null,
  }));
}


const buildClassicSelectionLabel = (selection: ClassicDateSelection) => {
  const parts: string[] = [];

  if (selection.kingName) parts.push(selection.kingName);
  if (selection.reignYear) parts.push(`${selection.reignYear}년`);
  if (selection.month) parts.push(`${selection.isLeapMonth ? "윤" : ""}${selection.month}월`);
  if (selection.day) parts.push(`${selection.day}일`);

  return parts.join(" ");
};

const makeClassicSelectionKey = (selection: ClassicDateSelection) => {
  return [
    selection.collectionId,
    selection.kingName ?? "",
    selection.reignYear ?? "",
    selection.month ?? "",
    selection.day ?? "",
    selection.isLeapMonth ? "leap" : "normal",
    selection.dateNodeId ?? "",
  ].join("|");
};


type ClassicRecordPickMode = "first" | "last";

type SelectClassicDateOptions = {
  pick?: ClassicRecordPickMode;
};

const getReignYearFromTreeNode = (node: ClassicTreeNode) => {
  const labelMatch = node.label.match(/(\d+)년/);
  if (labelMatch) {
    return Number(labelMatch[1]);
  }

  const idMatch = node.dataId.match(/_A(\d{2})$/);
  if (idMatch) {
    return Number(idMatch[1]);
  }

  return null;
};

const getMonthFromTreeNode = (node: ClassicTreeNode) => {
  const labelMatch = node.label.match(/(\d+)월/);
  if (labelMatch) {
    return Number(labelMatch[1]);
  }

  const idMatch = node.dataId.match(/_(\d{2})[AB]$/);
  if (idMatch) {
    return Number(idMatch[1]);
  }

  return null;
};

const getIsLeapMonthFromTreeNode = (node: ClassicTreeNode) => {
  if (node.label.includes("윤")) {
    return true;
  }

  return /_\d{2}B$/.test(node.dataId);
};

const getDayFromTreeNode = (node: ClassicTreeNode) => {
  const labelMatch = node.label.match(/(\d+)일/);
  if (labelMatch) {
    return Number(labelMatch[1]);
  }

  const idMatch = node.dataId.match(/_(\d{2})A$/);
  if (idMatch) {
    return Number(idMatch[1]);
  }

  return null;
};

const normalizeClassicKingName = (kingName: string) => {
  return kingName
    .replace(/\s/g, "")
    .replace(/[()（）]/g, "")
    .replace(/실록/g, "")
    .replace(/일기/g, "")
    .replace(/대왕/g, "")
    .trim();
};

const isSameKingName = (left: string, right: string) => {
  return normalizeClassicKingName(left) === normalizeClassicKingName(right);
};

function ArchivePolicyNotice({ book }: { book: HistoricalBook | null }) {
  const categoryLabel = getArchiveCategoryLabel(book?.archiveCategory ?? null);
  const explorationLabel = getExplorationTypeLabel(book?.explorationType ?? null);

  return (
    <div className="h-full min-h-[260px] flex flex-col justify-center border border-[#D4AF37]/15 bg-[#1C0604] px-6 py-8 text-center space-y-4">
      <BookOpen className="w-8 h-8 text-[#D4AF37]/70 mx-auto" />
      <div className="space-y-1.5">
        <p className="text-sm text-[#D4AF37] font-serif font-black">
          {book?.title?.split(" (")[0] ?? "선택한 사료"} 원문 탐색 준비 중
        </p>
        <p className="text-xs text-[#DEC5AC] font-serif leading-relaxed max-w-md mx-auto">
          이 항목은 {categoryLabel} 자료군으로 분류되어 있습니다. 현재는 조선왕조실록 탐색기와 분리되어 있으며, 해당 자료군에 맞는 원문 탐색 화면을 별도로 준비합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md mx-auto w-full text-left">
        <div className="bg-[#310D0A] border border-[#D4AF37]/15 p-3">
          <span className="block text-[9px] text-[#D4AF37] font-serif font-black tracking-widest uppercase">
            자료군
          </span>
          <span className="block text-xs text-white font-serif mt-1">
            {categoryLabel}
          </span>
        </div>
        <div className="bg-[#310D0A] border border-[#D4AF37]/15 p-3">
          <span className="block text-[9px] text-[#D4AF37] font-serif font-black tracking-widest uppercase">
            탐색 정책
          </span>
          <span className="block text-xs text-white font-serif mt-1">
            {explorationLabel}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-[#BFA98C] font-serif leading-relaxed max-w-lg mx-auto text-justify">
        {book?.description || "자료 설명이 아직 등록되지 않았습니다."}
      </p>
    </div>
  );
}

export default function HistoryTab({ onMapPlayerToggle }: HistoryTabProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Local state to manage toggled book selection for transit page
  const [activeBookId, setActiveBookId] = useState<string>("");

  // History data source: Supabase first, data.ts fallback if DB is empty or unreachable
  const [books, setBooks] = useState<HistoricalBook[]>([]);
  const [animationPoints, setAnimationPoints] = useState<MapAnimationPoint[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string>("");
  // Toggle between transit select directory page and interactive map screen
  const [showMapPlayer, setShowMapPlayer] = useState<boolean>(false);

  // Sync map player status to parent App layout
  useEffect(() => {
    if (onMapPlayerToggle) {
      onMapPlayerToggle(showMapPlayer);
    }
  }, [showMapPlayer, onMapPlayerToggle]);

  // Active event index matching the current timeline node
  const [activeIndex, setActiveIndex] = useState(0);

  // Map popup control - starts false so when entering map it does not show automatically
  const [showPopup, setShowPopup] = useState(false);

  // Playback control
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2500); // ms per step
  const animationFrameRef = useRef<number | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [movingFromIndex, setMovingFromIndex] = useState(0);
  const [movingToIndex, setMovingToIndex] = useState(0);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [isWaitingBetweenMoves, setIsWaitingBetweenMoves] = useState(false);
  // 자동재생은 마지막 사건에서 처음으로 순간 점프하지 않고,
  // 끝에 도달하면 방향을 반대로 바꿔 왕복 재생한다. <-- 왜 이딴 방식을...
  const playbackDirectionRef = useRef<1 | -1>(1);

  // Dynamic AI commentary states
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiCache, setAiCache] = useState<Record<string, string>>({});

  // Map Pan and Zoom states
  const [scale, setScale] = useState<number>(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });


    //--------------------------------------------------------------국문종합DB 연결
  // Get active book and map animation points
  const currentBook = activeBookId
    ? books.find((book) => book.id === activeBookId) ?? null
    : null;

  const activeAnimationPoints = useMemo(() => {
    return animationPoints
      .filter((point) => point.bookId === activeBookId && point.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [animationPoints, activeBookId]);

  const currentArchiveCategoryLabel = getArchiveCategoryLabel(
    currentBook?.archiveCategory ?? null
  );
  const currentExplorationTypeLabel = getExplorationTypeLabel(
    currentBook?.explorationType ?? null
  );
  const shouldUseDateRecordExplorer = isDateRecordExplorerReady(currentBook);
  const shouldUseLiteratureTreeExplorer = isLiteratureTreeExplorerReady(currentBook);
  const currentItkcItemId = getDateRecordItemId(currentBook);
  const currentCollectionId = getDateRecordCollectionId(currentBook);


  const [classicSelection, setClassicSelection] = useState<ClassicDateSelection>({
    collectionId: currentCollectionId,
    kingName: "",
    reignYear: null,
    month: null,
    day: null,
    isLeapMonth: false,
  });

  const [classicRecords, setClassicRecords] = useState<ClassicRecord[]>([]);
  const [selectedClassicDataId, setSelectedClassicDataId] = useState<string | null>(null);
  const [isLoadingClassic, setIsLoadingClassic] = useState(false);
  const [classicError, setClassicError] = useState("");
  const [literatureSelectionLabel, setLiteratureSelectionLabel] = useState("");

  const getClassicRecordId = (record: ClassicRecord) => {
    return record.dataId ?? record.dci ?? record.id ?? "";
  };

  const selectedClassicRecord = classicRecords.find((record) => {
    return getClassicRecordId(record) === selectedClassicDataId;
  });

  const selectedClassicIndex = useMemo(() => {
    if (!selectedClassicDataId) {
      return classicRecords.length > 0 ? 0 : -1;
    }

    return classicRecords.findIndex((record) => {
      return getClassicRecordId(record) === selectedClassicDataId;
    });
  }, [classicRecords, selectedClassicDataId]);

  const prevClassicRecord =
    selectedClassicIndex > 0 ? classicRecords[selectedClassicIndex - 1] : null;

  const nextClassicRecord =
    selectedClassicIndex >= 0 && selectedClassicIndex < classicRecords.length - 1
      ? classicRecords[selectedClassicIndex + 1]
      : null;

  const isClassicRecordMode = Boolean(selectedClassicRecord);

  const classicSearchInFlightKeyRef = useRef<string | null>(null);

  const hasClassicDateSelection = Boolean(
    classicSelection.kingName &&
      classicSelection.reignYear &&
      classicSelection.month &&
      classicSelection.day
  );

  const classicSelectionLabel = buildClassicSelectionLabel(classicSelection);
  const activeRecordListLabel = classicSelectionLabel || literatureSelectionLabel;
  const hasRecordList = classicRecords.length > 0;


  useEffect(() => {
    const loadHistoryData = async () => {
      setIsLoadingDb(true);
      setDbError("");

      try {
        const { data: bookRows, error: bookError } = await supabase
          .from("historical_books")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (bookError) {
          throw bookError;
        }

        const { data: pointRows, error: pointError } = await supabase
          .from("history_animation_points")
          .select(
            "id, book_id, sort_order, map_x, map_y, animation_duration_ms, pause_after_ms, animation_icon, movement_type, is_active, internal_label, created_at"
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (pointError) {
          throw pointError;
        }

        if (!bookRows || bookRows.length === 0) {
          setBooks([]);
          setAnimationPoints([]);
          setDbError("Supabase에 등록된 역사 자료가 없습니다.");
          return;
        }

        setBooks(convertBookRowsToBooks(bookRows as SupabaseBookRow[]));
        setAnimationPoints(
          convertAnimationPointRows(
            (pointRows || []) as SupabaseAnimationPointRow[]
          )
        );


      } catch (error) {
        console.error("Supabase history load failed:", error);
        setBooks([]);
        setDbError("Supabase 역사 데이터를 불러오지 못했습니다.");
      } finally {
        setIsLoadingDb(false);
      }
    };

    loadHistoryData();
  }, []);

  // Update AI states when selected original article changes
  useEffect(() => {
    setAiAnalysis("");
    setAiError("");
  }, [selectedClassicDataId, activeBookId]);

  useEffect(() => {
    if (activeAnimationPoints.length === 0 && activeIndex !== 0) {
      setActiveIndex(0);
      return;
    }

    if (activeAnimationPoints.length > 0 && activeIndex >= activeAnimationPoints.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, activeAnimationPoints.length]);

  const clearMovementTimers = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  };

  const stopPlaybackMovement = () => {
    clearMovementTimers();
    setIsPlaying(false);
    setIsMoving(false);
    setIsWaitingBetweenMoves(false);
    setAnimationProgress(0);
    playbackDirectionRef.current = 1;
  };

  const resetHistoryTabToLibrary = useCallback(() => {
    stopPlaybackMovement();

    setActiveBookId("");
    setActiveIndex(0);
    setShowMapPlayer(false);
    setShowPopup(false);

    setClassicRecords([]);
    setClassicError("");
    setSelectedClassicDataId(null);
    setLiteratureSelectionLabel("");
    setIsLoadingClassic(false);

    setClassicSelection({
      collectionId: "joseon-sillok",
      kingName: "",
      reignYear: null,
      month: null,
      day: null,
      isLeapMonth: false,
    });

    setAiAnalysis("");
    setAiError("");
    setIsLoadingAI(false);

    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  }, [stopPlaybackMovement]);

  useEffect(() => {
    const handleResetHistoryTab = () => {
      resetHistoryTabToLibrary();
    };

    window.addEventListener("reset-history-tab", handleResetHistoryTab);

    return () => {
      window.removeEventListener("reset-history-tab", handleResetHistoryTab);
    };
  }, [resetHistoryTabToLibrary]);

  //--------------------------------------------한국 고전 종합 DB
  const makeItkcNodeUrlFromTreeNode = (node: ClassicTreeNode) => {
    const url = node.url.startsWith("?") ? node.url : `?${node.url}`;
    return `https://db.itkc.or.kr/dir/node${url}`;
  };

  const convertTreeNodeToClassicRecord = (
    node: ClassicTreeNode,
    selection: ClassicDateSelection,
    index: number
  ): ClassicRecord => {
    const label = buildClassicSelectionLabel(selection);
    const sourceUrl = makeItkcNodeUrlFromTreeNode(node);

    return {
      id: node.dataId || `classic-article-${index}`,
      dataId: node.dataId,
      dci: node.dataId,
      title: node.label || "제목 없음",
      bookTitle: currentBook?.title ?? `${selection.kingName ?? ""} 기록`,
      volumeTitle: label,
      category: currentArchiveCategoryLabel,
      itemId: currentItkcItemId,
      searchText: `${label} 수록 기사`,
      sourceUrl,
      raw: {
        dataId: node.dataId,
        label: node.label,
        url: node.url,
        sourceUrl,
        depth: node.depth,
        dataGubun: node.dataGubun,
      },
    };
  };


  const updateClassicSearchParamsFromSelection = (
    selection: ClassicDateSelection
  ) => {
    const params = new URLSearchParams(searchParams);

    params.set("source", selection.collectionId);

    selection.kingName
      ? params.set("king", selection.kingName)
      : params.delete("king");

    selection.reignYear
      ? params.set("reignYear", String(selection.reignYear))
      : params.delete("reignYear");

    selection.month
      ? params.set("month", String(selection.month))
      : params.delete("month");

    selection.day
      ? params.set("day", String(selection.day))
      : params.delete("day");

    selection.isLeapMonth
      ? params.set("leap", "true")
      : params.delete("leap");

    setSearchParams(params, { replace: true });
  };

  const fetchClassicYearNodes = async (kingName: string) => {
    const kingNodeId = makeRoyalRecordKingNodeId(currentItkcItemId, kingName);

    if (!kingNodeId) {
      return [];
    }

    return await fetchItkcTreeNodes({
      itemId: currentItkcItemId,
      dataId: kingNodeId,
      depth: 1,
      dataGubun: "서지",
    });
  };

  const fetchClassicMonthNodes = async (yearNode: ClassicTreeNode) => {
    return await fetchItkcTreeNodes({
      itemId: currentItkcItemId,
      dataId: yearNode.dataId,
      depth: 2,
      dataGubun: "재위년",
    });
  };

  const fetchClassicDayNodes = async (monthNode: ClassicTreeNode) => {
    return await fetchItkcTreeNodes({
      itemId: currentItkcItemId,
      dataId: monthNode.dataId,
      depth: 3,
      dataGubun: "월",
    });
  };

  const createSelectionFromDayNode = ({
    kingName,
    reignYear,
    month,
    isLeapMonth,
    dayNode,
  }: {
    kingName: string;
    reignYear: number;
    month: number;
    isLeapMonth: boolean;
    dayNode: ClassicTreeNode;
  }): ClassicDateSelection | null => {
    const day = getDayFromTreeNode(dayNode);

    if (!day) {
      return null;
    }

    return {
      collectionId: currentCollectionId,
      kingName,
      reignYear,
      month,
      day,
      isLeapMonth,
      dateNodeId: dayNode.dataId,
      dateNodeLabel: dayNode.label,
      dateNodeUrl: makeItkcNodeUrlFromTreeNode(dayNode),
    };
  };

  const findAdjacentClassicDateSelection = async (
    direction: "prev" | "next"
  ): Promise<ClassicDateSelection | null> => {
    if (
      !classicSelection.kingName ||
      !classicSelection.reignYear ||
      !classicSelection.month ||
      !classicSelection.day
    ) {
      return null;
    }

    const royalRecordKings = getRoyalRecordKingOptions(currentItkcItemId);
    const currentKingIndex = royalRecordKings.findIndex((king) => {
      return isSameKingName(king.name, classicSelection.kingName ?? "");
    });

    if (currentKingIndex < 0) {
      return null;
    }

    if (direction === "next") {
      for (let kingIndex = currentKingIndex; kingIndex < royalRecordKings.length; kingIndex += 1) {
        const kingName = royalRecordKings[kingIndex].name;
        const yearNodes = await fetchClassicYearNodes(kingName);
        const sameKing = kingIndex === currentKingIndex;
        const currentYearIndex = sameKing
          ? yearNodes.findIndex((node) => {
              return getReignYearFromTreeNode(node) === classicSelection.reignYear;
            })
          : -1;
        const yearStartIndex = sameKing ? Math.max(0, currentYearIndex) : 0;

        for (let yearIndex = yearStartIndex; yearIndex < yearNodes.length; yearIndex += 1) {
          const yearNode = yearNodes[yearIndex];
          const reignYear = getReignYearFromTreeNode(yearNode);

          if (!reignYear) {
            continue;
          }

          const monthNodes = await fetchClassicMonthNodes(yearNode);
          const sameYear = sameKing && reignYear === classicSelection.reignYear;
          const currentMonthIndex = sameYear
            ? monthNodes.findIndex((node) => {
                return (
                  getMonthFromTreeNode(node) === classicSelection.month &&
                  getIsLeapMonthFromTreeNode(node) === Boolean(classicSelection.isLeapMonth)
                );
              })
            : -1;
          const monthStartIndex = sameYear ? Math.max(0, currentMonthIndex) : 0;

          for (let monthIndex = monthStartIndex; monthIndex < monthNodes.length; monthIndex += 1) {
            const monthNode = monthNodes[monthIndex];
            const month = getMonthFromTreeNode(monthNode);
            const nodeIsLeapMonth = getIsLeapMonthFromTreeNode(monthNode);

            if (!month) {
              continue;
            }

            const dayNodes = await fetchClassicDayNodes(monthNode);
            const sameMonth =
              sameYear &&
              month === classicSelection.month &&
              nodeIsLeapMonth === Boolean(classicSelection.isLeapMonth);
            const currentDayIndex = sameMonth
              ? dayNodes.findIndex((node) => {
                  return getDayFromTreeNode(node) === classicSelection.day;
                })
              : -1;
            const dayStartIndex = sameMonth ? currentDayIndex + 1 : 0;

            for (let dayIndex = dayStartIndex; dayIndex < dayNodes.length; dayIndex += 1) {
              const selection = createSelectionFromDayNode({
                kingName,
                reignYear,
                month,
                isLeapMonth: nodeIsLeapMonth,
                dayNode: dayNodes[dayIndex],
              });

              if (selection) {
                return selection;
              }
            }
          }
        }
      }

      return null;
    }

    for (let kingIndex = currentKingIndex; kingIndex >= 0; kingIndex -= 1) {
      const kingName = royalRecordKings[kingIndex].name;
      const yearNodes = await fetchClassicYearNodes(kingName);
      const sameKing = kingIndex === currentKingIndex;
      const currentYearIndex = sameKing
        ? yearNodes.findIndex((node) => {
            return getReignYearFromTreeNode(node) === classicSelection.reignYear;
          })
        : -1;
      const yearStartIndex = sameKing
        ? currentYearIndex >= 0
          ? currentYearIndex
          : yearNodes.length - 1
        : yearNodes.length - 1;

      for (let yearIndex = yearStartIndex; yearIndex >= 0; yearIndex -= 1) {
        const yearNode = yearNodes[yearIndex];
        const reignYear = getReignYearFromTreeNode(yearNode);

        if (!reignYear) {
          continue;
        }

        const monthNodes = await fetchClassicMonthNodes(yearNode);
        const sameYear = sameKing && reignYear === classicSelection.reignYear;
        const currentMonthIndex = sameYear
          ? monthNodes.findIndex((node) => {
              return (
                getMonthFromTreeNode(node) === classicSelection.month &&
                getIsLeapMonthFromTreeNode(node) === Boolean(classicSelection.isLeapMonth)
              );
            })
          : -1;
        const monthStartIndex = sameYear
          ? currentMonthIndex >= 0
            ? currentMonthIndex
            : monthNodes.length - 1
          : monthNodes.length - 1;

        for (let monthIndex = monthStartIndex; monthIndex >= 0; monthIndex -= 1) {
          const monthNode = monthNodes[monthIndex];
          const month = getMonthFromTreeNode(monthNode);
          const nodeIsLeapMonth = getIsLeapMonthFromTreeNode(monthNode);

          if (!month) {
            continue;
          }

          const dayNodes = await fetchClassicDayNodes(monthNode);
          const sameMonth =
            sameYear &&
            month === classicSelection.month &&
            nodeIsLeapMonth === Boolean(classicSelection.isLeapMonth);
          const currentDayIndex = sameMonth
            ? dayNodes.findIndex((node) => {
                return getDayFromTreeNode(node) === classicSelection.day;
              })
            : -1;
          const dayStartIndex = sameMonth
            ? currentDayIndex >= 0
              ? currentDayIndex - 1
              : dayNodes.length - 1
            : dayNodes.length - 1;

          for (let dayIndex = dayStartIndex; dayIndex >= 0; dayIndex -= 1) {
            const selection = createSelectionFromDayNode({
              kingName,
              reignYear,
              month,
              isLeapMonth: nodeIsLeapMonth,
              dayNode: dayNodes[dayIndex],
            });

            if (selection) {
              return selection;
            }
          }
        }
      }
    }

    return null;
  };

const handleSelectClassicDate = async (
  selection: ClassicDateSelection,
  options: SelectClassicDateOptions = {}
): Promise<ClassicRecord[]> => {
  const requestKey = makeClassicSelectionKey(selection);

  if (classicSearchInFlightKeyRef.current === requestKey) {
    return [];
  }

  updateClassicSearchParamsFromSelection(selection);

  const isSameClassicDate =
    classicSelection.collectionId === selection.collectionId &&
    classicSelection.kingName === selection.kingName &&
    classicSelection.reignYear === selection.reignYear &&
    classicSelection.month === selection.month &&
    classicSelection.day === selection.day &&
    classicSelection.isLeapMonth === selection.isLeapMonth;

  if (!selection.dateNodeId) {
    if (isSameClassicDate && classicRecords.length > 0) {
      setClassicSelection((prev) => ({
        ...prev,
        ...selection,
      }));
      setClassicError("");
      setIsLoadingClassic(false);
      return classicRecords;
    }

    setClassicSelection(selection);
    setClassicError("");
    setIsLoadingClassic(false);
    return [];
  }

  classicSearchInFlightKeyRef.current = requestKey;

  setClassicSelection(selection);
  setLiteratureSelectionLabel("");
  setIsLoadingClassic(true);
  setClassicError("");
  setSelectedClassicDataId(null);

  try {
    const label = buildClassicSelectionLabel(selection);
    const dateNodeId = selection.dateNodeId;

    console.log("선택값:", selection);
    console.log("date node id:", dateNodeId);

    const articleNodes = await fetchItkcTreeNodes({
      itemId: currentItkcItemId,
      dataId: dateNodeId,
      depth: 4,
      dataGubun: "일",
    });

    console.log("개별 기사 노드:", articleNodes);

    const articleDetails = await fetchItkcNodeArticles({
      itemId: currentItkcItemId,
      dataId: dateNodeId,
      depth: 4,
      dataGubun: "일",
    });

    console.log("개별 기사 본문:", articleDetails);

    const detailMap = new Map(
      articleDetails.map((detail) => [detail.dataId, detail])
    );

    const articleRecords = articleNodes.map((node, index) => {
      const baseRecord = convertTreeNodeToClassicRecord(node, selection, index);
      const detail = detailMap.get(node.dataId);

      return {
        ...baseRecord,
        title: detail?.title || baseRecord.title,
        searchText: detail?.bodyText || baseRecord.searchText,
        raw: {
          ...(baseRecord.raw ?? {}),
          detail,
        },
      };
    });

    setClassicRecords(articleRecords);

    if (articleRecords.length > 0) {
      const pickedRecord =
        options.pick === "last"
          ? articleRecords[articleRecords.length - 1]
          : articleRecords[0];

      setSelectedClassicDataId(pickedRecord.dataId ?? pickedRecord.id);
    } else {
      setSelectedClassicDataId(null);
      setClassicError(`${label}에 수록된 개별 기사를 찾지 못했습니다.`);
    }

    return articleRecords;
  } catch (error) {
    console.error("Classic article load failed:", error);
    setClassicRecords([]);
    setSelectedClassicDataId(null);
    setClassicError("고전 원문 기사 목록을 불러오지 못했습니다.");
    return [];
  } finally {
    classicSearchInFlightKeyRef.current = null;
    setIsLoadingClassic(false);
  }
};

//--------------------------------------------한국 고전 종합 DB 끝

  const handleSelectTranslatedClassicRecord = (record: ClassicRecord) => {
    const recordId = getClassicRecordId(record);

    setClassicRecords([record]);
    setSelectedClassicDataId(recordId);
    setLiteratureSelectionLabel(
      record.volumeTitle || record.bookTitle || currentBook?.title || "고전번역서"
    );
    setClassicError("");
    setAiAnalysis("");
    setAiError("");
    setShowPopup(false);
    setIsPlaying(false);
  };

  const handleSelectClassicRecordList = (
    records: ClassicRecord[],
    label: string
  ) => {
    setClassicRecords(records);
    setSelectedClassicDataId(null);
    setLiteratureSelectionLabel(label);
    setClassicError("");
    setAiAnalysis("");
    setAiError("");
    setShowPopup(false);
    setIsPlaying(false);

    setClassicSelection({
      collectionId: currentCollectionId,
      kingName: "",
      reignYear: null,
      month: null,
      day: null,
      isLeapMonth: false,
    });
  };

  const getAnimationPoint = (index: number): MapAnimationPoint | undefined => {
    return activeAnimationPoints[index];
  };

  const getMovingIconPosition = () => {
    const fallbackPoint = getAnimationPoint(activeIndex);

    if (!fallbackPoint) {
      return null;
    }

    if (!isMoving) {
      return {
        x: fallbackPoint.mapX,
        y: fallbackPoint.mapY,
      };
    }

    const fromPoint = getAnimationPoint(movingFromIndex) || fallbackPoint;
    const toPoint = getAnimationPoint(movingToIndex) || fallbackPoint;

    const x = fromPoint.mapX + (toPoint.mapX - fromPoint.mapX) * animationProgress;
    let y = fromPoint.mapY + (toPoint.mapY - fromPoint.mapY) * animationProgress;

    const segmentPoint = getAnimationPoint(Math.max(movingFromIndex, movingToIndex));
    if (segmentPoint?.movementType === "arc") {
      y -= Math.sin(animationProgress * Math.PI) * 7;
    }

    return { x, y };
  };

  const movingIconPosition = getMovingIconPosition();
  const movingSourcePoint = getAnimationPoint(movingFromIndex);
  const movingTargetPoint = getAnimationPoint(movingToIndex);
  const timelineVirtualIndex = isMoving
    ? movingFromIndex + (movingToIndex - movingFromIndex) * animationProgress
    : activeIndex;

  const timelineProgress = activeAnimationPoints.length <= 1
    ? 0
    : Math.min(
        100,
        Math.max(
          0,
          (timelineVirtualIndex / Math.max(1, activeAnimationPoints.length - 1)) * 100
        )
      );

  // Handle timeline playback with moving icon animation
  // 핵심: isMoving을 dependency에 넣지 않는다. 넣으면 setIsMoving(true) 직후 effect가 재실행되어
  // requestAnimationFrame이 취소되고 progress가 0%에 멈춘다.
  useEffect(() => {
    if (!isPlaying || activeAnimationPoints.length <= 1 || isWaitingBetweenMoves) {
      return;
    }

    const fromIndex = activeIndex;

    let direction = playbackDirectionRef.current;
    if (fromIndex >= activeAnimationPoints.length - 1 && direction === 1) {
      direction = -1;
    }
    if (fromIndex <= 0 && direction === -1) {
      direction = 1;
    }
    playbackDirectionRef.current = direction;

    const toIndex = fromIndex + direction;
    const fromPoint = getAnimationPoint(fromIndex);
    const toPoint = getAnimationPoint(toIndex);

    if (!fromPoint || !toPoint) {
      return;
    }

    const distance = Math.hypot(toPoint.mapX - fromPoint.mapX, toPoint.mapY - fromPoint.mapY);
    const minVisibleDuration = distance < 6 ? 6500 : 4500;
    const duration = Math.max(Number(toPoint.animationDurationMs ?? playbackSpeed), minVisibleDuration);
    const pauseAfter = Math.max(Number(toPoint.pauseAfterMs ?? 700), 400);
    let startTime: number | null = null;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setMovingFromIndex(fromIndex);
    setMovingToIndex(toIndex);
    setAnimationProgress(0);
    setIsMoving(true);

    const animate = (timestamp: number) => {
      if (startTime === null) {
        startTime = timestamp;
      }

      const elapsed = timestamp - startTime;
      const rawProgress = Math.min(elapsed / duration, 1);

      // 이동이 눈에 보이도록 완만한 ease-in-out 적용
      const easedProgress = rawProgress < 0.5
        ? 2 * rawProgress * rawProgress
        : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

      setAnimationProgress(easedProgress);

      if (rawProgress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      setAnimationProgress(1);
      setIsMoving(false);
      setShowPopup(true);
      setIsWaitingBetweenMoves(true);

      // 도착 지점에 잠깐 머문 뒤 activeIndex를 바꾼다.
      // 이렇게 해야 다음 effect가 바로 시작되지 않고 pauseAfter가 적용된다.
      pauseTimerRef.current = setTimeout(() => {
        setActiveIndex(toIndex);
        setMovingFromIndex(toIndex);
        setMovingToIndex(toIndex);
        setAnimationProgress(0);
        setIsWaitingBetweenMoves(false);
      }, pauseAfter);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, activeIndex, activeAnimationPoints.length, playbackSpeed, isWaitingBetweenMoves]);

  useEffect(() => {
    return () => {
      clearMovementTimers();
    };
  }, []);

  // Request Gemini AI Commentary
  const fetchAICommentary = async () => {
    if (!selectedClassicRecord) {
      setAiError("원문 기사를 선택한 뒤 자문을 요청할 수 있습니다.");
      return;
    }

    const recordId = getClassicRecordId(selectedClassicRecord);
    const sourceText =
      selectedClassicRecord.searchText?.trim() || "본문 정보 없음";
    const activeOriginalLabel = literatureSelectionLabel || classicSelectionLabel || selectedClassicRecord.volumeTitle || currentBook?.title || "원문 정보 없음";

    // 이전의 짧은 응답 캐시와 섞이지 않도록 longform-v2 키를 사용한다.
    const cacheKey = `classic-longform-v3-${activeOriginalLabel}-${recordId || selectedClassicRecord.title}`;

    if (aiCache[cacheKey]) {
      setAiAnalysis(aiCache[cacheKey]);
      return;
    }

    setIsLoadingAI(true);
    setAiError("");

    const advisoryContext = [
      `선택 항목: ${activeOriginalLabel}`,
      `기사 제목: ${selectedClassicRecord.title || `${currentArchiveCategoryLabel} 원문 기사`}`,
      "원문 내용:",
      sourceText,
      "작성 지침:",
      "사용자가 이 사건을 충분히 이해할 수 있도록 900자에서 1300자 정도의 분량으로 설명하십시오.",
      "제목, 소제목, 글머리표, 번호 목록, 표, 마크다운 기호를 사용하지 마십시오.",
      "사건의 핵심 내용, 관련 인물과 관청, 조정의 판단, 정치적·제도적 의미, 역사적 배경을 자연스러운 문단으로 이어서 설명하십시오.",
      "원문에 없는 내용을 단정하지 말고, 필요한 경우 추론임을 드러내십시오.",
    ].join("\n\n");

    try {
      const response = await fetch("/api/gemini/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedClassicRecord.title || `${currentArchiveCategoryLabel} 원문 기사`,
          context: advisoryContext,
          category: selectedClassicRecord.category || `${currentArchiveCategoryLabel} 원문`,
        })
      });

      const data = await response.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
        setAiCache(prev => ({ ...prev, [cacheKey]: data.analysis }));
      } else if (data.error) {
        setAiError(data.error);
      } else {
        setAiError("해설을 불러오는 도중 오류가 발생했습니다.");
      }
    } catch (e) {
      console.error(e);
      setAiError("해설 서버와 통신할 수 없어 임시 사관 논평으로 갈음합니다.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSelectAdjacentClassicRecord = async (direction: "prev" | "next") => {
    if (isLoadingClassic) {
      return;
    }

    const currentIndex = selectedClassicIndex >= 0 ? selectedClassicIndex : 0;
    const nextIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;

    if (nextIndex >= 0 && nextIndex < classicRecords.length) {
      const nextRecord = classicRecords[nextIndex];
      const nextRecordId = getClassicRecordId(nextRecord);

      setSelectedClassicDataId(nextRecordId);
      setShowPopup(false);
      setAiAnalysis("");
      setAiError("");
      return;
    }

    setClassicError("");
    setAiAnalysis("");
    setAiError("");

    const adjacentSelection = await findAdjacentClassicDateSelection(direction);

    if (!adjacentSelection) {
      setClassicError(
        direction === "next"
          ? "다음 원문 날짜를 찾지 못했습니다."
          : "이전 원문 날짜를 찾지 못했습니다."
      );
      return;
    }

    await handleSelectClassicDate(adjacentSelection, {
      pick: direction === "next" ? "first" : "last",
    });

    setShowPopup(false);
  };

  // Timeline controls
  const handleStepPrev = () => {
    stopPlaybackMovement();
    playbackDirectionRef.current = -1;
    if (activeAnimationPoints.length === 0) return;
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : activeAnimationPoints.length - 1));
  };

  const handleStepNext = () => {
    stopPlaybackMovement();
    playbackDirectionRef.current = 1;
    if (activeAnimationPoints.length === 0) return;
    setActiveIndex((prev) => (prev < activeAnimationPoints.length - 1 ? prev + 1 : 0));
  };

  // Drag Handlers for Map
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left-click drags
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("input")) {
      return; // prevent dragging when clicking buttons/interactive UI
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomIntensity = 0.08;
    const delta = e.deltaY < 0 ? 1 : -1;
    const newScale = Math.min(Math.max(scale + delta * zoomIntensity, 0.4), 3.0);
    setScale(newScale);
  };

  // AI 해설 표시용 텍스트 정리.
  // 응답 내용은 길게 유지하되, 화면에서는 제목선·글머리표·마크다운 장식 없이 문단으로만 보여준다.
  const renderFormattedMarkdown = (markdown: string) => {
    if (!markdown) return null;

    const normalizedText = markdown
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^\s*[-*•]\s+/gm, "")
      .replace(/^\s*\d+[.)]\s+/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .trim();

    return normalizedText
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part, index) => (
        <p
          key={index}
          className="text-[13px] text-[#2C251F] font-serif font-medium leading-[1.9] text-justify mb-3"
        >
          {part}
        </p>
      ));
  };

  if (isLoadingDb && books.length === 0) {
    return (
      <div className="p-8 text-center">
        사료를 불러오는 중...
      </div>
    );
  }

  if (!isLoadingDb && dbError && books.length === 0) {
    return (
      <div className="p-8 text-center text-[#D4AF37] font-serif">
        {dbError}
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-80px)] relative text-[#F5F2ED] bg-[#1E0402] overflow-x-hidden" id="history-tab-outer-frame">
      <AnimatePresence mode="wait">
        {/* ========================================== */}
        {/* VIEW A: Centered Book Card selection Page */}
        {/* ========================================== */}

        {!showMapPlayer ? (
          <motion.div
            key="selection-gateway-palace"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto px-4 py-8 sm:py-10 space-y-6"
            id="history-selection-transit-page"
          >
            <div className="relative w-full">
              <AnimatePresence mode="wait">
                {activeBookId === "" ? (
                  <motion.div
                    key="full-library-deck"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2 border-b border-[#D4AF37]/20 pb-6 max-w-3xl mx-auto relative">
                      <span className="text-[9px] tracking-[0.3em] text-[#D4AF37] font-bold font-serif block uppercase">
                        [ Daehan SILLOK ]
                      </span>
                      <h2 className="text-xl sm:text-3xl font-serif font-black text-white tracking-tight">
                        사료 목록 및 원문 탐색
                      </h2>
                      <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto my-2" />
                      <p className="text-xs text-[#DEC8B2] font-serif leading-relaxed">
                        조선왕조실록, 승정원일기, 일성록과 주요 고전번역서를 자료군별 탐색 정책에 맞춰 분리합니다.<br />
                        서책을 클릭하면 해당 자료의 원문 탐색 방식과 지원 상태를 확인할 수 있습니다.
                      </p>
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] text-[#D4AF37] font-serif font-black flex items-center gap-1.5 uppercase">
                        <BookOpen className="w-3.5 h-3.5" /> 목록 (총 {books.length}권 수록됨)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-0.5 max-h-[5800px] overflow-y-auto">
                      {books.map((book) => (
                        <motion.div
                          key={book.id}
                          whileHover={{ y: -3, scale: 1.01 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          onClick={() => {
                            setActiveBookId(book.id);
                            setActiveIndex(0);
                            setShowMapPlayer(false);
                            setShowPopup(false);
                            setClassicRecords([]);
                            setClassicError("");
                            setSelectedClassicDataId(null);
                            setClassicSelection({
                              collectionId: book.sourceCollectionId ?? "joseon-sillok",
                              kingName: "",
                              reignYear: null,
                              month: null,
                              day: null,
                              isLeapMonth: false,
                            });
                            setAiAnalysis("");
                            setAiError("");
                          }}
                          className="relative p-5 bg-[#310D0A] hover:bg-[#4E1712] border border-[#D4AF37]/25 hover:border-[#D4AF37]/80 rounded-none shadow-md cursor-pointer flex flex-col justify-between group overflow-hidden h-[178px] transition-all duration-300"
                        >
                          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#D4AF37]/35 group-hover:border-[#D4AF37]" />
                          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#D4AF37]/35 group-hover:border-[#D4AF37]" />

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-[9px] font-mono font-bold text-[#D4AF37] px-1.5 py-0.5 bg-[#1B0503] border border-[#D4AF37]/15">
                                  {getArchiveCategoryLabel(book.archiveCategory)}
                                </span>
                                <span className="text-[9px] font-mono font-bold text-[#DEC5AC] px-1.5 py-0.5 bg-[#1B0503] border border-[#D4AF37]/10">
                                  {book.dynasty}
                                </span>
                              </div>
                              <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]/35 group-hover:text-[#D4AF37] transition-colors" />
                            </div>

                            <h4 className="text-xs sm:text-sm font-serif font-black text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                              {book.title.split(" (")[0]}
                            </h4>

                            <p className="text-[10.5px] text-[#DEC5AC] line-clamp-3 leading-relaxed font-serif text-justify">
                              {book.description}
                            </p>
                          </div>

                          <div className="text-right text-[9.5px] text-[#D4AF37] font-serif pt-1 flex items-center justify-end gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>원문 탐색</span>
                            <span>→</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="split-event-reveal"
                    initial={{ opacity: 0, x: 80 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
                  >
                    <div className="hidden lg:block lg:col-span-4 h-[580px] rounded-none">
                      {shouldUseDateRecordExplorer ? (
                        <ClassicArchiveBrowser
                          collectionId={currentCollectionId}
                          itemId={currentItkcItemId}
                          archiveLabel={currentArchiveCategoryLabel}
                          title={`${currentBook?.title?.split(" (")[0] ?? currentArchiveCategoryLabel} 원문 탐색`}
                          onBackToLibrary={resetHistoryTabToLibrary}
                          onSelectDate={handleSelectClassicDate}
                          onSelectRecord={handleSelectTranslatedClassicRecord}
                          onSelectRecords={handleSelectClassicRecordList}
                        />
                      ) : shouldUseLiteratureTreeExplorer ? (
                        <TranslatedClassicTreeBrowser
                          itemId={currentBook?.itkcItemId || "BT"}
                          initialCate1={currentBook?.itkcCate1 ?? null}
                          initialDataId={currentBook?.itkcDataId ?? null}
                          initialBookTitle={currentBook?.title ?? "고전번역서"}
                          title={`${currentBook?.title?.split(" (")[0] ?? "고전번역서"} 원문 탐색`}
                          onBackToLibrary={resetHistoryTabToLibrary}
                          onSelectRecord={handleSelectTranslatedClassicRecord}
                        />
                      ) : (
                        <ArchivePolicyNotice book={currentBook} />
                      )}
                    </div>

                    <div className="lg:col-span-8 w-full bg-[#310D0A] border border-[#D4AF37]/25 p-5 flex flex-col justify-between h-[580px] rounded-none shadow-md">
                      <div className="space-y-4 flex-1 flex flex-col min-h-0">
                        <div className="flex justify-between items-start gap-4 border-b border-[#D4AF37]/20 pb-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setActiveBookId("");
                                setClassicRecords([]);
                                setClassicError("");
                                setSelectedClassicDataId(null);
                                setClassicSelection({
                                  collectionId: "joseon-sillok",
                                  kingName: "",
                                  reignYear: null,
                                  month: null,
                                  day: null,
                                  isLeapMonth: false,
                                });
                              }}
                              className="lg:hidden p-1 bg-[#4E1712] hover:bg-[#8B2518] text-[#D4AF37] hover:text-white border border-[#D4AF37]/35 rounded-none cursor-pointer flex items-center justify-center w-8 h-8 flex-shrink-0"
                              title="사서도첩 탭으로 가기"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>

                            <div>
                              <span className="text-[9px] text-[#D4AF37] font-black tracking-wider uppercase block">
                                {shouldUseDateRecordExplorer
                                  ? "ROYAL DAILY RECORD ORIGINAL TEXT"
                                  : shouldUseLiteratureTreeExplorer
                                    ? "TRANSLATED CLASSIC ORIGINAL TEXT"
                                    : "ARCHIVE EXPLORATION POLICY"}
                              </span>
                              <h3 className="text-base sm:text-lg font-serif font-black text-white mt-0.5">
                                {shouldUseDateRecordExplorer
                                  ? hasRecordList
                                    ? `[${activeRecordListLabel || currentBook?.title.split(" (")[0]}] 원문 항목 목록`
                                    : `[${currentBook?.title.split(" (")[0]}] 원문 탐색 안내`
                                  : shouldUseLiteratureTreeExplorer
                                    ? `[${currentBook?.title.split(" (")[0]}] 고전번역서 원문 탐색`
                                    : `[${currentBook?.title.split(" (")[0]}] ${currentArchiveCategoryLabel} 탐색 준비`}
                              </h3>
                            </div>
                          </div>

                        <span className="text-xs font-mono text-[#D4AF37] bg-[#140403] px-2 py-1 border border-[#D4AF37]/20 flex-shrink-0">
                          {shouldUseDateRecordExplorer
                            ? hasRecordList
                              ? `총 ${classicRecords.length}건 수록`
                              : "원문 탐색 대기"
                            : shouldUseLiteratureTreeExplorer
                              ? selectedClassicRecord
                                ? "본문 선택됨"
                                : "항목 탐색 중"
                              : currentExplorationTypeLabel}
                        </span>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar">
                          {!shouldUseDateRecordExplorer ? (
                            shouldUseLiteratureTreeExplorer ? (
                              selectedClassicRecord ? (
                                <div className="space-y-4">
                                  <div className="bg-[#1C0604] border border-[#D4AF37]/15 p-4 space-y-2">
                                    <span className="text-[10px] text-[#D4AF37] font-serif font-black tracking-widest uppercase block">
                                      선택한 고전번역서 본문
                                    </span>
                                    <h4 className="text-sm text-white font-serif font-black leading-relaxed">
                                      {selectedClassicRecord.title || "본문"}
                                    </h4>
                                    <p className="text-[11px] text-[#DEC5AC] font-serif leading-relaxed">
                                      {literatureSelectionLabel || selectedClassicRecord.volumeTitle || currentBook?.title}
                                    </p>
                                  </div>

                                  <ClassicRecordViewer
                                    selection={classicSelection}
                                    records={classicRecords}
                                    selectedDataId={selectedClassicDataId}
                                    isLoading={isLoadingClassic}
                                    error={classicError}
                                  />
                                </div>
                              ) : (
                                <div className="h-full min-h-[260px] flex flex-col items-center justify-center border border-[#D4AF37]/15 bg-[#1C0604] px-6 text-center space-y-3">
                                  <BookOpen className="w-8 h-8 text-[#D4AF37]/70" />
                                  <p className="text-sm text-[#D4AF37] font-serif font-black">
                                    왼쪽 트리에서 본문 항목을 선택하십시오.
                                  </p>
                                  <p className="text-xs text-[#DEC5AC] font-serif leading-relaxed max-w-md">
                                    고전번역서는 문헌마다 권차와 항목 구성이 다르므로, 한국고전종합DB의 실제 트리 구조를 그대로 따라갑니다.
                                  </p>
                                </div>
                              )
                            ) : (
                              <ArchivePolicyNotice book={currentBook} />
                            )
                          ) : hasRecordList ? (
                            isLoadingClassic ? (
                              <div className="h-full min-h-[260px] flex items-center justify-center border border-[#D4AF37]/15 bg-[#1C0604]">
                                <p className="text-xs text-[#D4AF37] font-serif font-black">
                                  {activeRecordListLabel || currentBook?.title} 원문 항목을 불러오는 중입니다...
                                </p>
                              </div>
                            ) : classicError ? (
                              <div className="h-full min-h-[260px] flex items-center justify-center border border-[#D4AF37]/15 bg-[#1C0604] px-4 text-center">
                                <p className="text-xs text-[#DEC5AC] font-serif leading-relaxed">
                                  {classicError}
                                </p>
                              </div>
                            ) : classicRecords.length > 0 ? (
                             classicRecords.map((record, idx) => {
                                const recordId = getClassicRecordId(record);
                                const isSelected = selectedClassicDataId === recordId;

                                return (
                                  <div
                                    key={recordId || idx}
                                    onClick={() => {
                                      setSelectedClassicDataId(recordId);
                                      setActiveIndex(0);
                                      setShowMapPlayer(true);
                                      setShowPopup(false);
                                      setIsPlaying(false);
                                    }}
                                    className={`bg-[#1C0604] hover:bg-[#451410] p-4 border transition-all cursor-pointer group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                                      isSelected
                                        ? "border-[#D4AF37]"
                                        : "border-[#D4AF37]/15 hover:border-[#D4AF37]"
                                    }`}
                                  >
                                    <div className="space-y-1.5 flex-1 pr-4 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[11px] text-[#D4AF37] font-serif font-black bg-[#310D0A] px-2 py-0.5 border border-[#D4AF37]/15">
                                          {record.volumeTitle || record.bookTitle || activeRecordListLabel || currentBook?.title}
                                        </span>

                                        <span className="text-[9px] px-1 bg-amber-950 text-[#D4AF37] border border-[#D4AF37]/20 font-bold">
                                          원문
                                        </span>
                                      </div>

                                      <h4 className="text-xs sm:text-sm font-serif font-black text-white group-hover:text-[#D4AF37] transition-colors line-clamp-2">
                                        {idx + 1}. {record.title || "제목 없음"}
                                      </h4>

                                      <p className="text-[11px] text-[#CBD5E1] line-clamp-2 leading-relaxed">
                                        {record.searchText ||
                                          record.bookTitle ||
                                          record.dataId ||
                                          record.dci ||
                                          "본문 미리보기가 없습니다."}
                                      </p>

                                    </div>

                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedClassicDataId(recordId);
                                        setActiveIndex(0);
                                        setShowMapPlayer(true);
                                        setShowPopup(false);
                                        setIsPlaying(false);
                                      }}
                                      className="flex-shrink-0 bg-[#310D0A] text-[#D4AF37] group-hover:bg-[#8B2518] group-hover:text-white px-3 py-1.5 border border-[#D4AF37]/30 group-hover:border-[#D4AF37] cursor-pointer text-[10px] font-serif transition-all"
                                    >
                                      사건 상세 보기 →
                                    </button>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="h-full min-h-[260px] flex items-center justify-center border border-[#D4AF37]/15 bg-[#1C0604] px-4 text-center">
                                <p className="text-xs text-[#DEC5AC] font-serif leading-relaxed">
                                  {activeRecordListLabel || currentBook?.title}에 해당하는 원문 항목이 없습니다.
                                </p>
                              </div>
                            )
                          ) : (
                            <div className="h-full min-h-[260px] flex flex-col items-center justify-center border border-[#D4AF37]/15 bg-[#1C0604] px-6 text-center space-y-3">
                              <BookOpen className="w-8 h-8 text-[#D4AF37]/70" />
                              <p className="text-sm text-[#D4AF37] font-serif font-black">
                                왼쪽 원문 탐색에서 날짜를 선택하십시오.
                              </p>
                              <p className="text-xs text-[#DEC5AC] font-serif leading-relaxed max-w-md">
                                왕대, 재위년, 월, 일자를 선택하면 해당 날짜의 원문 기사가 이곳에 표시됩니다.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

        ) : (
          <motion.div
            key="interactive-map-player-traditional"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full relative min-h-[calc(100vh-80px)] bg-[#1C0604]"
            id="history-overlay-canvas-container"
          >
            {/* ========================================================================= */}
            {/* (1) DESKTOP ONLY VIEW: Immersive maps + Floating traditional sidebars & panel */}
            {/* ========================================================================= */}
            <div className="hidden lg:block w-full h-[calc(100vh-80px)] relative overflow-hidden" id="desktop-view-mainframe">
              {/* Antique Korea Map Canvas Backdrop */}
              <div 
                className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing overflow-hidden bg-[#E8E3D9]"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onWheel={handleWheel}
              >
                <div
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: "center center",
                    transition: isDragging ? "none" : "transform 0.15s ease-out"
                  }}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <img 
                    src="/antique_korea_map.jpg" 
                    alt="조선 고지도 바탕" 
                    className="w-full h-full object-cover opacity-85 filter sepia contrast-125 select-none"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  
                  {/* Paths connecting nodes */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {activeAnimationPoints.map((point, idx) => {
                      if (idx === 0) return null;
                      const prev = activeAnimationPoints[idx - 1];
                      return (
                        <g key={`desk-path-${idx}`}>
                          <line
                            x1={`${prev.mapX}%`}
                            y1={`${prev.mapY}%`}
                            x2={`${point.mapX}%`}
                            y2={`${point.mapY}%`}
                            stroke="#4A1510"
                            strokeWidth="2.5"
                            strokeDasharray="4,4"
                            className="opacity-40"
                          />
                          <line
                            x1={`${prev.mapX}%`}
                            y1={`${prev.mapY}%`}
                            x2={`${point.mapX}%`}
                            y2={`${point.mapY}%`}
                            stroke="#D4AF37"
                            strokeWidth="1.2"
                            className="opacity-70"
                          />
                        </g>
                      );
                    })}
                    {isMoving && movingSourcePoint && movingIconPosition && (
                      <g>
                        <line
                          x1={`${movingSourcePoint.mapX}%`}
                          y1={`${movingSourcePoint.mapY}%`}
                          x2={`${movingIconPosition.x}%`}
                          y2={`${movingIconPosition.y}%`}
                          stroke="#8B0000"
                          strokeWidth="4"
                          strokeLinecap="round"
                          className="opacity-90"
                        />
                        <line
                          x1={`${movingSourcePoint.mapX}%`}
                          y1={`${movingSourcePoint.mapY}%`}
                          x2={`${movingIconPosition.x}%`}
                          y2={`${movingIconPosition.y}%`}
                          stroke="#D4AF37"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeDasharray="5,5"
                          className="opacity-95"
                        />
                      </g>
                    )}
                  </svg>

                  {/* Desktop Pins plotted on map backdrop */}
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    {activeAnimationPoints.map((point, idx) => {
                      const isActive = idx === activeIndex;
                      return (
                        <div
                          key={`desk-pin-grp-${point.id}`}
                          style={{ left: `${point.mapX}%`, top: `${point.mapY}%` }}
                          className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2"
                        >
                          <button
                            onClick={() => {
                              setIsPlaying(false);
                              setActiveIndex(idx);
                              setShowPopup(true);
                            }}
                            className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border cursor-pointer shadow-md ${
                              isActive
                                ? "bg-[#D4AF37] border-white text-[#1B0604] scale-125 z-40"
                                : "bg-[#8B4513] border-[#D4AF37]/45 text-[#F5F2ED] hover:bg-[#A93226] scale-100 z-30"
                            }`}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                          
                          <span className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1.5 text-[9.5px] font-serif font-black px-1.5 py-0.5 whitespace-nowrap border z-30 transition-colors ${
                            isActive
                              ? "bg-[#8B2518] border-[#D4AF37] text-white"
                              : "bg-[#FDFBF7]/90 border-[#8B4513]/20 text-[#1A1A1A]"
                          }`}>
                            지점 {idx + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Moving Story Icon: follows Supabase sort_order route when autoplay runs */}
                  {movingIconPosition && (
                    <motion.div
                      className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${movingIconPosition.x}%`,
                        top: `${movingIconPosition.y}%`,
                      }}
                      animate={{ rotate: isMoving ? [0, -4, 4, 0] : 0 }}
                      transition={{ duration: 0.6, repeat: isMoving ? Infinity : 0 }}
                    >
                      <div className="relative flex items-center justify-center">
                        <div className="absolute w-16 h-16 rounded-full border-2 border-[#D4AF37]/40" />
                        <div className="relative w-11 h-11 rounded-full bg-[#D4AF37] border-2 border-white text-[#1B0604] shadow-xl flex items-center justify-center">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#1B0604]/90 border border-[#D4AF37] text-[#F8E7C0] text-[10px] font-serif font-black px-2 py-1 shadow-md">
                          {isMoving
                            ? `원문 동선 이동 중 · ${Math.round(animationProgress * 100)}%`
                            : "원문 동선 지점"}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Upper Left Floating Controller: Back to archives */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setShowMapPlayer(false);
                }}
                className="absolute top-6 left-6 z-40 bg-[#FAF6EE] hover:bg-[#F6F1E5] border-2 border-[#5C4033] px-3.5 py-2 text-xs font-serif font-black text-[#8B0000] hover:text-[#A31D1D] rounded-none shadow-md flex items-center gap-1.5 transition-all cursor-pointer shadow-amber-950/15"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>[서고합서 회귀]</span>
              </button>

              {/* Floating Dialog Pop-up balloon on Map */}
              <AnimatePresence>
                {showPopup && selectedClassicRecord && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-20 left-6 z-40 max-w-[320px] p-4 bg-[#FAF6EE] border-2 border-[#5C4033] text-[#2C251F] rounded-none shadow-md space-y-2 pointer-events-auto shadow-amber-950/20"
                  >
                    <div className="flex items-center justify-between border-b border-[#5C4033]/20 pb-1.5">
                      <span className="text-[9px] font-black font-serif text-[#8B0000] tracking-widest uppercase flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#8B0000]" /> 사건 초안서록 (事件書錄)
                      </span>
                      <button 
                        onClick={() => setShowPopup(false)}
                        className="text-stone-700 hover:text-[#8B0000] font-sans font-bold px-1.5 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-serif font-black text-[#2C251F]">
                        {selectedClassicRecord.title || "원문 기사"}
                      </h4>
                      <p className="text-[10px] text-[#8B0000] font-serif font-bold mt-1">
                        {classicSelectionLabel}
                      </p>
                    </div>
                    <p className="text-[#3E352C] text-xs font-serif text-justify leading-relaxed pt-2 border-t border-[#5C4033]/15">
                      {selectedClassicRecord.searchText || "본문 정보가 없습니다."}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Right Sidebar: Hanji textured traditional details panel */}
              {isClassicRecordMode && (
                <div 
                  className="absolute top-6 bottom-6 right-6 w-[360px] md:w-[380px] bg-[#FAF6EE] border-2 border-[#5C4033] z-40 p-5 flex flex-col justify-between overflow-y-auto pointer-events-auto shadow-2xl rounded-none shadow-amber-950/25"
                  id="desktop-history-sidebar"
                >
                  <div className="space-y-4">
                    {/* Event metadata */}
                    <div className="border-[#5C4033]/20">
                      <span className="text-[9.5px] font-black text-[#8B0000] tracking-widest uppercase block mb-1">
                        {currentArchiveCategoryLabel} 원문 기사
                      </span>

                      <h3 className="text-base font-serif font-black text-[#2C251F] leading-tight">
                        {selectedClassicRecord?.title || "원문 기사"}
                      </h3>

                      <p className="text-xs font-serif text-[#8B0000] font-bold mt-1.5 break-all">
                        {classicSelectionLabel}
                      </p>
                    </div>

                    {/* Bullet summary of facts */}
                    <ClassicRecordViewer
                      selection={classicSelection}
                      records={classicRecords}
                      selectedDataId={selectedClassicDataId}
                      isLoading={isLoadingClassic}
                      error={classicError}
                    />

                    {/* Previous / Next original article controls */}
                    <div className="border-t border-[#5C4033]/20 pt-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black text-[#8B0000] tracking-widest font-serif block uppercase">
                          원문 기사 이동 (前後記事)
                        </span>
                        <span className="text-[10px] text-[#6B4A32] font-serif font-bold">
                          {selectedClassicIndex >= 0 ? selectedClassicIndex + 1 : 0} / {classicRecords.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectAdjacentClassicRecord("prev")}
                          disabled={isLoadingClassic || !isClassicRecordMode}
                          className="min-h-[58px] px-3 py-2 border border-[#5C4033]/25 bg-[#F6F1E5] hover:bg-[#EBDCBE] disabled:opacity-40 disabled:hover:bg-[#F6F1E5] disabled:cursor-not-allowed text-[#8B0000] transition-all cursor-pointer flex items-center gap-2 text-left"
                        >
                          <ChevronLeft className="w-4 h-4 flex-shrink-0" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10px] font-serif font-black">
                              이전 내용
                            </span>
                            <span className="block text-[10px] font-serif text-[#3E352C] truncate mt-0.5">
                              {prevClassicRecord?.title || "이전 날짜 탐색"}
                            </span>
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSelectAdjacentClassicRecord("next")}
                          disabled={isLoadingClassic || !isClassicRecordMode}
                          className="min-h-[58px] px-3 py-2 border border-[#5C4033]/25 bg-[#F6F1E5] hover:bg-[#EBDCBE] disabled:opacity-40 disabled:hover:bg-[#F6F1E5] disabled:cursor-not-allowed text-[#8B0000] transition-all cursor-pointer flex items-center gap-2 text-left"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10px] font-serif font-black">
                              다음 내용
                            </span>
                            <span className="block text-[10px] font-serif text-[#3E352C] truncate mt-0.5">
                              {nextClassicRecord?.title || "다음 날짜 탐색"}
                            </span>
                          </span>
                          <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* AI scholarly critiques */}
                    <div className="border-t border-[#5C4033]/20 pt-3 space-y-2">
                      <span className="text-[10px] font-black text-[#8B0000] tracking-widest font-serif uppercase flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-[#8B0000]" /> 대제학 실시간 학술비평 (大提學 批評)
                      </span>
                      <div className="relative overflow-y-auto rounded-none border border-[#5C4033]/25 bg-[#FFF9ED] p-4 text-[#2C251F] text-sm leading-[1.85] text-justify min-h-[340px] max-h-[520px] custom-scrollbar">
                        {aiAnalysis ? (
                          <div className="space-y-2.5 font-serif">
                            {renderFormattedMarkdown(aiAnalysis)}
                          </div>
                        ) : isLoadingAI ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F6F1E5]/90 p-2 text-center gap-1">
                            <p className="text-[10px] text-[#8B0000] font-serif animate-pulse font-black">
                              고문서 서법을 수령하여 학설을 판석중입니다...
                            </p>
                          </div>
                        ) : aiError ? (
                          <div className="flex flex-col items-center justify-center text-center p-2 h-full gap-1 text-red-800">
                            <p className="text-[10px] leading-relaxed font-serif font-medium">{aiError}</p>
                            <button
                              onClick={fetchAICommentary}
                              className="text-[9px] bg-[#FAF6EE] text-[#8B0000] border border-[#5C4033]/35 px-2 py-0.5 rounded-none cursor-pointer"
                            >
                              자문 재청
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-stone-500 font-serif text-[10px]">
                            대제학 학술 해설을 받으려면 동판 버튼을 누르십시오.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={fetchAICommentary}
                    disabled={isLoadingAI || !isClassicRecordMode}
                    className="w-full mt-4 py-2 bg-[#8B0000] hover:bg-[#A31D1D] text-white font-serif font-black text-xs rounded-none border border-[#5C4033] shadow-md cursor-pointer flex items-center justify-center gap-1 transition-all"
                  >
                    {isLoadingAI ? "대각 자문 대조 중..." : "[대제학 AI 주론 자문요청]"}
                  </button>
                </div>
              )}

              {/* Floating Bottom Timeline: Timeframe slider and nodes */}
              <div 
                className="absolute bottom-6 left-6 right-[406px] bg-[#FAF6EE] border-2 border-[#5C4033] shadow-xl z-40 p-4 flex flex-row items-center gap-5 pointer-events-auto rounded-none shadow-amber-950/20"
                id="desktop-timeline-controls"
              >
                {/* Playback Key controls */}
                <div className="flex items-center gap-2 select-none flex-shrink-0">
                  <button
                    onClick={handleStepPrev}
                    className="p-1 px-1.5 text-xs text-[#5C4033] hover:text-[#8B0000] bg-[#FAF6EE] hover:bg-[#F6F1E5] border border-[#5C4033]/40 rounded-none transition-all cursor-pointer flex items-center justify-center"
                    title="이전 사건 노선"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => {
                      clearMovementTimers();
                      setIsMoving(false);
                      setIsWaitingBetweenMoves(false);
                      setAnimationProgress(0);
                      setIsPlaying((prev) => !prev);
                    }}
                    className="p-1.5 px-3 text-xs font-serif font-bold text-white bg-[#8B0000] hover:bg-[#A31D1D] rounded-none border border-[#5C4033] cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 text-white" />
                        <span className="text-[10px]">일시정지</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-white hover:scale-105" />
                        <span className="text-[10px]">자동재생</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleStepNext}
                    className="p-1 px-1.5 text-xs text-[#5C4033] hover:text-[#8B0000] bg-[#FAF6EE] hover:bg-[#F6F1E5] border border-[#5C4033]/40 rounded-none transition-all cursor-pointer flex items-center justify-center"
                    title="다음 사건 노선"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Slider Bar */}
                <div className="flex-1 mx-1 flex flex-col gap-1.5 self-center">
                  <div className="flex justify-between items-center text-[10px] text-[#5C4033] font-serif font-bold px-1 select-none">
                    <span>지방 대의기원: 시조년도</span>
                    <span className="font-serif text-[#8B0000] font-black">지맥전령 추적경로: {activeAnimationPoints.length === 0 ? 0 : activeIndex + 1} / {activeAnimationPoints.length}</span>
                    <span>개항기 치세성국</span>
                  </div>
                  
                  <div className="relative h-2 w-full bg-[#F6F1E5] border border-[#5C4033]/25 rounded-none flex items-center">
                    <div 
                      style={{ width: `${timelineProgress}%` }}
                      className="absolute inset-y-0 left-0 bg-[#8B0000] h-full pointer-events-none z-10" 
                    />
                    {activeAnimationPoints.map((_, idx) => (
                      <div
                        key={`desktop-step-${idx}`}
                        style={{ left: `${(idx / Math.max(1, activeAnimationPoints.length - 1)) * 100}%` }}
                        className={`absolute w-3.5 h-3.5 cursor-pointer transform -translate-x-1/2 rounded-full border transition-all z-20 ${
                          idx <= activeIndex 
                            ? "bg-[#8B0000] border-white scale-110" 
                            : "bg-[#FAF6EE] border-[#5C4033]/45 hover:border-[#8B0000]"
                        }`}
                        onClick={() => {
                          setIsPlaying(false);
                          setActiveIndex(idx);
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Speed control */}
                <div className="flex items-center bg-[#F6F1E5] border border-[#5C4033]/25 rounded-none p-1 gap-1 shadow-inner justify-center flex-shrink-0">
                  {[
                    { label: "×0.5", val: 4000 },
                    { label: "×1.0", val: 2500 },
                    { label: "×2.0", val: 1200 }
                  ].map((sp) => (
                    <button
                      key={`desktop-speed-${sp.val}`}
                      onClick={() => setPlaybackSpeed(sp.val)}
                      className={`px-2 py-0.5 text-[9px] font-serif font-bold rounded-none transition-all cursor-pointer ${
                        playbackSpeed === sp.val
                          ? "bg-[#8B0000] text-[#FAF6EE] font-black"
                          : "text-[#5C4033] hover:text-[#8B0000]"
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* ========================================================================= */}
            {/* (2) MOBILE ONLY VIEW: Vertical sequence (Map -> Playback (Opacity-0) -> explanation) */}
            {/* ========================================================================= */}
            <div className="lg:hidden w-full flex flex-col bg-[#1C0604] min-h-[calc(100vh-80px)] overflow-y-auto pb-10" id="mobile-view-mainframe">
              
              {/* [STEP 1] Antique Korea Map (Top of the page) */}
              <div 
                className="w-full h-[360px] relative bg-[#E8E3D9] border-b-2 border-[#5C4033] overflow-hidden"
              >
                <div 
                  className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing overflow-hidden"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  onWheel={handleWheel}
                >
                  <div
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      transformOrigin: "center center",
                      transition: isDragging ? "none" : "transform 0.15s ease-out"
                    }}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <img 
                      src="/antique_korea_map.jpg" 
                      alt="조선 고지도 바탕" 
                      className="w-full h-full object-cover opacity-85 filter sepia contrast-125 select-none"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                      {activeAnimationPoints.map((point, idx) => {
                        if (idx === 0) return null;
                        const prev = activeAnimationPoints[idx - 1];
                        return (
                          <g key={`mobile-path-${idx}`}>
                            <line
                              x1={`${prev.mapX}%`}
                              y1={`${prev.mapY}%`}
                              x2={`${point.mapX}%`}
                              y2={`${point.mapY}%`}
                              stroke="#4A1510"
                              strokeWidth="2.5"
                              strokeDasharray="4,4"
                              className="opacity-40"
                            />
                            <line
                              x1={`${prev.mapX}%`}
                              y1={`${prev.mapY}%`}
                              x2={`${point.mapX}%`}
                              y2={`${point.mapY}%`}
                              stroke="#D4AF37"
                              strokeWidth="1.2"
                              className="opacity-70"
                            />
                          </g>
                        );
                      })}
                      {isMoving && movingSourcePoint && movingIconPosition && (
                        <g>
                          <line
                            x1={`${movingSourcePoint.mapX}%`}
                            y1={`${movingSourcePoint.mapY}%`}
                            x2={`${movingIconPosition.x}%`}
                            y2={`${movingIconPosition.y}%`}
                            stroke="#8B0000"
                            strokeWidth="4"
                            strokeLinecap="round"
                            className="opacity-90"
                          />
                          <line
                            x1={`${movingSourcePoint.mapX}%`}
                            y1={`${movingSourcePoint.mapY}%`}
                            x2={`${movingIconPosition.x}%`}
                            y2={`${movingIconPosition.y}%`}
                            stroke="#D4AF37"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeDasharray="5,5"
                            className="opacity-95"
                          />
                        </g>
                      )}
                    </svg>

                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {activeAnimationPoints.map((point, idx) => {
                        const isActive = idx === activeIndex;
                        return (
                          <div
                            key={`mobile-pin-grp-${point.id}`}
                            style={{ left: `${point.mapX}%`, top: `${point.mapY}%` }}
                            className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2"
                          >
                            <button
                              onClick={() => {
                                setIsPlaying(false);
                                setActiveIndex(idx);
                                setShowPopup(true);
                              }}
                              className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border cursor-pointer shadow-md ${
                                isActive
                                  ? "bg-[#D4AF37] border-white text-[#1B0604] scale-125 z-40"
                                  : "bg-[#8B4513] border-[#D4AF37]/45 text-[#F5F2ED] hover:bg-[#A93226] scale-100 z-30"
                              }`}
                            >
                              <MapPin className="w-3 h-3" />
                            </button>
                            
                            <span className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-[8.5px] font-serif font-black px-1 py-0.5 whitespace-nowrap border z-30 transition-colors ${
                              isActive
                                ? "bg-[#8B2518] border-[#D4AF37] text-white"
                                : "bg-[#FDFBF7]/90 border-[#8B4513]/20 text-[#1A1A1A]"
                            }`}>
                              지점 {idx + 1}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Mobile Moving Story Icon */}
                    {movingIconPosition && (
                      <motion.div
                        className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${movingIconPosition.x}%`,
                          top: `${movingIconPosition.y}%`,
                        }}
                        animate={{ rotate: isMoving ? [0, -4, 4, 0] : 0 }}
                        transition={{ duration: 0.6, repeat: isMoving ? Infinity : 0 }}
                      >
                        <div className="relative flex items-center justify-center">
                          <div className="absolute w-12 h-12 rounded-full border-2 border-[#D4AF37]/40" />
                          <div className="relative w-9 h-9 rounded-full bg-[#D4AF37] border-2 border-white text-[#1B0604] shadow-xl flex items-center justify-center">
                            <MapPin className="w-4 h-4" />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Mobile Floating Dialog Pop-up inside map framework */}
                <AnimatePresence>
                  {showPopup && selectedClassicRecord && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-4 left-4 right-4 z-40 p-3 bg-[#FAF6EE] border-2 border-[#5C4033] text-[#2C251F] rounded-none shadow-md space-y-1.5 pointer-events-auto"
                    >
                      <div className="flex items-center justify-between border-b border-[#5C4033]/20 pb-1">
                        <span className="text-[8.5px] font-black font-serif text-[#8B0000] tracking-widest uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#8B0000]" /> 사건 초안서록 (事件書錄)
                        </span>
                        <button 
                          onClick={() => setShowPopup(false)}
                          className="text-stone-700 hover:text-[#8B0000] font-sans font-bold px-1.5 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <div>
                        <h4 className="text-xs font-serif font-black text-[#2C251F]">
                          {selectedClassicRecord.title || "원문 기사"}
                        </h4>
                        <p className="text-[9px] text-[#8B0000] font-serif font-bold mt-0.5">
                          {classicSelectionLabel}
                        </p>
                      </div>
                      <p className="text-[#3E352C] text-[11px] font-serif text-justify leading-relaxed pt-1.5 border-t border-[#5C4033]/15">
                        {selectedClassicRecord.searchText || "본문 정보가 없습니다."}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* [STEP 2] TRANSPARENT PLAYBACK CONTROL AREA (Middle - OPACITY-0, NO GLASSMORPHISM!) */}
              <div 
                className="w-full opacity-0 pointer-events-none p-3.5 flex flex-col justify-center items-center bg-stone-900/10 border-b border-[#5C4033]/15"
                id="mobile-transparent-playback-zone"
              >
                <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-none border border-white/10">
                  <button onClick={handleStepPrev} className="p-1"><ChevronLeft className="w-4 h-4" /></button>
                  <button className="p-1 px-2 font-serif text-[10px]">재생제어</button>
                  <button onClick={handleStepNext} className="p-1"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="h-1 w-24 bg-stone-800 mt-1"></div>
              </div>

              {/* [STEP 3] EXPLANTION SIDEBAR TAB (Bottom of the page) */}
              <div 
                className="w-full max-w-lg mx-auto bg-[#FAF6EE] text-[#2C251F] border-t-2 border-[#5C4033] p-4 flex flex-col gap-4 shadow-xl"
                id="mobile-history-details-sheet"
              >
                {/* Meta Header block */}
                <div className="border-b border-[#5C4033]/20 pb-2.5 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="text-[8.5px] font-black text-[#8B0000] tracking-widest uppercase block mb-0.5">
                      {currentArchiveCategoryLabel} 원문 기사
                    </span>
                      <h3 className="text-sm font-serif font-black text-[#2C251F] leading-tight">
                        {selectedClassicRecord?.title || "원문 기사"}
                      </h3>

                      <p className="text-[10px] font-serif text-[#8B0000] font-bold mt-1 break-all">
                        {classicSelectionLabel}
                      </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setShowMapPlayer(false);
                    }}
                    className="bg-[#8B0000] hover:bg-[#A31D1D] px-2.5 py-1 text-[9px] font-serif font-black text-white hover:text-amber-100 rounded-none shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>[서고합서 회귀]</span>
                  </button>
                </div>

                {/* Details list */}
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-[#8B0000] tracking-widest font-serif block uppercase">
                      사건 상세 정본 (詳細正本)
                    </span>

                    <ul className="space-y-1 text-xs text-[#3E352C] font-serif list-disc pl-4 leading-relaxed text-justify">
                      {(selectedClassicRecord?.searchText || selectedClassicRecord?.title || "본문 정보가 없습니다.")
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line, index) => (
                          <li key={`mobile-classic-detail-${index}`} className="marker:text-[#8B0000]">
                            {line}
                          </li>
                        ))}
                    </ul>
                  </div>

                {/* Previous / Next original article controls */}
                <div className="border-t border-[#5C4033]/20 pt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black text-[#8B0000] tracking-widest font-serif block uppercase">
                      원문 기사 이동 (前後記事)
                    </span>
                    <span className="text-[9px] text-[#6B4A32] font-serif font-bold">
                      {selectedClassicIndex >= 0 ? selectedClassicIndex + 1 : 0} / {classicRecords.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAdjacentClassicRecord("prev")}
                      disabled={isLoadingClassic || !isClassicRecordMode}
                      className="min-h-[50px] px-2.5 py-2 border border-[#5C4033]/25 bg-[#F6F1E5] hover:bg-[#EBDCBE] disabled:opacity-40 disabled:hover:bg-[#F6F1E5] disabled:cursor-not-allowed text-[#8B0000] transition-all cursor-pointer flex items-center gap-1.5 text-left"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[9px] font-serif font-black">
                          이전 내용
                        </span>
                        <span className="block text-[9px] font-serif text-[#3E352C] truncate mt-0.5">
                          {prevClassicRecord?.title || "이전 날짜 탐색"}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectAdjacentClassicRecord("next")}
                      disabled={isLoadingClassic || !isClassicRecordMode}
                      className="min-h-[50px] px-2.5 py-2 border border-[#5C4033]/25 bg-[#F6F1E5] hover:bg-[#EBDCBE] disabled:opacity-40 disabled:hover:bg-[#F6F1E5] disabled:cursor-not-allowed text-[#8B0000] transition-all cursor-pointer flex items-center gap-1.5 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[9px] font-serif font-black">
                          다음 내용
                        </span>
                        <span className="block text-[9px] font-serif text-[#3E352C] truncate mt-0.5">
                          {nextClassicRecord?.title || "다음 날짜 탐색"}
                        </span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                    </button>
                  </div>
                </div>

                {/* AI Scholarly Critiques and query box */}
                <div className="border-t border-[#5C4033]/20 pt-3 flex flex-col gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-[#8B0000] tracking-widest font-serif uppercase flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#8B0000]" /> 대제학 실시간 학술비평 (大提學 批評)
                    </span>
                    
                    <div className="relative overflow-y-auto rounded-none border border-[#5C4033]/25 bg-[#FFF9ED] p-3 text-[#2C251F] text-xs leading-[1.85] text-justify min-h-[300px] max-h-[460px] custom-scrollbar">
                      {aiAnalysis ? (
                        <div className="space-y-2.5 font-serif">
                          {renderFormattedMarkdown(aiAnalysis)}
                        </div>
                      ) : isLoadingAI ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F6F1E5]/90 p-2 text-center gap-1">
                          <p className="text-[10px] text-[#8B0000] font-serif animate-pulse font-black">
                            고문서 서법을 수령하여 학설을 판석중입니다...
                          </p>
                        </div>
                      ) : aiError ? (
                        <div className="flex flex-col items-center justify-center text-center p-2 h-full gap-1 text-red-800">
                          <p className="text-[10px] leading-relaxed font-serif font-medium">{aiError}</p>
                          <button
                            onClick={fetchAICommentary}
                            className="text-[9px] bg-[#FAF6EE] text-[#8B0000] border border-[#5C4033]/35 px-2 py-0.5 rounded-none cursor-pointer"
                          >
                            자문 재청
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-stone-500 font-serif text-[10px]">
                          대제학 학술 해설을 받으려면 동판 버튼을 누르십시오.
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={fetchAICommentary}
                    disabled={isLoadingAI || !isClassicRecordMode}
                    className="w-full py-1.5 bg-[#8B0000] hover:bg-[#A31D1D] text-white font-serif font-black text-xs rounded-none border border-[#5C4033] shadow-xs cursor-pointer flex items-center justify-center gap-1 transition-all"
                  >
                    {isLoadingAI ? "대각 자문 대조 중..." : "[대제학 AI 주론 자문요청]"}
                  </button>
                </div>
              </div>

            </div>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
