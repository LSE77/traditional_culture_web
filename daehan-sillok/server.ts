import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API client:", err);
  }
} else {
  console.log("GEMINI_API_KEY not found. Server will run with local backup responses.");
}

function extractJsonObject(text: string) {
  const cleaned = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in Gemini response");
  }

  return JSON.parse(cleaned.slice(start, end + 1));
}

function getBackupAnalysis(topicName: string) {
  const db: Record<string, string> = {
    "위화도 회군": `### 1. 사학적 의의와 성격\n위화도 회군은 고려 말기 권력 질서가 조선 건국으로 전환되는 결정적 사건입니다.\n\n### 2. 갈등 요인\n요동 정벌의 무리함과 국제 정세의 변화, 신흥 무인 세력의 현실 판단이 결합되었습니다.\n\n### 3. 현대적 교훈\n무모한 명분보다 현실과 민생을 고려한 판단의 중요성을 보여줍니다.`,
    "한양 천도": `### 1. 사학적 의의와 성격\n한양 천도는 조선이 새 왕조의 중심 공간을 마련한 상징적 사건입니다.\n\n### 2. 갈등 요인\n개경의 구세력에서 벗어나 성리학적 새 질서를 구현하려는 의도가 컸습니다.\n\n### 3. 현대적 교훈\n공간의 변화가 제도와 사고방식의 변화를 이끌 수 있음을 보여줍니다.`,
    "태종의 집권": `### 1. 사학적 의의와 성격\n태종의 집권은 조선 초기 왕권 강화와 중앙집권 체제 정비의 핵심 과정입니다.\n\n### 2. 갈등 요인\n왕자 간 권력 다툼과 사병 혁파, 공신 세력 견제가 복합적으로 작용했습니다.\n\n### 3. 현대적 교훈\n강한 제도 구축의 필요성과 권력 사용의 도덕적 한계를 함께 생각하게 합니다.`,
  };

  const matched = Object.keys(db).find((key) => topicName.includes(key) || key.includes(topicName));
  return matched
    ? db[matched]
    : `### 1. 사학적 의의와 성격\n'${topicName}'은(는) 한국 역사와 설화의 맥락 속에서 중요한 문화적 의미를 지닌 주제입니다.\n\n### 2. 문화적 맥락\n이 주제에는 민간의 상상력, 시대적 불안, 질서와 금기의식이 함께 반영되어 있습니다.\n\n### 3. 현대적 교훈\n전승을 해석하는 일은 오늘날의 삶과 가치관을 돌아보게 하는 중요한 문화적 작업입니다.`;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;


  //----------------------------------------------한국 고전 종합 DB

  //----------------------------------------------

  app.use(express.json({ limit: "25mb" }));

  app.post("/api/gemini/analysis", async (req, res) => {
    const { topic, context, category } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    if (!ai) {
      return res.json({ analysis: getBackupAnalysis(topic) });
    }

    try {
      const prompt = `너는 대학 석학 수준의 한국 전통 사학자이자 옛 문헌을 기록하는 사관이다. 다음 한국사의 중대 사건 또는 전승 테마에 대하여 격조 높은 분류 AI 해설을 제공하라.

대상: ${topic}
관련 분야/맥락: ${category} - ${context}

한국어로 작성하되, 다음 세 부분으로 나누어 마크다운 H3(###) 소제목을 사용하라.

1. 사학적 의의와 성격
2. 인물 또는 전승의 내면과 결정적 갈등 요인
3. 현대에 전하는 영감과 도덕적 화두`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
        },
      });

      const responseText = response.text || getBackupAnalysis(topic);
      return res.json({ analysis: responseText });
    } catch (e) {
      console.error("Gemini request failed, relying on local backup analysis:", e);
      return res.json({ analysis: getBackupAnalysis(topic) });
    }
  });

  app.post("/api/gemini/creature-identify", async (req, res) => {
    try {
      const { imageBase64, mimeType, creatures } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "이미지가 없습니다." });
      }

      if (!Array.isArray(creatures) || creatures.length === 0) {
        return res.status(400).json({ error: "비교할 요괴 목록이 없습니다." });
      }

      const safeCreatures = creatures.slice(0, 80);
      const creatureListText = safeCreatures
        .map((creature: any, index: number) => {
          return `${index + 1}. 이름: ${creature.name}
분류: ${creature.category}
한줄 설명: ${creature.tagline || ""}
설명: ${creature.description || ""}
외형: ${creature.appearance || ""}
습성: ${creature.habits || ""}
기원: ${creature.origin || ""}
약점: ${creature.weakness || ""}
지역: ${creature.region || ""}
키워드: ${(creature.keywords || []).join(", ")}
AI 힌트: ${creature.aiHint || ""}`;
        })
        .join("\n---\n");

      if (!ai) {
        return res.json({
          matchedName: safeCreatures[0]?.name || "판별 불가",
          confidence: 35,
          reason: "현재 서버에 GEMINI_API_KEY가 없어 임시 판별만 수행했습니다. Render Environment에 GEMINI_API_KEY를 넣으면 이미지 기반 판별이 활성화됩니다.",
          visualClues: ["Gemini API 미연결"],
          relatedCreatures: safeCreatures.slice(1, 3).map((creature: any) => creature.name),
        });
      }

      const prompt = `너는 한국 설화와 요괴 도상학을 분석하는 전문가이다.

사용자가 올린 이미지를 보고, 아래 요괴 목록 중 가장 비슷한 존재를 찾아라. 이미지가 실제 요괴가 아니어도 외형 단서와 키워드를 비교해 가장 가까운 후보를 고른다.

[요괴 목록]
${creatureListText}

응답은 반드시 아래 JSON 형식만 사용하라. 마크다운 금지.
{
  "matchedName": "가장 비슷한 요괴 이름",
  "confidence": 0부터 100 사이 숫자,
  "reason": "왜 그렇게 판단했는지 한국어로 2~4문장",
  "visualClues": ["이미지에서 확인한 특징1", "특징2"],
  "relatedCreatures": ["비슷한 후보1", "비슷한 후보2"]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType || "image/png",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        config: {
          temperature: 0.25,
        },
      });

      const text = response.text || "{}";
      const parsed = extractJsonObject(text);

      return res.json({
        matchedName: parsed.matchedName || "판별 불가",
        confidence: Number(parsed.confidence ?? 0),
        reason: parsed.reason || "판별 사유가 반환되지 않았습니다.",
        visualClues: Array.isArray(parsed.visualClues) ? parsed.visualClues : [],
        relatedCreatures: Array.isArray(parsed.relatedCreatures) ? parsed.relatedCreatures : [],
      });
    } catch (error) {
      console.error("Creature image identify failed:", error);
      return res.status(500).json({ error: "요괴 이미지 분석 중 오류가 발생했습니다." });
    }
  });

app.get("/api/itkc-tree", async (req, res) => {
  const itemId = String(req.query.itemId ?? "JT");
  const gubun = String(req.query.gubun ?? "book");
  const depth = String(req.query.depth ?? "");
  const dataGubun = String(req.query.dataGubun ?? "");
  const dataId = String(req.query.dataId ?? "").trim();

  if (!dataId || !depth || !dataGubun) {
    res.status(400).send("dataId, depth, dataGubun 값이 필요합니다.");
    return;
  }

  const params = new URLSearchParams({
    grpId: "",
    itemId,
    gubun,
    depth,
    cate1: "",
    cate2: "",
    dataGubun,
    dataId,
    _: String(Date.now()),
  });

  const apiUrl = `https://db.itkc.or.kr/dir/treeAjax?${params.toString()}`;

  try {
    const apiResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "text/html,*/*",
      },
    });

    const text = await apiResponse.text();

    console.log("ITKC tree request:", apiUrl);
    console.log("ITKC tree status:", apiResponse.status);
    console.log("ITKC tree preview:", text.slice(0, 300));

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(apiResponse.status).send(text);
  } catch (error) {
    console.error("ITKC tree proxy failed:", error);
    res.status(500).send("treeAjax 호출에 실패했습니다.");
  }
});

app.get("/api/itkc-node", async (req, res) => {
  const itemId = String(req.query.itemId ?? "JT");
  const gubun = String(req.query.gubun ?? "book");
  const depth = String(req.query.depth ?? "");
  const dataGubun = String(req.query.dataGubun ?? "");
  const dataId = String(req.query.dataId ?? "").trim();

  if (!dataId || !depth || !dataGubun) {
    res.status(400).send("dataId, depth, dataGubun 값이 필요합니다.");
    return;
  }

  const params = new URLSearchParams({
    grpId: "",
    itemId,
    gubun,
    depth,
    cate1: "",
    cate2: "",
    dataGubun,
    dataId,
  });

  const apiUrl = `https://db.itkc.or.kr/dir/node?${params.toString()}`;

  try {
    const apiResponse = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "text/html,*/*",
      },
    });

    const text = await apiResponse.text();

    console.log("ITKC node request:", apiUrl);
    console.log("ITKC node status:", apiResponse.status);
    console.log("ITKC node preview:", text.slice(0, 300));

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(apiResponse.status).send(text);
  } catch (error) {
    console.error("ITKC node proxy failed:", error);
    res.status(500).send("dir/node 호출에 실패했습니다.");
  }
});



  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
