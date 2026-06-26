import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  Folder,
  FolderOpen,
  LayoutGrid
} from "lucide-react";
import { makeRoyalRecordKingNodeId } from "../lib/classicDataId";
import { fetchItkcTreeNodes } from "../lib/itkcTreeApi";
import { fetchItkcNodeArticles } from "../lib/itkcNodeApi";
import type { ClassicTreeNode } from "../lib/itkcTreeParser";
import type { ClassicDateSelection, ClassicRecord } from "../types/classics";

type ClassicArchiveBrowserProps = {
  collectionId?: string;
  itemId?: string;
  archiveLabel?: string;
  title?: string;
  onBackToLibrary?: () => void;
  onSelectDate: (selection: ClassicDateSelection) => void;
  onSelectRecord?: (record: ClassicRecord) => void;
  onSelectRecords?: (records: ClassicRecord[], label: string) => void;
};

export const JOSEON_KINGS = [
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

const ILSEONGNOK_INTRO_BRANCHES = [
  { id: "ilseongnok-beomrye", name: "일성록범례", dataId: "ITKC_IT_01" },
  { id: "ilseongnok-seo", name: "일성록 서", dataId: "ITKC_IT_02" },
];

const ILSEONGNOK_DATE_BRANCHES = [
  { id: "yeongjo", name: "영조" },
  { id: "jeongjo", name: "정조" },
  { id: "sunjo", name: "순조" },
  { id: "daechungsi-ilrok", name: "대청시일록" },
];

const SEUNGJEONGWON_ACCESSIBLE_KINGS = [
  { id: "injo", name: "인조" },
  { id: "yeongjo", name: "영조" },
  { id: "gojong", name: "고종" },
  { id: "sunjong", name: "순종" },
];

export const ROYAL_RECORD_KINGS_BY_ITEM_ID = {
  JT: JOSEON_KINGS,
  ST: SEUNGJEONGWON_ACCESSIBLE_KINGS,
  IT: ILSEONGNOK_DATE_BRANCHES,
};

export const getRoyalRecordKingOptions = (itemId = "JT") => {
  const normalizedItemId = itemId.trim().toUpperCase() as keyof typeof ROYAL_RECORD_KINGS_BY_ITEM_ID;
  return ROYAL_RECORD_KINGS_BY_ITEM_ID[normalizedItemId] ?? JOSEON_KINGS;
};

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
  itemId = "JT",
  archiveLabel = "조선왕조실록",
  title,
  onBackToLibrary,
  onSelectDate,
  onSelectRecord,
  onSelectRecords,
}: ClassicArchiveBrowserProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const hasAutoSearchedRef = useRef(false);

  const normalizedItemId = itemId.trim().toUpperCase();
  const kingOptions = useMemo(() => {
    return getRoyalRecordKingOptions(normalizedItemId);
  }, [normalizedItemId]);
  const isIlseongnok = normalizedItemId === "IT";
  const [selectedIntroBranch, setSelectedIntroBranch] = useState<
    (typeof ILSEONGNOK_INTRO_BRANCHES)[number] | null
  >(null);
  const [introBranchNodes, setIntroBranchNodes] = useState<ClassicTreeNode[]>([]);
  const [isLoadingIntroBranch, setIsLoadingIntroBranch] = useState(false);

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

  const [isKingPickerOpen, setIsKingPickerOpen] = useState(!initialKingName);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(!initialReignYear);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(!initialMonth);
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(!initialDay);


  const [yearNodes, setYearNodes] = useState<ClassicTreeNode[]>([]);
  const [monthNodes, setMonthNodes] = useState<ClassicTreeNode[]>([]);
  const [dayNodes, setDayNodes] = useState<ClassicTreeNode[]>([]);

  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [isLoadingMonths, setIsLoadingMonths] = useState(false);
  const [isLoadingDays, setIsLoadingDays] = useState(false);
  const [treeError, setTreeError] = useState("");

  const selectedKing = kingOptions.find(
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

  const selectedDayNode = dayNodes.find((node) => {
    return getDayFromNode(node) === selectedDay;
  });

  const selectedKingLabel = selectedKingName || "왕대 선택";
  const selectedYearLabel =
    selectedYearNode?.label ||
    (selectedReignYear ? `${selectedReignYear}년` : "재위년 선택");

  const selectedMonthLabel =
    selectedMonthNode?.label ||
    (selectedMonth
      ? `${isLeapMonth ? "윤" : ""}${selectedMonth}월`
      : "월 선택");

  const selectedDayLabel =
    selectedDayNode?.label || (selectedDay ? `${selectedDay}일` : "일자 선택");


  const updateClassicSearchParams = (next: Partial<ClassicDateSelection>) => {
    const params = new URLSearchParams(searchParams);

    params.set("source", collectionId);

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

  const makeIntroBranchNodeUrl = (node: ClassicTreeNode) => {
    const params = new URLSearchParams({
      grpId: "",
      itemId: normalizedItemId,
      gubun: "book",
      depth: String(node.depth || 2),
      cate1: "",
      cate2: "",
      dataGubun: node.dataGubun || "최종정보",
      dataId: node.dataId,
    });

    return `https://db.itkc.or.kr/dir/node?${params.toString()}`;
  };

  const createIntroRecordFromNode = async (
    node: ClassicTreeNode,
    branch: (typeof ILSEONGNOK_INTRO_BRANCHES)[number]
  ): Promise<ClassicRecord> => {
    const details = await fetchItkcNodeArticles({
      itemId: normalizedItemId,
      dataId: node.dataId,
      depth: node.depth || 2,
      dataGubun: node.dataGubun || "최종정보",
    });

    const detail = details[0];

    return {
      id: detail?.dataId || node.dataId,
      dataId: detail?.dataId || node.dataId,
      dci: detail?.dataId || node.dataId,
      title: detail?.title || node.label || "일성록 본문",
      bookTitle: branch.name,
      volumeTitle: branch.name,
      category: archiveLabel,
      itemId: normalizedItemId,
      searchText: detail?.bodyText || node.label || "본문 정보가 없습니다.",
      sourceUrl: makeIntroBranchNodeUrl(node),
      raw: {
        dataId: detail?.dataId || node.dataId,
        node,
        detail,
        introBranch: branch,
      },
    };
  };

  const handleSelectIntroBranch = async (
    branch: (typeof ILSEONGNOK_INTRO_BRANCHES)[number]
  ) => {
    setSelectedIntroBranch(branch);
    setIntroBranchNodes([]);
    setSelectedKingName("");
    setSelectedReignYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
    setIsLeapMonth(false);
    setYearNodes([]);
    setMonthNodes([]);
    setDayNodes([]);
    setTreeError("");
    setIsKingPickerOpen(false);
    setIsYearPickerOpen(false);
    setIsMonthPickerOpen(false);
    setIsDayPickerOpen(false);
    setIsLoadingIntroBranch(true);

    try {
      const nodes = await fetchItkcTreeNodes({
        itemId: normalizedItemId,
        dataId: branch.dataId,
        depth: 1,
        dataGubun: "서지",
      });

      setIntroBranchNodes(nodes);

      const records = await Promise.all(
        nodes.map((node) => createIntroRecordFromNode(node, branch))
      );

      onSelectRecords?.(records, branch.name);
    } catch (error) {
      console.error("일성록 서문/범례 목록 로드 실패:", error);
      setIntroBranchNodes([]);
      setTreeError("일성록 서문·범례 항목을 불러오지 못했습니다.");
    } finally {
      setIsLoadingIntroBranch(false);
    }
  };

  const handleSelectIntroNode = async (node: ClassicTreeNode) => {
    if (!onSelectRecord) {
      setTreeError("이 항목을 표시할 상세 화면이 아직 연결되지 않았습니다.");
      return;
    }

    setTreeError("");
    setIsLoadingIntroBranch(true);

    try {
      const details = await fetchItkcNodeArticles({
        itemId: normalizedItemId,
        dataId: node.dataId,
        depth: node.depth || 2,
        dataGubun: node.dataGubun || "최종정보",
      });

      const detail = details[0];

      const record: ClassicRecord = {
        id: detail?.dataId || node.dataId,
        dataId: detail?.dataId || node.dataId,
        dci: detail?.dataId || node.dataId,
        title: detail?.title || node.label || "일성록 본문",
        bookTitle: selectedIntroBranch?.name || archiveLabel,
        volumeTitle: selectedIntroBranch?.name || archiveLabel,
        category: archiveLabel,
        itemId: normalizedItemId,
        searchText: detail?.bodyText || node.label || "본문 정보가 없습니다.",
        sourceUrl: makeIntroBranchNodeUrl(node),
        raw: {
          dataId: detail?.dataId || node.dataId,
          node,
          detail,
          introBranch: selectedIntroBranch,
        },
      };

      onSelectRecord(record);
    } catch (error) {
      console.error("일성록 서문/범례 본문 로드 실패:", error);
      setTreeError("선택한 일성록 항목의 본문을 불러오지 못했습니다.");
    } finally {
      setIsLoadingIntroBranch(false);
    }
  };

  const handleSelectKing = (kingName: string) => {
    setSelectedIntroBranch(null);
    setIntroBranchNodes([]);
    onSelectRecords?.([], "");
    setSelectedKingName(kingName);
    setSelectedReignYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
    setIsLeapMonth(false);
    setYearNodes([]);
    setMonthNodes([]);
    setDayNodes([]);
    setTreeError("");

    setIsKingPickerOpen(false);
    setIsYearPickerOpen(true);
    setIsMonthPickerOpen(false);
    setIsDayPickerOpen(false);

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
    
    setIsYearPickerOpen(false);
    setIsMonthPickerOpen(true);
    setIsDayPickerOpen(false);


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

    setIsMonthPickerOpen(false);
    setIsDayPickerOpen(true);

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
      setIsDayPickerOpen(false);

    const selection: ClassicDateSelection = {
        collectionId,
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

      const kingNodeId = makeRoyalRecordKingNodeId(normalizedItemId, selectedKingName);

      if (!kingNodeId) {
        setYearNodes([]);
        setTreeError(`${archiveLabel}에서 해당 왕대 코드를 찾지 못했습니다.`);
        return;
      }

      setIsLoadingYears(true);
      setTreeError("");

      try {
        const nodes = await fetchItkcTreeNodes({
          itemId: normalizedItemId,
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
          itemId: normalizedItemId,
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
          itemId: normalizedItemId,
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

    const matchedDayNode = dayNodes.find((node) => {
      return getDayFromNode(node) === initialDay;
    });

    if (!matchedDayNode) {
      return;
    }

    hasAutoSearchedRef.current = true;

    onSelectDate({
      collectionId,
      kingName: initialKingName,
      reignYear: initialReignYear,
      month: initialMonth,
      day: initialDay,
      isLeapMonth: initialIsLeapMonth,
      dateNodeId: matchedDayNode.dataId,
      dateNodeLabel: matchedDayNode.label,
      dateNodeUrl: makeItkcNodeUrl(matchedDayNode),
    });
  }, [
    collectionId,
    normalizedItemId,
    dayNodes,
    initialKingName,
    initialReignYear,
    initialMonth,
    initialDay,
    initialIsLeapMonth,
    onSelectDate,
  ]);

  return (
    <div className="h-full bg-[#2A0A07] border border-[#D4AF37]/20 p-4 space-y-4 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[#D4AF37]/20 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-[#D4AF37] font-serif font-black text-xs min-w-0">
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">
            {title || `${archiveLabel} 원문 탐색`}
          </span>
        </div>

        {onBackToLibrary && (
          <button
            type="button"
            onClick={onBackToLibrary}
            className="px-2.5 py-1 bg-[#4E1712] hover:bg-[#8B2518] text-[#D4AF37] hover:text-white text-[10px] font-serif border border-[#D4AF37]/40 cursor-pointer flex items-center gap-1 transition-all flex-shrink-0"
          >
            <LayoutGrid className="w-3 h-3" />
            <span>[서서도첩]</span>
          </button>
        )}
      </div>

      {treeError && (
        <div className="border border-red-900/40 bg-red-950/25 px-3 py-2 text-[10px] text-red-200 font-serif leading-relaxed flex-shrink-0">
          {treeError}
        </div>
      )}

      <div className="space-y-3 min-h-0 flex-1 overflow-y-auto scrollbar-hide pr-1">
        {isIlseongnok && (
          <div className="space-y-2">
            <span className="text-[10px] text-[#D4AF37] font-serif font-black tracking-widest uppercase">
              서문 · 범례
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {ILSEONGNOK_INTRO_BRANCHES.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  onClick={() => handleSelectIntroBranch(branch)}
                  className={`px-2 py-1.5 text-[11px] font-serif border text-left transition-all rounded-none ${
                    selectedIntroBranch?.id === branch.id
                      ? "bg-[#D4AF37] text-[#1E0402] border-[#D4AF37] font-black"
                      : "bg-[#1E0402] text-[#DEC5AC] border-[#D4AF37]/15 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
                  }`}
                >
                  {branch.name}
                </button>
              ))}
            </div>

            {isLoadingIntroBranch && (
              <p className="text-[10px] text-[#DEC5AC] font-serif">
                일성록 서문·범례 항목을 불러오는 중...
              </p>
            )}

            {introBranchNodes.length > 0 && (
              <div className="border border-[#D4AF37]/15 bg-[#1E0402] px-3 py-2 text-[10px] text-[#DEC5AC] font-serif leading-relaxed">
                {selectedIntroBranch?.name}의 원문 항목 {introBranchNodes.length}건을 오른쪽 원문 탐색 영역에 펼쳤습니다.
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsKingPickerOpen((prev) => !prev)}
            className="w-full flex items-center justify-between gap-2 text-[10px] font-serif font-black text-[#D4AF37] bg-[#1E0402] border border-[#D4AF37]/15 px-2 py-2 hover:border-[#D4AF37]/60 transition-all"
          >
            <span className="flex items-center gap-1.5">
              {selectedKingName ? (
                <FolderOpen className="w-3.5 h-3.5" />
              ) : (
                <Folder className="w-3.5 h-3.5" />
              )}
              {isIlseongnok ? "날짜 기록 선택" : "왕대 선택"}
            </span>

            <span className="text-[#DEC5AC] truncate max-w-[140px]">
              {selectedKingLabel}
            </span>
          </button>

          {isKingPickerOpen && (
            <div className="grid grid-cols-2 gap-1.5 max-h-[460px] overflow-y-auto scrollbar-hide pr-1">
              {kingOptions.map((king) => (
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
          )}
        </div>

        {selectedKing && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsYearPickerOpen((prev) => !prev)}
              className="w-full flex items-center justify-between gap-2 text-[10px] font-serif font-black text-[#D4AF37] bg-[#1E0402] border border-[#D4AF37]/15 px-2 py-2 hover:border-[#D4AF37]/60 transition-all"
            >
              <span className="flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" />
                재위년 선택
              </span>

              <span className="text-[#DEC5AC] truncate max-w-[140px]">
                {selectedYearLabel}
              </span>
            </button>

            {isYearPickerOpen && (
              <>
                {isLoadingYears ? (
                  <p className="text-[10px] text-[#DEC5AC] font-serif">
                    재위년 목록을 불러오는 중...
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-[420px] overflow-y-auto scrollbar-hide pr-1">
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
              </>
            )}
          </div>
        )}

        {selectedReignYear && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsMonthPickerOpen((prev) => !prev)}
              className="w-full flex items-center justify-between gap-2 text-[10px] font-serif font-black text-[#D4AF37] bg-[#1E0402] border border-[#D4AF37]/15 px-2 py-2 hover:border-[#D4AF37]/60 transition-all"
            >
              <span className="flex items-center gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" />
                월 선택
              </span>

              <span className="text-[#DEC5AC] truncate max-w-[140px]">
                {selectedMonthLabel}
              </span>
            </button>

            {isMonthPickerOpen && (
              <>
                {isLoadingMonths ? (
                  <p className="text-[10px] text-[#DEC5AC] font-serif">
                    월 목록을 불러오는 중...
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5 max-h-[220px] overflow-y-auto scrollbar-hide pr-1">
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
              </>
            )}
          </div>
        )}

        {selectedMonth && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsDayPickerOpen((prev) => !prev)}
              className="w-full flex items-center justify-between gap-2 text-[10px] font-serif font-black text-[#D4AF37] bg-[#1E0402] border border-[#D4AF37]/15 px-2 py-2 hover:border-[#D4AF37]/60 transition-all"
            >
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                일자 선택
              </span>

              <span className="text-[#DEC5AC] truncate max-w-[140px]">
                {selectedDayLabel}
              </span>
            </button>

            {isDayPickerOpen && (
              <>
                {isLoadingDays ? (
                  <p className="text-[10px] text-[#DEC5AC] font-serif">
                    일자 목록을 불러오는 중...
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1 max-h-[340px] overflow-y-auto scrollbar-hide pr-1">
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}