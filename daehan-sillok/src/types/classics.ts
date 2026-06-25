export type ClassicBrowseType =
  | "king-date"
  | "date"
  | "book-volume-title";

export type ClassicSearchTarget =
  | "JT_AA"
  | "JT_SJ"
  | "JT_GS"
  | "JT_BD"
  | "JR_AA"
  | "JR_SJ"
  | "JR_GS"
  | "JR_BD"
  | string;

export type ClassicDateSelection = {
  collectionId: string;
  kingName?: string;
  reignYear?: number | null;
  month?: number | null;
  day?: number | null;
  isLeapMonth?: boolean;
  dateNodeId?: string;
  dateNodeLabel?: string;
  dateNodeUrl?: string;
};

export type ClassicRecord = {
  id: string;
  dataId?: string;
  dci?: string;
  title: string;
  bookTitle?: string;
  volumeTitle?: string;
  sourceId?: string;
  itemId?: string;
  category?: string;
  searchText?: string;
  sourceUrl?: string;
  raw?: Record<string, unknown>;
};