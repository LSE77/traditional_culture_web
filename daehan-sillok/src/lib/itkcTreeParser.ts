export type ClassicTreeNode = {
  dataId: string;
  label: string;
  url: string;
  depth: number | null;
  dataGubun: string;
};

const getQueryValue = (url: string, key: string) => {
  const query = url.startsWith("?") ? url.slice(1) : url;
  const params = new URLSearchParams(query);

  return params.get(key) ?? "";
};

export const parseItkcTreeHtml = (html: string): ClassicTreeNode[] => {
  if (!html.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(`<ul>${html}</ul>`, "text/html");

  return Array.from(document.querySelectorAll("li"))
    .map((item) => {
      const dataId = item.getAttribute("data-dataId")?.trim() ?? "";
      const url = item.getAttribute("data-url")?.trim() ?? "";
      const span = item.querySelector(":scope > span");

      const label =
        span?.getAttribute("title")?.trim() ||
        span?.textContent?.trim() ||
        "";

      const depthText = getQueryValue(url, "depth");
      const depth = depthText ? Number(depthText) : null;
      const dataGubun = getQueryValue(url, "dataGubun");

      return {
        dataId,
        label,
        url,
        depth,
        dataGubun,
      };
    })
    .filter((node) => {
      if (!node.dataId || !node.label || !node.url) {
        return false;
      }

      if (
        node.label === "총서" ||
        node.label === "부록" ||
        node.dataId.endsWith("_000") ||
        node.dataId.endsWith("_C00")
      ) {
        return false;
      }

      return true;
    });
};