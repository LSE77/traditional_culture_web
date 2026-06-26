import {
  parseItkcTreeHtml,
  type ClassicTreeNode,
} from "./itkcTreeParser";

type FetchItkcTreeNodesParams = {
  itemId?: string;
  dataId?: string;
  depth: number;
  dataGubun?: string;
  cate1?: string;
  cate2?: string;
};

export const fetchItkcTreeNodes = async ({
  itemId = "JT",
  dataId = "",
  depth,
  dataGubun = "",
  cate1 = "",
  cate2 = "",
}: FetchItkcTreeNodesParams): Promise<ClassicTreeNode[]> => {
  const params = new URLSearchParams({
    itemId,
    gubun: "book",
    depth: String(depth),
    cate1,
    cate2,
    dataGubun,
    dataId,
  });

  const response = await fetch(`/api/itkc-tree?${params.toString()}`);
  const html = await response.text();

  if (!response.ok) {
    console.error("ITKC tree fetch failed:", {
      status: response.status,
      itemId,
      dataId,
      depth,
      dataGubun,
      html: html.slice(0, 500),
    });
    return [];
  }

  return parseItkcTreeHtml(html);
};
