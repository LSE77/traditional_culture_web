import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Create Gemini client if key is available
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini API client:", err);
  }
} else {
  console.log("GEMINI_API_KEY not found. Server will run with local high-quality historic archives.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route - Get historical AI commentary
  app.post("/api/gemini/analysis", async (req, res) => {
    const { topic, context, category } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    // Default high-quality local analysis backup
    const getBackupAnalysis = (topicName: string) => {
      const db: Record<string, string> = {
        "위화도 회군": `### 1. 사학적 의의와 성격 (정밀 분석)
위화도 회군은 고려 말기인 1388년, 요동 정벌차 떠났던 우군도통사 이성계가 위화도에서 군사를 돌려 정변을 일으킨 역사적 대사건이옵니다. 이는 단순히 일개 장군의 군사 반란을 넘어, 쇠망해가던 고려 왕조의 명운을 다하게 하고 신진사대부와 신흥 무인 세력이 결탁하여 조선 건국이라는 새로운 시대를 개창하는 결정적 계기가 되었사옵니다. 동북아시아의 국제 정세가 원명 교체기에 접어든 시점에서 실리적 사대외교와 친명노선의 정당성을 확보하려는 현실 정치적 판단이 깔려 있는 중대한 획기적 사건이옵니다.

### 2. 정치적 역학 관계와 결정적 요인
그 당시 철령위 설치 문제로 야기된 명나라와의 갈등 속에서, 조민수와 이성계는 요동 정벌의 무모함을 제기하였사옵니다. 이른바 '사대불가론(四大不可論)' 즉, 작은 나라가 큰 나라를 거스르는 일의 부당함, 여름철 군사 동원의 폐해, 왜구의 빈틈 침입 우려, 장마철 전염병과 활의 접착제 풀림 등은 단순한 핑계를 넘어 대단히 현실적인 제약 조건이었사옵니다. 이성계는 압록강의 불어난 물 앞에서 군사들의 안위를 고민하는 한편, 자신과 가문의 생존, 그리고 변혁을 바라는 사대부들의 뜻을 모아 권력의 심장부를 향해 말머리를 돌렸사옵니다.

### 3. 현대에 전하는 교훈과 도덕적 화두
위화도 회군은 우리에게 '명분 없는 대립과 무모한 모험론'을 버리고 '현실적인 국익과 민본(民本)'을 최우선으로 삼는 실리적 사유가 얼마나 중요한지 시사해 주옵니다. 불가능에 가까운 명령에 맹목적으로 복종하는 대신, 시대의 격변을 정확히 읽어내고 백성의 고통을 줄이는 결단이야말로 국가의 격을 바꿀 수 있음을 보여주는 대목이라 하겠사옵니다. 일개 지도자의 신념과 대의의 무게가 역사의 거대한 물줄기를 바꾸는 도덕적 책임감을 우리에게 묻고 있사옵니다.`,
        "한양 천도": `### 1. 사학적 의의와 성격 (정밀 분석)
1394년 단행된 조선의 한양 천도는 신왕조의 기틀을 확립하고, 고려의 구세력 기득권이 결집된 개성(개경)을 탈피하여 새로운 국정 이념을 시각적으로 구현하려는 거대한 개혁 작업이었사옵니다. 풍수지리설적 길지와 지리적 사통팔달의 교통 이점(한강의 수운 체계)을 동시에 갖춘 도읍의 정비는 집권 중앙집권화를 단숨에 가속화하였사옵니다.

### 2. 세력 간의 갈등과 도읍 선정
태조 이성계는 당초 계룡산, 무악(현 신촌 일대) 등 여러 후보지를 검토하며 정도전, 하륜 등의 신하들과 결렬한 신념의 투쟁을 벌였사옵니다. 하륜의 풍수설과 정도전의 성리학적 치국론이 팽팽히 맞섰으나, 마침내 북한산을 등지고 한강을 품어 안은 온화하고도 웅장한 한양 땅이 최종 낙점되었사옵니다. 이는 고려의 불교적 색채를 완전히 씻어내고 주자학적 도덕 국가 성곽을 짓는 건국의 상징이옵니다.

### 3. 현대에 전하는 교훈과 도덕적 화두
새로운 판을 짜기 위해 기득권 세력의 저항이 가득한 구 공간을 허물고 최적의 혁신 공간을 선정하는 작업은 현대 도시 계획이나 기업 경영진의 비전 혁신에도 시사하는 바가 대단히 크옵니다. 명분과 실리, 자연과의 조화(Inharmony with Nature)를 추구했던 한양 조영의 설계는 오늘날에도 환경과 사람이 상생하는 지속 가능한 미래 가치관을 대변해 주고 있사옵니다.`,
        "태종의 집권": `### 1. 사학적 의의와 성격 (정밀 분석)
제1·2차 왕자의 난을 거쳐 보위에 오른 정안대군 이방원(태종)의 집권은 조선 초기 개국 초 혼란을 극복하고, 사병의 혁파와 양전 사업, 호패법 제정 등을 통해 강력한 중앙집권 성리학적 국가 체계를 완성한 일대 성취이옵니다. 정도전이 구상했던 신권 중심의 의정부 서사제에 대항하여 강력한 국왕 중심의 '6조 직계제'를 확립하였사옵니다.

### 2. 권력의 비정한 속성과 결단의 배경
이방원은 개국 공신이자 스승이었던 정도전, 그리고 온화한 이복동생들을 척살하며 보위에 이르는 냉혈한의 면모를 보여주었사옵니다. 그러나 그의 칼날은 국가 권력의 안정을 해칠 수 있는 외척 세력(민씨 가문)과 공신들을 숙청하는 국가적 결단으로 수렴되었사옵니다. 스스로 악역이 되어 피를 묻힘으로써, 훗날 그의 아들 세종대왕이 평화롭고 찬란한 문화 통치를 이룩할 수 있는 주춧돌을 평평하게 다진 비장한 군주로 해석되옵니다.

### 3. 현대에 전하는 교훈과 도덕적 화두
권력의 정당성과 과정의 정당성이 도덕적으로 흠결을 지닐지라도, 집권 이후 이루어낸 공공의 번영과 국가 제도의 근대화가 역사의 법정에서 어떻게 평가받아야 하는가에 대한 불멸의 난제를 제시하옵니다. 오늘날 시스템 구축(System Architecture) 단계에서 철저한 기강 확립과 희생의 고독함이 리더십의 또 다른 어두운 가치임을 교훈하옵니다.`
      };
      
      const matched = Object.keys(db).find(key => topicName.includes(key) || key.includes(topicName));
      return matched ? db[matched] : `### 1. 사학적 의의와 성격 (정밀 분석)
본 사건(또는 인물)인 '${topicName}'은(는) 한국 역사와 설화의 도도한 맥락 속에서 동양적 가치와 우리 민족의 세계관을 대변하는 귀중한 문화 유산이옵니다. 당시 사료적 성격과 분류가 지닌 깊이는 한겨레 가치 전승의 주요한 이정표로 자리잡아 왔사옵니다.

### 2. 문화적/정치적 맥락과 내면 분석
관련 문헌과 전승에 따르면, 이 주제 속에는 지배층의 사상적 동향 내지는 민민들의 염원과 신비로운 상상력이 교차되어 나타나옵니다. 갈등의 양상이 세대 간, 질서와 파격 간의 타협으로 해소되는 지혜로운 구도가 가득 차 있사옵니다.

### 3. 현대에 전하는 명쾌한 교훈
우리는 과거가 남긴 문화적 정신 세계를 분석함으로써 오늘날의 도덕적 해이와 단절된 관계망을 정화하는 귀중한 사상적 사양을 발견할 수 있사옵니다.`;
    };

    if (!ai) {
      // Return beautiful local summary immediately
      return res.json({ analysis: getBackupAnalysis(topic) });
    }

    try {
      const prompt = `너는 대학 석학 수준의 한국 전통 사학자이자 옛 문헌을 기록하는 사관(Historiographer)이다. 다음 한국사의 중대 사건 또는 인물(또는 전승 테마)에 대하여 격조 높은 '분류 AI 해설'을 제공하라.
      
대상: ${topic}
관련 분야/맥락: ${category} - ${context}

답변은 마치 먹 향이 은은히 감도는 한지 두루마리에 서법으로 조심스레 쓰여진 격조 높고 우아한 문장과 사학적 깊이를 담아 한국어(~하옵니다, ~평가되옵니다, ~이오니 등 궁중체 혹은 장중한 영사학적 학술체)로 작성해주어야 하느니라. 
다음 세 부분으로 분류하여 마크다운(Markdown) 예쁜 격식으로 상세하게 답변을 서술해주거라 (각 부분의 대행이나 가독성은 매우 깔끔해야 하느니라):

1. 사학적 의의와 성격 (정밀 분석)
2. 인물의 내면과 결정적 갈등 요인 (정치적/심리적 입지 대조)
3. 현대에 전하는 영감과 도덕적 화두

반드시 마크다운 포맷팅과 소제목(H3: ###)을 사용해 정중하며 심금을 울리도록 정성스레 서술하라.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
        }
      });

      const responseText = response.text || getBackupAnalysis(topic);
      res.json({ analysis: responseText });
    } catch (e: any) {
      console.error("Gemini request failed, relying on local high-quality analysis database:", e);
      res.json({ analysis: getBackupAnalysis(topic) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
