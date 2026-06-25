export type ItkcArticleDetail = {
  dataId: string;
  title: string;
  paragraphs: string[];
  bodyText: string;
};

const cleanText = (text: string) => {
  return text.replace(/\s+/g, " ").trim();
};

const shouldExcludeParagraph = (text: string) => {
  return text.startsWith("【원전】") || text.startsWith("【분류】");
};

const extractTitle = (block: Element) => {
  const titleElement = block.querySelector(".text_body_tit h4");

  if (!titleElement) {
    return "";
  }

  const clonedTitle = titleElement.cloneNode(true) as HTMLElement;
  clonedTitle.querySelector(".datenum")?.remove();

  return cleanText(clonedTitle.textContent ?? "");
};

export const parseItkcNodeHtml = (html: string): ItkcArticleDetail[] => {
  if (!html.trim()) {
    return [];
  }

  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  return Array.from(document.querySelectorAll(".para_block[data-viewnode-id]"))
    .map((block) => {
      const dataId = block.getAttribute("data-viewnode-id")?.trim() ?? "";
      const title = extractTitle(block);

      const paragraphs = Array.from(
        block.querySelectorAll(
          '.text_body[data-xsl-gubun="최종정보"] .xsl_para'
        )
      )
        .map((paragraph) => cleanText(paragraph.textContent ?? ""))
        .filter((text) => text && !shouldExcludeParagraph(text));

      return {
        dataId,
        title,
        paragraphs,
        bodyText: paragraphs.join("\n"),
      };
    })
    .filter((article) => article.dataId && (article.title || article.bodyText));
};