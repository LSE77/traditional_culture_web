import { parseItkcTreeHtml, type ClassicTreeNode } from "./itkcTreeParser";

type FetchItkcTreeNodesParams = {
  dataId: string;
  depth: 1 | 2 | 3 | 4;
  dataGubun: "서지" | "재위년" | "월" | "일";
};

export const fetchItkcTreeNodes = async ({
  dataId,
  depth,
  dataGubun,
}: FetchItkcTreeNodesParams): Promise<ClassicTreeNode[]> => {
  const params = new URLSearchParams({
    itemId: "JT",
    gubun: "book",
    depth: String(depth),
    dataGubun,
    dataId,
  });

  const response = await fetch(`/api/itkc-tree?${params.toString()}`);
  const html = await response.text();

  if (!response.ok) {
    console.error("ITKC treeAjax failed:", {
      status: response.status,
      html: html.slice(0, 500),
    });

    return [];
  }

  return parseItkcTreeHtml(html);
};