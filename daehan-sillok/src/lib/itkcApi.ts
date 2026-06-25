import { parseItkcSearchXml } from "./itkcXmlParser";
import type { ClassicRecord, ClassicSearchTarget } from "../types/classics";

type SearchClassicRecordsParams = {
  keyword: string;
  secId?: ClassicSearchTarget;
  start?: number;
  rows?: number;
};

export const searchClassicRecords = async ({
  keyword,
  secId = "JT_BD",
  start = 0,
  rows = 100,
}: SearchClassicRecordsParams): Promise<ClassicRecord[]> => {
  const trimmedKeyword = keyword.trim();

  if (!trimmedKeyword) {
    return [];
  }

  const params = new URLSearchParams({
    keyword: trimmedKeyword,
    secId,
    start: String(start),
    rows: String(rows),
  });

  const requestUrl = `/api/itkc-search?${params.toString()}`;

  console.log("ITKC client request:", requestUrl);

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Accept: "application/xml,text/xml,application/json,*/*",
      },
    });
  } catch (error) {
    console.error("ITKC proxy fetch failed:", {
      requestUrl,
      currentOrigin: window.location.origin,
      error,
    });

    throw new Error(
      "내부 API(/api/itkc-search)에 연결하지 못했습니다. server.ts가 실행 중인지 확인하세요."
    );
  }

  const text = await response.text();
  const trimmedText = text.trim();

  if (!response.ok) {
    console.error("ITKC proxy response error:", {
      status: response.status,
      requestUrl,
      body: trimmedText.slice(0, 500),
    });

    throw new Error("한국고전종합DB API 프록시 호출에 실패했습니다.");
  }

  if (
    trimmedText.startsWith("<!doctype") ||
    trimmedText.startsWith("<!DOCTYPE") ||
    trimmedText.startsWith("<html") ||
    trimmedText.includes('<div id="root">')
  ) {
    console.error("API가 XML이 아니라 HTML을 반환했습니다:", {
      requestUrl,
      body: trimmedText.slice(0, 500),
    });

    throw new Error(
      "/api/itkc-search가 XML이 아니라 HTML을 반환했습니다. server.ts 프록시가 실행 중인지 확인하세요."
    );
  }

  if (trimmedText.startsWith("{") || trimmedText.startsWith("[")) {
    const json = JSON.parse(trimmedText);

    if (Array.isArray(json)) {
      return json as ClassicRecord[];
    }

    if (Array.isArray(json.records)) {
      return json.records as ClassicRecord[];
    }

    if (typeof json.xml === "string") {
      return parseItkcSearchXml(json.xml);
    }

    return [];
  }

  return parseItkcSearchXml(trimmedText);
};