import {
  parseItkcNodeHtml,
  type ItkcArticleDetail,
} from "./itkcNodeParser";

type FetchItkcNodeArticlesParams = {
  itemId?: string;
  dataId: string;
  depth: number;
  dataGubun: string;
};

export const fetchItkcNodeArticles = async ({
  itemId = "JT",
  dataId,
  depth,
  dataGubun,
}: FetchItkcNodeArticlesParams): Promise<ItkcArticleDetail[]> => {
  const params = new URLSearchParams({
    itemId,
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
      itemId,
      dataId,
      depth,
      dataGubun,
      html: html.slice(0, 500),
    });
    return [];
  }

  return parseItkcNodeHtml(html);
};
