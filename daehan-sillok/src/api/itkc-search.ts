import type { ClassicRecord } from "../types/classics";

const stripHtml = (value: string) => {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .trim();
};

const getFieldValue = (
  fields: Record<string, string>,
  fieldNames: string[]
) => {
  for (const fieldName of fieldNames) {
    const value = fields[fieldName]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
};

const findItkcId = (fields: Record<string, string>) => {
  const values = Object.values(fields);

  return (
    values.find((value) => /^ITKC_[A-Z]+_[A-Z0-9]+_/.test(value)) ??
    values.find((value) => value.startsWith("ITKC_")) ??
    ""
  );
};

const makeSourceUrl = (record: {
  itemId?: string;
  dataId?: string;
  dci?: string;
}) => {
  const id = record.dataId ?? record.dci;

  if (!record.itemId || !id) {
    return undefined;
  }

  return `https://db.itkc.or.kr/dir/item?itemId=${encodeURIComponent(
    record.itemId
  )}&dataId=${encodeURIComponent(id)}`;
};

export const parseItkcSearchXml = (xml: string): ClassicRecord[] => {
  if (!xml.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(xml, "application/xml");

  const parserError = document.querySelector("parsererror");

  if (parserError) {
    console.error("ITKC XML parse error:", parserError.textContent);
    return [];
  }

  const docs = Array.from(document.querySelectorAll("doc"));

  return docs.map((doc, index) => {
    const fields = Object.fromEntries(
      Array.from(doc.querySelectorAll("field"))
        .map((field) => [
          field.getAttribute("name") ?? "",
          field.textContent?.trim() ?? "",
        ])
        .filter(([name]) => Boolean(name))
    ) as Record<string, string>;

    const rawDataId = getFieldValue(fields, [
      "dataId",
      "DATA_ID",
      "data_id",
      "자료ID",
      "문서ID",
      "기사ID",
      "ID",
      "id",
    ]);

    const dci = getFieldValue(fields, [
      "DCI_s",
      "DCI",
      "dci",
      "DCI값",
      "문서고유번호",
    ]);

    const fallbackItkcId = findItkcId(fields);
    const dataId = rawDataId || dci || fallbackItkcId;

    const bibliographyId = getFieldValue(fields, [
      "서지ID",
      "서지 아이디",
      "bookId",
      "BOOK_ID",
    ]);

    const itemId =
      getFieldValue(fields, [
        "itemId",
        "ITEM_ID",
        "item_id",
        "자료구분ID",
        "자료ID",
      ]) || "JT";

    const title = stripHtml(
      getFieldValue(fields, [
        "title",
        "TITLE",
        "제목",
        "기사명",
        "기사제목",
        "GS",
        "M_TITLE",
      ])
    );

    const bookTitle = stripHtml(
      getFieldValue(fields, [
        "bookTitle",
        "BOOK_TITLE",
        "서명",
        "서지명",
        "문헌명",
        "자료명",
        "SJ",
      ])
    );

    const volumeTitle = stripHtml(
      getFieldValue(fields, [
        "volumeTitle",
        "VOLUME_TITLE",
        "권차명",
        "권명",
        "권",
        "KC",
      ])
    );

    const category = stripHtml(
      getFieldValue(fields, [
        "category",
        "CATEGORY",
        "자료구분",
        "분류",
      ])
    );

    const searchText = stripHtml(
      getFieldValue(fields, [
        "searchText",
        "SEARCH_TEXT",
        "본문",
        "원문",
        "내용",
        "BD",
        "contents",
        "CONTENT",
        "text",
      ])
    );

    const record = {
      id: dataId || bibliographyId || `itkc-record-${index}`,
      dataId: dataId || undefined,
      dci: dci || dataId || undefined,
      title: title || bookTitle || volumeTitle || "제목 없음",
      bookTitle: bookTitle || undefined,
      volumeTitle: volumeTitle || undefined,
      sourceId: bibliographyId || undefined,
      itemId: itemId || undefined,
      category: category || undefined,
      searchText: searchText || undefined,
      raw: fields,
    } satisfies ClassicRecord;

    return {
      ...record,
      sourceUrl: makeSourceUrl(record),
    };
  });
};