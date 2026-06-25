import {
  parseItkcNodeHtml,
  type ItkcArticleDetail,
} from "./itkcNodeParser";

type FetchItkcNodeArticlesParams = {
  dataId: string;
  depth: 4 | 5;
  dataGubun: "일" | "최종정보";
};

export const fetchItkcNodeArticles = async ({
  dataId,
  depth,
  dataGubun,
}: FetchItkcNodeArticlesParams): Promise<ItkcArticleDetail[]> => {
  const params = new URLSearchParams({
    itemId: "JT",
    gubun: "book",
    depth: String(depth),
    dataGubun,
    dataId,
  });

  const response = await fetch(`/api/itkc-node?${params.toString()}`);
  const html = await response.text();

  if (!response.ok) {
    console.error("ITKC node fetch failed:", {
      status: response.status,
      html: html.slice(0, 500),
    });

    return [];
  }

  return parseItkcNodeHtml(html);
};