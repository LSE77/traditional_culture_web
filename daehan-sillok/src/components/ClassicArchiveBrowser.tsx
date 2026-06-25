import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Folder,
  FolderOpen,
} from "lucide-react";
import { CLASSIC_COLLECTIONS } from "../constants/classicCollections";
import { makeClassicKingNodeId } from "../lib/classicDataId";
import { fetchItkcTreeNodes } from "../lib/itkcTreeApi";
import type { ClassicTreeNode } from "../lib/itkcTreeParser";
import type { ClassicDateSelection } from "../types/classics";

type ClassicArchiveBrowserProps = {
  collectionId?: string;
  onSelectDate: (selection: ClassicDateSelection) => void;
};

const JOSEON_KINGS = [
  { id: "taejo", name: "태조" },
  { id: "jeongjong", name: "정종" },
  { id: "taejong", name: "태종" },
  { id: "sejong", name: "세종" },
  { id: "munjong", name: "문종" },
  { id: "danjong", name: "단종" },
  { id: "sejo", name: "세조" },
  { id: "yejong", name: "예종" },
  { id: "seongjong", name: "성종" },
  { id: "yeonsangun", name: "연산군" },
  { id: "jungjong", name: "중종" },
  { id: "injong", name: "인종" },
  { id: "myeongjong", name: "명종" },
  { id: "seonjo", name: "선조" },
  { id: "seonjo-revised", name: "선조(수정실록)" },
  { id: "gwanghaegun", name: "광해군" },
  { id: "injo", name: "인조" },
  { id: "hyojong", name: "효종" },
  { id: "hyeonjong", name: "현종" },
  { id: "hyeonjong-revised", name: "현종(개수실록)" },
  { id: "sukjong", name: "숙종" },
  { id: "sukjong-correction", name: "숙종(보궐정오)" },
  { id: "gyeongjong", name: "경종" },
  { id: "gyeongjong-revised", name: "경종(수정실록)" },
  { id: "yeongjo", name: "영조" },
  { id: "jeongjo", name: "정조" },
  { id: "sunjo", name: "순조" },
  { id: "heonjong", name: "헌종" },
  { id: "cheoljong", name: "철종" },
];

const getNumberParam = (searchParams: URLSearchParams, key: string) => {
  const value = searchParams.get(key);
  if (!value) return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getReignYearFromNode = (node: ClassicTreeNode) => {
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

const getMonthFromNode = (node: ClassicTreeNode) => {
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

const getIsLeapMonthFromNode = (node: ClassicTreeNode) => {
  if (node.label.includes("윤")) {
    return true;
  }

  return /_\d{2}B$/.test(node.dataId);
};

const getDayFromNode = (node: ClassicTreeNode) => {
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

export default function ClassicArchiveBrowser({
  collectionId = "joseon-sillok",
  onSelectDate,
}: ClassicArchiveBrowserProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const hasAutoSearchedRef = useRef(false);

  const collection = useMemo(
    () =>
      CLASSIC_COLLECTIONS.find((item) => item.id === collectionId) ??
      CLASSIC_COLLECTIONS[0],
    [collectionId]
  );

  const initialKingName = searchParams.get("king") ?? "";
  const initialReignYear = getNumberParam(searchParams, "reignYear");
  const initialMonth = getNumberParam(searchParams, "month");
  const initialDay = getNumberParam(searchParams, "day");
  const initialIsLeapMonth = searchParams.get("leap") === "true";

  const [selectedKingName, setSelectedKingName] = useState(initialKingName);
  const [selectedReignYear, setSelectedReignYear] = useState<number | null>(
    initialReignYear
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    initialMonth
  );
  const [selectedDay, setSelectedDay] = useState<number | null>(initialDay);
  const [isLeapMonth, setIsLeapMonth] = useState(initialIsLeapMonth);

  const [yearNodes, setYearNodes] = useState<ClassicTreeNode[]>([]);
  const [monthNodes, setMonthNodes] = useState<ClassicTreeNode[]>([]);
  const [dayNodes, setDayNodes] = useState<ClassicTreeNode[]>([]);

  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isLoadingMonths, setIsLoadingMonths] = useState(false);
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [treeError, setTreeError] = useState("");

  const selectedKing = JOSEON_KINGS.find(
    (king) => king.name === selectedKingName
  );

  const selectedYearNode = yearNodes.find(
    (node) => getReignYearFromNode(node) === selectedReignYear
  );

  const selectedMonthNode = monthNodes.find((node) => {
    return (
      getMonthFromNode(node) === selectedMonth &&
      getIsLeapMonthFromNode(node) === isLeapMonth
    );
  });

  const updateClassicSearchParams = (next: Partial<ClassicDateSelection>) => {
    const params = new URLSearchParams(searchParams);

    params.set("source", collection.id);

    if (next.kingName !== undefined) {
      next.kingName ? params.set("king", next.kingName) : params.delete("king");
    }

    if (next.reignYear !== undefined) {
      next.reignYear
        ? params.set("reignYear", String(next.reignYear))
        : params.delete("reignYear");
    }

    if (next.month !== undefined) {
      next.month
        ? params.set("month", String(next.month))
        : params.delete("month");
    }

    if (next.day !== undefined) {
      next.day ? params.set("day", String(next.day)) : params.delete("day");
    }

    if (next.isLeapMonth !== undefined) {
      next.isLeapMonth ? params.set("leap", "true") : params.delete("leap");
    }

    setSearchParams(params, { replace: true });
  };

  const handleSelectKing = (kingName: string) => {
    setSelectedKingName(kingName);
    setSelectedReignYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
    setIsLeapMonth(false);
    setYearNodes([]);
    setMonthNodes([]);
    setDayNodes([]);
    setTreeError("");

    updateClassicSearchParams({
      kingName,
      reignYear: null,
      month: null,
      day: null,
      isLeapMonth: false,
    });
  };

  const handleSelectYear = (node: ClassicTreeNode) => {
    const reignYear = getReignYearFromNode(node);

    if (!reignYear) {
      return;
    }

    setSelectedReignYear(reignYear);
    setSelectedMonth(null);
    setSelectedDay(null);
    setIsLeapMonth(false);
    setMonthNodes([]);
    setDayNodes([]);
    setTreeError("");

    updateClassicSearchParams({
      reignYear,
      month: null,
      day: null,
      isLeapMonth: false,
    });
  };

  const handleSelectMonth = (node: ClassicTreeNode) => {
    const month = getMonthFromNode(node);
    const nextIsLeapMonth = getIsLeapMonthFromNode(node);

    if (!month) {
      return;
    }

    setSelectedMonth(month);
    setSelectedDay(null);
    setIsLeapMonth(nextIsLeapMonth);
    setDayNodes([]);
    setTreeError("");

    updateClassicSearchParams({
      month,
      day: null,
      isLeapMonth: nextIsLeapMonth,
    });
  };

const makeItkcNodeUrl = (node: ClassicTreeNode) => {
  const url = node.url.startsWith("?") ? node.url : `?${node.url}`;
  return `https://db.itkc.or.kr/dir/node${url}`;
};

    const handleSelectDay = (node: ClassicTreeNode) => {
    const day = getDayFromNode(node);

    if (!selectedKingName || !selectedReignYear || !selectedMonth || !day) {
        return;
    }

    setSelectedDay(day);

    const selection: ClassicDateSelection = {
        collectionId: collection.id,
        kingName: selectedKingName,
        reignYear: selectedReignYear,
        month: selectedMonth,
        day,
        isLeapMonth,
        dateNodeId: node.dataId,
        dateNodeLabel: node.label,
        dateNodeUrl: makeItkcNodeUrl(node),
    };

    updateClassicSearchParams(selection);
    onSelectDate(selection);
    };

  useEffect(() => {
    const loadYearNodes = async () => {
      if (!selectedKingName) {
        setYearNodes([]);
        return;
      }

      const kingNodeId = makeClassicKingNodeId(selectedKingName);

      if (!kingNodeId) {
        setYearNodes([]);
        setTreeError("해당 왕대의 실록 코드가 등록되지 않았습니다.");
        return;
      }

      setIsLoadingYears(true);
      setTreeError("");

      try {
        const nodes = await fetchItkcTreeNodes({
          dataId: kingNodeId,
          depth: 1,
          dataGubun: "서지",
        });

        setYearNodes(nodes);
      } catch (error) {
        console.error("재위년 목록 로드 실패:", error);
        setYearNodes([]);
        setTreeError("재위년 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoadingYears(false);
      }
    };

    loadYearNodes();
  }, [selectedKingName]);

  useEffect(() => {
    const loadMonthNodes = async () => {
      if (!selectedYearNode) {
        setMonthNodes([]);
        return;
      }

      setIsLoadingMonths(true);
      setTreeError("");

      try {
        const nodes = await fetchItkcTreeNodes({
          dataId: selectedYearNode.dataId,
          depth: 2,
          dataGubun: "재위년",
        });

        setMonthNodes(nodes);
      } catch (error) {
        console.error("월 목록 로드 실패:", error);
        setMonthNodes([]);
        setTreeError("월 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoadingMonths(false);
      }
    };

    loadMonthNodes();
  }, [selectedYearNode]);

  useEffect(() => {
    const loadDayNodes = async () => {
      if (!selectedMonthNode) {
        setDayNodes([]);
        return;
      }

      setIsLoadingDays(true);
      setTreeError("");

      try {
        const nodes = await fetchItkcTreeNodes({
          dataId: selectedMonthNode.dataId,
          depth: 3,
          dataGubun: "월",
        });

        setDayNodes(nodes);
      } catch (error) {
        console.error("일자 목록 로드 실패:", error);
        setDayNodes([]);
        setTreeError("일자 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoadingDays(false);
      }
    };

    loadDayNodes();
  }, [selectedMonthNode]);

  useEffect(() => {
    if (hasAutoSearchedRef.current) {
      return;
    }

    if (
      !initialKingName ||
      !initialReignYear ||
      !initialMonth ||
      !initialDay ||
      dayNodes.length === 0
    ) {
      return;
    }

    const matchedDayNode = dayNodes.find(
      (node) => getDayFromNode(node) === initialDay
    );

    if (!matchedDayNode) {
      return;
    }

    hasAutoSearchedRef.current = true;

    onSelectDate({
      collectionId: collection.id,
      kingName: initialKingName,
      reignYear: initialReignYear,
      month: initialMonth,
      day: initialDay,
      isLeapMonth: initialIsLeapMonth,
    });
  }, [
    collection.id,
    dayNodes,
    initialKingName,
    initialReignYear,
    initialMonth,
    initialDay,
    initialIsLeapMonth,
    onSelectDate,
  ]);

  if (collection.browseType !== "king-date") {
    return (
      <div className="h-full bg-[#2A0A07] border border-[#D4AF37]/20 p-4 space-y-4">
        <div className="flex items-center gap-2 text-[#D4AF37] font-serif font-black text-xs">
          <BookOpen className="w-4 h-4" />
          <span>{collection.label} 원문 탐색</span>
        </div>

        <div className="min-h-[220px] flex items-center justify-center border border-[#D4AF37]/10 bg-[#1E0402]/70 px-4 text-center">
          <p className="text-xs font-serif text-[#DEC5AC] leading-relaxed">
            이 자료집의 폴더 탐색 구조는 아직 준비되지 않았습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#2A0A07] border border-[#D4AF37]/20 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-[#D4AF37]/20 pb-3">
        <div className="flex items-center gap-2 text-[#D4AF37] font-serif font-black text-xs">
          <BookOpen className="w-4 h-4" />
          <span>{collection.label} 원문 탐색</span>
        </div>

        <span className="text-[10px] text-[#D4AF37]/60 font-mono">
          {collection.itemId}
        </span>
      </div>

      {treeError && (
        <div className="border border-red-900/40 bg-red-950/25 px-3 py-2 text-[10px] text-red-200 font-serif leading-relaxed">
          {treeError}
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[10px] font-serif font-black text-[#D4AF37]">
            {selectedKingName ? (
              <FolderOpen className="w-3.5 h-3.5" />
            ) : (
              <Folder className="w-3.5 h-3.5" />
            )}
            <span>왕대 선택</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 max-h-[160px] overflow-y-auto scrollbar-hide pr-1">
            {JOSEON_KINGS.map((king) => (
              <button
                key={king.id}
                onClick={() => handleSelectKing(king.name)}
                className={`px-2 py-1.5 text-[11px] font-serif border text-left transition-all rounded-none ${
                  selectedKingName === king.name
                    ? "bg-[#D4AF37] text-[#1E0402] border-[#D4AF37] font-black"
                    : "bg-[#1E0402] text-[#DEC5AC] border-[#D4AF37]/15 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
                }`}
              >
                {king.name}
              </button>
            ))}
          </div>
        </div>

        {selectedKing && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-serif font-black text-[#D4AF37]">
              <ChevronRight className="w-3.5 h-3.5" />
              <span>재위년 선택</span>
            </div>

            {isLoadingYears ? (
              <p className="text-[10px] text-[#DEC5AC] font-serif">
                재위년 목록을 불러오는 중...
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-[120px] overflow-y-auto scrollbar-hide pr-1">
                {yearNodes.map((node) => {
                  const reignYear = getReignYearFromNode(node);

                  return (
                    <button
                      key={node.dataId}
                      onClick={() => handleSelectYear(node)}
                      className={`px-2 py-1.5 text-[11px] font-serif border text-center transition-all rounded-none ${
                        selectedReignYear === reignYear
                          ? "bg-[#D4AF37] text-[#1E0402] border-[#D4AF37] font-black"
                          : "bg-[#1E0402] text-[#DEC5AC] border-[#D4AF37]/15 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
                      }`}
                    >
                      {node.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedReignYear && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-serif font-black text-[#D4AF37]">
              <ChevronRight className="w-3.5 h-3.5" />
              <span>월 선택</span>
            </div>

            {isLoadingMonths ? (
              <p className="text-[10px] text-[#DEC5AC] font-serif">
                월 목록을 불러오는 중...
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {monthNodes.map((node) => {
                  const month = getMonthFromNode(node);
                  const nodeIsLeapMonth = getIsLeapMonthFromNode(node);

                  return (
                    <button
                      key={node.dataId}
                      onClick={() => handleSelectMonth(node)}
                      className={`px-2 py-1.5 text-[11px] font-serif border text-center transition-all rounded-none ${
                        selectedMonth === month &&
                        isLeapMonth === nodeIsLeapMonth
                          ? "bg-[#D4AF37] text-[#1E0402] border-[#D4AF37] font-black"
                          : "bg-[#1E0402] text-[#DEC5AC] border-[#D4AF37]/15 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
                      }`}
                    >
                      {node.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {selectedMonth && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-serif font-black text-[#D4AF37]">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>일자 선택</span>
            </div>

            {isLoadingDays ? (
              <p className="text-[10px] text-[#DEC5AC] font-serif">
                일자 목록을 불러오는 중...
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1 max-h-[150px] overflow-y-auto scrollbar-hide pr-1">
                {dayNodes.map((node) => {
                  const day = getDayFromNode(node);

                  return (
                    <button
                      key={node.dataId}
                      onClick={() => handleSelectDay(node)}
                      className={`px-1 py-1.5 text-[10px] font-serif border text-center transition-all rounded-none ${
                        selectedDay === day
                          ? "bg-[#D4AF37] text-[#1E0402] border-[#D4AF37] font-black"
                          : "bg-[#1E0402] text-[#DEC5AC] border-[#D4AF37]/15 hover:border-[#D4AF37]/60 hover:bg-[#D4AF37] hover:text-[#1E0402] hover:font-black"
                      }`}
                    >
                      {node.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}