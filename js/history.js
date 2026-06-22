import { supabase } from "./supabaseClient.js";

let historyEvents = [];
let currentZoom = 1;
let currentEraIndex = 1;

let isDragging = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;

const eraList = [
  {
    name: "삼국 시대",
    year: "057년 ~ 935년",
    situation:
      "고구려, 백제, 신라가 각 지역을 중심으로 성장하며 전쟁과 교류를 반복하던 시기입니다.",
  },
  {
    name: "조선 전기",
    year: "1392년 ~ 1592년",
    situation:
      "한양을 중심으로 조선의 정치 제도와 관료 체계가 정비되고 문화가 발전하던 시기입니다.",
  },
  {
    name: "조선 후기",
    year: "1592년 ~ 1897년",
    situation:
      "임진왜란과 병자호란 이후 사회 변화가 커지고, 실학과 상업이 발달하던 시기입니다.",
  },
  {
    name: "근현대",
    year: "1897년 ~ 1945년",
    situation:
      "대한제국, 일제강점기, 독립운동 등 한반도의 정치적 변화가 크게 일어난 시기입니다.",
  },
];

const fallbackEvents = [
  {
    id: 1,
    title: "세종 즉위",
    year: 1418,
    region: "한양",
    description:
      "조선 제4대 왕 세종이 즉위하여 정치, 과학, 문화 발전의 기반을 마련한 사건입니다.",
    x: 52,
    y: 36,
    scene_key: "sejong",
  },
  {
    id: 2,
    title: "한산도 대첩",
    year: 1592,
    region: "경상남도 통영",
    description:
      "이순신 장군이 학익진 전술로 일본 수군을 크게 물리친 임진왜란의 대표적인 해전입니다.",
    x: 56,
    y: 76,
    scene_key: "hansando",
  },
  {
    id: 3,
    title: "3.1 운동",
    year: 1919,
    region: "서울 탑골공원",
    description:
      "일제강점기 조선 민중이 독립을 요구하며 전개한 전국적 만세 운동입니다.",
    x: 52,
    y: 36,
    scene_key: "samil",
  },
];

const placeLabels = [
  { name: "평양", x: 47, y: 22, description: "고구려와 조선 시대 북방의 중요한 도시입니다." },
  { name: "한양", x: 52, y: 36, description: "조선의 수도로 정치와 문화의 중심지였습니다." },
  { name: "공주", x: 45, y: 52, description: "백제의 도읍이었던 역사 도시입니다." },
  { name: "전주", x: 45, y: 63, description: "조선 왕조와 전통 문화가 깊게 연결된 지역입니다." },
  { name: "경주", x: 62, y: 67, description: "신라의 수도였던 대표적인 역사 도시입니다." },
  { name: "통영", x: 56, y: 76, description: "한산도 대첩과 관련된 남해안의 중요 지역입니다." },
  { name: "제주", x: 45, y: 93, description: "탐라 문화와 독자적인 설화가 전해지는 지역입니다." },
];

export async function initHistoryPage() {
  const map = document.getElementById("history-map");
  const timeline = document.getElementById("history-timeline");

  if (!map) return;

  setupHistoryMapUI(map);
  await loadHistoryEvents();
  renderPlaceLabels();
  renderEventMarkers(historyEvents);
  updateEraInfo();
  applyMapTransform();

  if (timeline) {
    timeline.addEventListener("input", (event) => {
      currentEraIndex = Number(event.target.value);
      updateEraInfo();
      filterEventsByEra();
    });
  }
}

async function loadHistoryEvents() {
  try {
    const { data, error } = await supabase
      .from("history_events")
      .select("*")
      .order("year", { ascending: true });

    if (error) {
      console.error("Supabase 역사 데이터 불러오기 실패:", error);
      historyEvents = fallbackEvents;
      return;
    }

    historyEvents = data && data.length > 0 ? data : fallbackEvents;
    console.log("Supabase 역사 데이터:", historyEvents);
  } catch (error) {
    console.error("Supabase 연결 오류:", error);
    historyEvents = fallbackEvents;
  }
}

function setupHistoryMapUI(map) {
  map.innerHTML = `
    <div class="map-toolbar">
      <button id="zoom-out-btn" type="button">-</button>
      <button id="zoom-reset-btn" type="button">전체 보기</button>
      <button id="zoom-in-btn" type="button">+</button>
    </div>

    <div class="era-floating-card" id="era-floating-card">
      <strong id="era-name">조선 전기</strong>
      <span id="era-year">1392년 ~ 1592년</span>
      <p id="era-situation">시대 상황 설명이 표시됩니다.</p>
    </div>

    <div class="map-viewport" id="map-viewport">
      <div class="map-layer" id="map-layer">
        <img
          class="korea-map-image"
          src="./assets/images/map-korea.png"
          alt="한국 고지도"
        />

        <svg class="history-path-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            id="history-path"
            d="M52 36 C54 48, 56 62, 56 76"
          />
        </svg>

        <div id="place-label-layer" class="place-label-layer"></div>
        <div id="event-marker-layer" class="event-marker-layer"></div>
      </div>
    </div>
  `;

  document.getElementById("zoom-in-btn").addEventListener("click", zoomIn);
  document.getElementById("zoom-out-btn").addEventListener("click", zoomOut);
  document.getElementById("zoom-reset-btn").addEventListener("click", resetZoom);

  const viewport = document.getElementById("map-viewport");

  viewport.addEventListener("wheel", handleWheelZoom, { passive: false });
  viewport.addEventListener("mousedown", startDrag);
  viewport.addEventListener("mousemove", moveDrag);
  viewport.addEventListener("mouseup", endDrag);
  viewport.addEventListener("mouseleave", endDrag);
}

function renderPlaceLabels() {
  const labelLayer = document.getElementById("place-label-layer");
  if (!labelLayer) return;

  labelLayer.innerHTML = "";

  placeLabels.forEach((place) => {
    const label = document.createElement("button");
    label.className = "place-label";
    label.type = "button";
    label.style.left = `${place.x}%`;
    label.style.top = `${place.y}%`;
    label.textContent = place.name;

    label.addEventListener("click", () => {
      showPlaceInfo(place);
    });

    labelLayer.appendChild(label);
  });
}

function renderEventMarkers(events) {
  const markerLayer = document.getElementById("event-marker-layer");
  if (!markerLayer) return;

  markerLayer.innerHTML = "";

  events.forEach((event) => {
    const marker = document.createElement("button");
    marker.className = "history-event-marker";
    marker.type = "button";
    marker.style.left = `${event.x}%`;
    marker.style.top = `${event.y}%`;

    marker.innerHTML = `
      <span class="marker-person">人</span>
      <span class="marker-label">${event.year}년</span>
    `;

    marker.addEventListener("click", () => {
      showHistoryEventInfo(event);
    });

    markerLayer.appendChild(marker);
  });
}

function showHistoryEventInfo(event) {
  const infoBox = document.getElementById("history-info");

  if (!infoBox) return;

  infoBox.innerHTML = `
    <article class="selected-history-card">
      <span class="info-badge">${event.year}년</span>
      <h4>${event.title}</h4>
      <p><strong>지역:</strong> ${event.region}</p>
      <p>${event.description}</p>
      <p><strong>연결 장면:</strong> ${event.scene_key || "기본 장면"}</p>
    </article>
  `;

  drawHistoryScene(event);
}

function showPlaceInfo(place) {
  const infoBox = document.getElementById("history-info");

  if (!infoBox) return;

  infoBox.innerHTML = `
    <article class="selected-history-card">
      <span class="info-badge">지명 정보</span>
      <h4>${place.name}</h4>
      <p>${place.description}</p>
      <p>
        이후 이 지명과 연결된 역사 사건, 설화, 신화, 문화유산 정보를 추가할 수 있습니다.
      </p>
    </article>
  `;
}

function updateEraInfo() {
  const era = eraList[currentEraIndex];

  const eraName = document.getElementById("era-name");
  const eraYear = document.getElementById("era-year");
  const eraSituation = document.getElementById("era-situation");

  if (eraName) eraName.textContent = era.name;
  if (eraYear) eraYear.textContent = era.year;
  if (eraSituation) eraSituation.textContent = era.situation;
}

function filterEventsByEra() {
  let filteredEvents = historyEvents;

  if (currentEraIndex === 0) {
    filteredEvents = historyEvents.filter((event) => event.year < 936);
  }

  if (currentEraIndex === 1) {
    filteredEvents = historyEvents.filter(
      (event) => event.year >= 936 && event.year <= 1592
    );
  }

  if (currentEraIndex === 2) {
    filteredEvents = historyEvents.filter(
      (event) => event.year > 1592 && event.year < 1897
    );
  }

  if (currentEraIndex === 3) {
    filteredEvents = historyEvents.filter((event) => event.year >= 1897);
  }

  if (filteredEvents.length === 0) {
    filteredEvents = historyEvents;
  }

  renderEventMarkers(filteredEvents);
}

function zoomIn() {
  currentZoom += 0.2;

  if (currentZoom > 3) {
    currentZoom = 3;
  }

  applyMapTransform();
}

function zoomOut() {
  currentZoom -= 0.2;

  if (currentZoom < 0.5) {
    currentZoom = 0.5;
  }

  applyMapTransform();
}

function resetZoom() {
  currentZoom = 1;
  translateX = 0;
  translateY = 0;
  applyMapTransform();
}

function handleWheelZoom(event) {
  event.preventDefault();

  if (event.deltaY < 0) {
    zoomIn();
  } else {
    zoomOut();
  }
}

function startDrag(event) {
  isDragging = true;
  startX = event.clientX - translateX;
  startY = event.clientY - translateY;
}

function moveDrag(event) {
  if (!isDragging) return;

  translateX = event.clientX - startX;
  translateY = event.clientY - startY;

  applyMapTransform();
}

function endDrag() {
  isDragging = false;
}

function applyMapTransform() {
  const mapLayer = document.getElementById("map-layer");

  if (!mapLayer) return;

  mapLayer.style.transform = `
    translate(${translateX}px, ${translateY}px)
    scale(${currentZoom})
  `;
}

function drawHistoryScene(event) {
  const canvas = document.getElementById("history-scene-canvas");
  const description = document.getElementById("history-scene-description");

  if (!canvas) return;

  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#1f2a2a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#c69a36";
  ctx.beginPath();
  ctx.arc(90, 90, 35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#f8efd8";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(160, 190);
  ctx.bezierCurveTo(220, 90, 320, 90, 390, 190);
  ctx.stroke();

  ctx.fillStyle = "#f8efd8";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(event.title, 40, 235);

  ctx.fillStyle = "#e9d8b6";
  ctx.font = "16px sans-serif";
  ctx.fillText(`${event.year}년 · ${event.region}`, 40, 260);

  if (description) {
    description.innerHTML = `
      <p>
        <strong>${event.title}</strong>의 상황을 간단한 2D 장면으로 표현했습니다.
        이후 배경 이미지, 인물 이미지, 대화창을 추가하면 더 완성도 있게 확장할 수 있습니다.
      </p>
    `;
  }
}