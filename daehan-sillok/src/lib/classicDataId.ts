import type { ClassicDateSelection } from "../types/classics";

const pad2 = (value: number) => String(value).padStart(2, "0");

const makeMonthCode = (month: number, isLeapMonth = false) => {
  return `${pad2(month)}${isLeapMonth ? "B" : "A"}`;
};

const makeDayCode = (day: number) => {
  return `${pad2(day)}A`;
};

const normalizeKingName = (kingName: string) => {
  return kingName
    .replace(/\s/g, "")
    .replace(/[()（）]/g, "")
    .replace(/실록/g, "")
    .replace(/일기/g, "")
    .replace(/대왕/g, "")
    .trim();
};

const JOSEON_SILLOK_KING_CODES: Record<string, string> = {
  태조: "A0",
  정종: "B0",
  태종: "C0",
  세종: "D0",
  문종: "E0",
  단종: "F0",
  세조: "G0",
  예종: "H0",
  성종: "I0",
  연산군: "J0",
  중종: "K0",
  인종: "L0",
  명종: "M0",

  선조: "N0",
  선조수정: "N1",

  광해군: "O0",
  인조: "P0",
  효종: "Q0",

  현종: "R0",
  현종개수: "R1",

  숙종: "S0",
  숙종보궐정오: "S1",

  경종: "T0",
  경종수정: "T1",

  영조: "U0",
  정조: "V0",
  순조: "W0",
  헌종: "X0",
  철종: "Y0",
};

type FirstRecordDate = {
  reignYear: number;
  month: number;
  day: number;
  isLeapMonth?: boolean;
};

const JOSEON_SILLOK_FIRST_RECORD_DATES: Record<string, FirstRecordDate> = {
  태조: { reignYear: 1, month: 7, day: 17 },
  정종: { reignYear: 1, month: 1, day: 1 },
  태종: { reignYear: 1, month: 1, day: 1 },
  세종: { reignYear: 1, month: 1, day: 1 },
  문종: { reignYear: 1, month: 1, day: 1 },
  단종: { reignYear: 1, month: 1, day: 1 },
  세조: { reignYear: 1, month: 6, day: 11, isLeapMonth: true },
  예종: { reignYear: 1, month: 1, day: 1 },
  성종: { reignYear: 1, month: 1, day: 1 },
  연산군: { reignYear: 1, month: 1, day: 1 },
  중종: { reignYear: 1, month: 9, day: 2 },
  인종: { reignYear: 1, month: 1, day: 1 },
  명종: { reignYear: 1, month: 1, day: 1 },

  선조: { reignYear: 1, month: 1, day: 12 },
  선조수정: { reignYear: 1, month: 1, day: 1 },

  광해군: { reignYear: 1, month: 1, day: 1 },
  인조: { reignYear: 1, month: 3, day: 13 },
  효종: { reignYear: 1, month: 1, day: 1 },

  현종: { reignYear: 1, month: 1, day: 1 },
  현종개수: { reignYear: 1, month: 1, day: 1 },

  숙종: { reignYear: 1, month: 1, day: 1 },
  숙종보궐정오: { reignYear: 1, month: 1, day: 6 },

  경종: { reignYear: 1, month: 1, day: 1 },
  경종수정: { reignYear: 1, month: 1, day: 1 },

  영조: { reignYear: 1, month: 1, day: 1 },
  정조: { reignYear: 1, month: 1, day: 1 },
  순조: { reignYear: 1, month: 1, day: 1 },
  헌종: { reignYear: 1, month: 1, day: 3 },
  철종: { reignYear: 1, month: 1, day: 1 },
};

const makeJoseonSillokVolumeCode = (reignYear: number) => {
  return `A${pad2(reignYear)}`;
};

const getMonthOrder = (month: number, isLeapMonth = false) => {
  return month * 2 + (isLeapMonth ? 1 : 0);
};

const isBeforeFirstRecordDate = (
  selection: Required<
    Pick<ClassicDateSelection, "reignYear" | "month" | "day" | "isLeapMonth">
  >,
  firstRecordDate: FirstRecordDate
) => {
  if (selection.reignYear > firstRecordDate.reignYear) {
    return false;
  }

  if (selection.reignYear < firstRecordDate.reignYear) {
    return true;
  }

  const selectedMonthOrder = getMonthOrder(
    selection.month,
    selection.isLeapMonth
  );

  const firstMonthOrder = getMonthOrder(
    firstRecordDate.month,
    firstRecordDate.isLeapMonth ?? false
  );

  if (selectedMonthOrder < firstMonthOrder) {
    return true;
  }

  if (selectedMonthOrder > firstMonthOrder) {
    return false;
  }

  return selection.day < firstRecordDate.day;
};

export const makeClassicDateNodeId = (selection: ClassicDateSelection) => {
  if (selection.collectionId !== "joseon-sillok") {
    return null;
  }

  if (
    !selection.kingName ||
    !selection.reignYear ||
    !selection.month ||
    !selection.day
  ) {
    return null;
  }

  const kingName = normalizeKingName(selection.kingName);
  const kingCode = JOSEON_SILLOK_KING_CODES[kingName];

  if (!kingCode) {
    return null;
  }

  const normalizedSelection = {
    reignYear: selection.reignYear,
    month: selection.month,
    day: selection.day,
    isLeapMonth: selection.isLeapMonth ?? false,
  };

  const firstRecordDate = JOSEON_SILLOK_FIRST_RECORD_DATES[kingName];

  if (
    firstRecordDate &&
    isBeforeFirstRecordDate(normalizedSelection, firstRecordDate)
  ) {
    return null;
  }

  return `ITKC_JT_${kingCode}_${makeJoseonSillokVolumeCode(
    selection.reignYear
  )}_${makeMonthCode(
    selection.month,
    selection.isLeapMonth ?? false
  )}_${makeDayCode(selection.day)}`;
};

export const makeClassicDateNodeUrl = (selection: ClassicDateSelection) => {
  const dataId = makeClassicDateNodeId(selection);

  if (!dataId) {
    return null;
  }

  const params = new URLSearchParams({
    grpId: "",
    itemId: "JT",
    gubun: "book",
    depth: "4",
    cate1: "",
    cate2: "",
    dataGubun: "일",
    dataId,
  });

  return `https://db.itkc.or.kr/dir/node?${params.toString()}`;
};

export const makeClassicKingNodeId = (kingName: string) => {
  const normalizedKingName = normalizeKingName(kingName);
  const kingCode = JOSEON_SILLOK_KING_CODES[normalizedKingName];

  if (!kingCode) {
    return null;
  }

  return `ITKC_JT_${kingCode}`;
};