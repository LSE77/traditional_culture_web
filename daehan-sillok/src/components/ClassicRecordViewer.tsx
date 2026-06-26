import { Loader2 } from "lucide-react";
import type { ClassicDateSelection, ClassicRecord } from "../types/classics";

type ClassicRecordViewerProps = {
  selection: ClassicDateSelection;
  records: ClassicRecord[];
  selectedDataId?: string | null;
  isLoading: boolean;
  error: string;
};

const buildSelectionLabel = (selection: ClassicDateSelection) => {
  const parts: string[] = [];

  if (selection.kingName) {
    parts.push(selection.kingName);
  }

  if (selection.reignYear) {
    parts.push(`${selection.reignYear}년`);
  }

  if (selection.month) {
    parts.push(`${selection.isLeapMonth ? "윤" : ""}${selection.month}월`);
  }

  if (selection.day) {
    parts.push(`${selection.day}일`);
  }

  return parts.join(" ");
};

const getRecordId = (record: ClassicRecord) => {
  return record.dataId ?? record.dci ?? record.id ?? "";
};

export default function ClassicRecordViewer({
  selection,
  records,
  selectedDataId,
  isLoading,
  error,
}: ClassicRecordViewerProps) {
  const selectionLabel = buildSelectionLabel(selection);
  const hasSelection = Boolean(selectionLabel);

  const selectedRecord =
    records.find((record) => getRecordId(record) === selectedDataId) ??
    records[0];

  const detailLines = (
    selectedRecord?.searchText ||
    selectedRecord?.title ||
    ""
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="border-t border-[#5C4033]/20 pt-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black text-[#8B0000] tracking-widest font-serif block uppercase">
          사건 상세 정본 (詳細正本)
        </span>
      </div>

      {isLoading && (
        <div className="min-h-[160px] flex flex-col items-center justify-center gap-2 border border-[#8B0000]/10 bg-[#F7EFE2]/60">
          <Loader2 className="w-5 h-5 text-[#8B0000] animate-spin" />
          <p className="text-xs font-serif text-[#6B4A32]">
            고전 원문을 불러오는 중입니다...
          </p>
        </div>
      )}

      {!isLoading && error && (
        <div className="min-h-[120px] flex items-center justify-center border border-[#8B0000]/15 bg-[#F7EFE2]/60 px-4 text-center">
          <p className="text-xs font-serif text-[#8B0000] leading-relaxed">
            {error}
          </p>
        </div>
      )}

      {!isLoading && !error && selectedRecord && detailLines.length > 0 && (
        <ul className="space-y-1 text-xs text-[#3E352C] font-serif list-disc pl-4 leading-relaxed text-justify">
          {detailLines.map((line, index) => (
            <li
              key={`classic-detail-${index}`}
              className="marker:text-[#8B0000]"
            >
              {line}
            </li>
          ))}
        </ul>
      )}

      {!isLoading && !error && selectedRecord && detailLines.length === 0 && (
        <p className="text-xs text-[#3E352C] font-serif leading-relaxed">
          원문 상세 내용이 아직 없습니다.
        </p>
      )}

      {!isLoading && !error && !selectedRecord && hasSelection && (
        <div className="min-h-[120px] flex items-center justify-center border border-[#8B0000]/10 bg-[#F7EFE2]/60 px-4 text-center">
          <p className="text-xs font-serif text-[#6B4A32] leading-relaxed">
            선택한 날짜에 해당하는 원문 기사가 없습니다.
          </p>
        </div>
      )}

      {!isLoading && !error && !selectedRecord && !hasSelection && (
        <p className="text-xs text-[#3E352C] font-serif leading-relaxed">
          원문 기사를 선택하면 상세 내용이 표시됩니다.
        </p>
      )}
    </div>
  );
}