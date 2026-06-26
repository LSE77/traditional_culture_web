import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronRight,
  Folder,
  FolderOpen,
  LayoutGrid,
  Loader2,
} from "lucide-react";
import { fetchItkcTreeNodes } from "../lib/itkcTreeApi";
import { fetchItkcNodeArticles } from "../lib/itkcNodeApi";
import type { ClassicTreeNode } from "../lib/itkcTreeParser";
import type { ClassicRecord } from "../types/classics";

const HANGUL_GROUPS = [
  { code: "A", label: "ㄱ" },
  { code: "B", label: "ㄴ" },
  { code: "C", label: "ㄷ" },
  { code: "D", label: "ㄹ" },
  { code: "E", label: "ㅁ" },
  { code: "F", label: "ㅂ" },
  { code: "G", label: "ㅅ" },
  { code: "H", label: "ㅇ" },
  { code: "I", label: "ㅈ" },
  { code: "J", label: "ㅊ" },
  { code: "K", label: "ㅋ" },
  { code: "L", label: "ㅌ" },
  { code: "M", label: "ㅍ" },
  { code: "N", label: "ㅎ" },
];

type TranslatedClassicTreeBrowserProps = {
  title?: string;
  itemId?: string;
  initialCate1?: string | null;
  initialDataId?: string | null;
  initialBookTitle?: string;
  onBackToLibrary?: () => void;
  onSelectRecord: (record: ClassicRecord) => void;
};

type TreeLevel = {
  node: ClassicTreeNode;
  children: ClassicTreeNode[];
};

const getQueryParamsFromNode = (node: ClassicTreeNode) => {
  const rawUrl = node.url || "";
  const query = rawUrl.includes("?") ? rawUrl.split("?")[1] : rawUrl;
  return new URLSearchParams(query);
};

const makeNodeUrl = (node: ClassicTreeNode, itemId: string) => {
  if (node.url?.startsWith("http")) {
    return node.url;
  }

  if (node.url?.startsWith("?")) {
    return `https://db.itkc.or.kr/dir/node${node.url}`;
  }

  if (node.url) {
    return `https://db.itkc.or.kr/dir/node?${node.url}`;
  }

  const params = new URLSearchParams({
    itemId,
    gubun: "book",
    dataId: node.dataId,
  });

  return `https://db.itkc.or.kr/dir/node?${params.toString()}`;
};

const getNextTreeRequest = ({
  node,
  itemId,
  cate1,
  fallbackDepth,
}: {
  node: ClassicTreeNode;
  itemId: string;
  cate1: string;
  fallbackDepth: number;
}) => {
  const params = getQueryParamsFromNode(node);
  const depth = Number(params.get("depth") || fallbackDepth);

  return {
    itemId: params.get("itemId") || itemId,
    dataId: params.get("dataId") || node.dataId,
    depth: Number.isFinite(depth) ? depth : fallbackDepth,
    dataGubun: params.get("dataGubun") || node.dataGubun || "",
    cate1: params.get("cate1") || cate1,
    cate2: params.get("cate2") || "",
  };
};

const makeRecordFromDetail = ({
  detail,
  node,
  itemId,
  bookTitle,
  pathLabel,
  index,
}: {
  detail: { dataId: string; title: string; bodyText: string };
  node: ClassicTreeNode;
  itemId: string;
  bookTitle: string;
  pathLabel: string;
  index: number;
}): ClassicRecord => {
  return {
    id: detail.dataId || `${node.dataId}-${index}`,
    dataId: detail.dataId || node.dataId,
    dci: detail.dataId || node.dataId,
    title: detail.title || node.label || "제목 없음",
    bookTitle,
    volumeTitle: pathLabel,
    category: "고전번역서",
    itemId,
    searchText: detail.bodyText || node.label || "본문 정보가 없습니다.",
    sourceUrl: makeNodeUrl(node, itemId),
    raw: {
      dataId: detail.dataId || node.dataId,
      node,
      pathLabel,
      detail,
    },
  };
};

export default function TranslatedClassicTreeBrowser({
  title = "고전번역서 원문 탐색",
  itemId = "BT",
  initialCate1 = null,
  initialDataId = null,
  initialBookTitle = "고전번역서",
  onBackToLibrary,
  onSelectRecord,
}: TranslatedClassicTreeBrowserProps) {
  const normalizedItemId = itemId.trim().toUpperCase() || "BT";

  const [selectedCate1, setSelectedCate1] = useState(initialCate1 ?? "");
  const [bookNodes, setBookNodes] = useState<ClassicTreeNode[]>([]);
  const [levels, setLevels] = useState<TreeLevel[]>([]);
  const [records, setRecords] = useState<ClassicRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [treeError, setTreeError] = useState("");

  const activePath = useMemo(() => {
    return levels.map((level) => level.node.label).filter(Boolean);
  }, [levels]);

  const pathLabel = activePath.length > 0 ? activePath.join(" > ") : initialBookTitle;
  const activeBookTitle = activePath[0] || initialBookTitle;

  const loadBooksByCate1 = async (cate1: string) => {
    setSelectedCate1(cate1);
    setLevels([]);
    setRecords([]);
    setIsLoading(true);
    setTreeError("");

    try {
      const nodes = await fetchItkcTreeNodes({
        itemId: normalizedItemId,
        depth: 1,
        cate1,
        dataGubun: "",
        dataId: "",
      });

      setBookNodes(nodes);
    } catch (error) {
      console.error("고전번역서 문헌 목록 로드 실패:", error);
      setBookNodes([]);
      setTreeError("고전번역서 문헌 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNode = async (node: ClassicTreeNode, levelIndex: number) => {
    const nextLevels = levels.slice(0, levelIndex);
    const nextPath = [...nextLevels.map((level) => level.node.label), node.label]
      .filter(Boolean)
      .join(" > ");

    setIsLoading(true);
    setTreeError("");
    setRecords([]);

    try {
      const request = getNextTreeRequest({
        node,
        itemId: normalizedItemId,
        cate1: selectedCate1 || initialCate1 || "",
        fallbackDepth: Math.max(2, levelIndex + 2),
      });

      const [children, articleDetails] = await Promise.all([
        fetchItkcTreeNodes(request),
        fetchItkcNodeArticles({
          itemId: normalizedItemId,
          dataId: request.dataId,
          depth: request.depth,
          dataGubun: request.dataGubun || "",
        }),
      ]);

      const nextTreeLevel = { node, children };
      setLevels([...nextLevels, nextTreeLevel]);

      const nextRecords = articleDetails.map((detail, index) => {
        return makeRecordFromDetail({
          detail,
          node,
          itemId: normalizedItemId,
          bookTitle: activeBookTitle || initialBookTitle,
          pathLabel: nextPath || node.label,
          index,
        });
      });

      setRecords(nextRecords);

      if (children.length === 0 && nextRecords.length === 1) {
        onSelectRecord(nextRecords[0]);
      }
    } catch (error) {
      console.error("고전번역서 노드 로드 실패:", error);
      setTreeError("선택한 고전번역서 항목을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialDataId) {
      return;
    }

    const rootNode: ClassicTreeNode = {
      dataId: initialDataId,
      label: initialBookTitle,
      url: `itemId=${normalizedItemId}&gubun=book&depth=2&cate1=${initialCate1 ?? ""}&cate2=&dataGubun=서지&dataId=${initialDataId}`,
      depth: 2,
      dataGubun: "서지",
    };

    setSelectedCate1(initialCate1 ?? "");
    setBookNodes([]);
    void loadNode(rootNode, 0);
    // 초기 문헌 직결은 최초 1회만 수행합니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDataId]);

  const currentChildren = levels.length > 0 ? levels[levels.length - 1].children : [];

  return (
    <div className="h-full bg-[#2A0A07] border border-[#D4AF37]/20 p-4 space-y-4 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-[#D4AF37]/20 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2 text-[#D4AF37] font-serif font-black text-xs min-w-0">
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">{title}</span>
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

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide pr-1 space-y-3">
        {!initialDataId && (
          <div className="space-y-2">
            <span className="text-[10px] text-[#D4AF37] font-serif font-black tracking-widest uppercase">
              한글 분류
            </span>
            <div className="grid grid-cols-7 gap-1.5">
              {HANGUL_GROUPS.map((group) => (
                <button
                  key={group.code}
                  type="button"
                  onClick={() => loadBooksByCate1(group.code)}
                  className={`px-2 py-1.5 text-[11px] font-serif border transition-all rounded-none ${
                    selectedCate1 === group.code
                      ? "bg-[#D4AF37] text-[#1E0402] border-[#D4AF37] font-black"
                      : "bg-[#1E0402] text-[#DEC5AC] border-[#D4AF37]/15 hover:border-[#D4AF37]/60 hover:text-[#D4AF37]"
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-[10px] text-[#DEC5AC] font-serif">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
            고전번역서 트리를 불러오는 중...
          </div>
        )}

        {bookNodes.length > 0 && levels.length === 0 && (
          <div className="space-y-2">
            <span className="text-[10px] text-[#D4AF37] font-serif font-black tracking-widest uppercase">
              문헌 선택
            </span>
            <div className="space-y-1.5 max-h-[430px] overflow-y-auto scrollbar-hide pr-1">
              {bookNodes.map((node) => (
                <button
                  key={node.dataId}
                  type="button"
                  onClick={() => loadNode(node, 0)}
                  className="w-full px-2.5 py-2 text-[11px] font-serif border text-left transition-all rounded-none bg-[#1E0402] text-[#DEC5AC] border-[#D4AF37]/15 hover:border-[#D4AF37]/60 hover:text-[#D4AF37] flex items-center gap-1.5"
                >
                  <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{node.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {activePath.length > 0 && (
          <div className="bg-[#1E0402] border border-[#D4AF37]/15 p-2.5 text-[10px] text-[#DEC5AC] font-serif leading-relaxed">
            {activePath.map((label, index) => (
              <span key={`${label}-${index}`}>
                {index > 0 && <span className="text-[#D4AF37]"> &gt; </span>}
                {label}
              </span>
            ))}
          </div>
        )}

        {currentChildren.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] text-[#D4AF37] font-serif font-black tracking-widest uppercase">
              하위 항목
            </span>
            <div className="space-y-1.5 max-h-[360px] overflow-y-auto scrollbar-hide pr-1">
              {currentChildren.map((node) => (
                <button
                  key={node.dataId}
                  type="button"
                  onClick={() => loadNode(node, levels.length)}
                  className="w-full px-2.5 py-2 text-[11px] font-serif border text-left transition-all rounded-none bg-[#1E0402] text-[#DEC5AC] border-[#D4AF37]/15 hover:border-[#D4AF37]/60 hover:text-[#D4AF37] flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="flex-1">{node.label}</span>
                  <ChevronRight className="w-3 h-3 text-[#D4AF37]/70" />
                </button>
              ))}
            </div>
          </div>
        )}

        {records.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] text-[#D4AF37] font-serif font-black tracking-widest uppercase">
              본문 후보
            </span>
            <div className="space-y-1.5">
              {records.map((record) => (
                <button
                  key={record.dataId || record.id}
                  type="button"
                  onClick={() => onSelectRecord(record)}
                  className="w-full px-2.5 py-2 text-[11px] font-serif border text-left transition-all rounded-none bg-[#310D0A] text-[#F5F2ED] border-[#D4AF37]/25 hover:border-[#D4AF37] hover:text-[#D4AF37]"
                >
                  {record.title || "본문 보기"}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isLoading && !initialDataId && !selectedCate1 && (
          <div className="min-h-[160px] flex items-center justify-center border border-[#D4AF37]/15 bg-[#1C0604] px-4 text-center">
            <p className="text-xs text-[#DEC5AC] font-serif leading-relaxed">
              고전번역서는 문헌마다 구조가 다르므로 한글 분류와 실제 항목 트리를 그대로 따라갑니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
