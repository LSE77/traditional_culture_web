import React, { useState, useEffect, useRef } from "react";
import { HistoricalBook, HistoricalEvent } from "../types";
import { HISTORICAL_BOOKS } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  ArrowLeft, 
  LayoutGrid, 
  BookOpen, 
  MapPin, 
  Sparkles,
  HelpCircle,
  TrendingUp,
  Volume2
} from "lucide-react";

interface HistoryTabProps {
  selectedBookId: string;
  onSelectBook: (bookId: string) => void;
  onMapPlayerToggle?: (isActive: boolean) => void;
}

export default function HistoryTab({ selectedBookId, onSelectBook, onMapPlayerToggle }: HistoryTabProps) {
  // Local state to manage toggled book selection for transit page
  const [activeBookId, setActiveBookId] = useState<string>("");

  // Toggle between transit select directory page and interactive map screen
  const [showMapPlayer, setShowMapPlayer] = useState<boolean>(false);

  // Sync map player status to parent App layout
  useEffect(() => {
    if (onMapPlayerToggle) {
      onMapPlayerToggle(showMapPlayer);
    }
  }, [showMapPlayer, onMapPlayerToggle]);

  // Active event index matching the current timeline node
  const [activeIndex, setActiveIndex] = useState(0);

  // Map popup control - starts false so when entering map it does not show automatically
  const [showPopup, setShowPopup] = useState(false);

  // Playback control
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(2500); // ms per step
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic AI commentary states
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiCache, setAiCache] = useState<Record<string, string>>({});

  // Map Pan and Zoom states
  const [scale, setScale] = useState<number>(1.0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Get active book and events
  const currentBook = HISTORICAL_BOOKS.find(b => b.id === activeBookId) || HISTORICAL_BOOKS[0];
  const events = currentBook ? currentBook.events : [];
  const currentEvent = events[activeIndex] || events[0];

  // Update popup & reset states when event changes
  useEffect(() => {
    setAiAnalysis("");
    setAiError("");
  }, [activeIndex, activeBookId]);

  // Handle timeline playback
  useEffect(() => {
    if (isPlaying && events.length > 0) {
      timerRef.current = setInterval(() => {
        setActiveIndex((prev) => {
          if (prev >= events.length - 1) {
            return 0; // Loop back
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, events.length]);

  // Request Gemini AI Commentary
  const fetchAICommentary = async () => {
    if (!currentEvent) return;
    const cacheKey = `${activeBookId}-${currentEvent.id}`;
    if (aiCache[cacheKey]) {
      setAiAnalysis(aiCache[cacheKey]);
      return;
    }

    setIsLoadingAI(true);
    setAiError("");
    try {
      const response = await fetch("/api/gemini/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: currentEvent.title,
          context: `${currentEvent.locationName}에 소재. ${currentEvent.description}`,
          category: currentEvent.category
        })
      });

      const data = await response.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
        setAiCache(prev => ({ ...prev, [cacheKey]: data.analysis }));
      } else if (data.error) {
        setAiError(data.error);
      } else {
        setAiError("해설을 불러오는 도중 오류가 발생했습니다.");
      }
    } catch (e) {
      console.error(e);
      setAiError("해설 서버와 통신할 수 없어 임시 사관 논평으로 갈음합니다.");
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Timeline controls
  const handleStepPrev = () => {
    setIsPlaying(false);
    if (events.length === 0) return;
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : events.length - 1));
  };

  const handleStepNext = () => {
    setIsPlaying(false);
    if (events.length === 0) return;
    setActiveIndex((prev) => (prev < events.length - 1 ? prev + 1 : 0));
  };

  // Drag Handlers for Map
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left-click drags
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("input")) {
      return; // prevent dragging when clicking buttons/interactive UI
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const zoomIntensity = 0.08;
    const delta = e.deltaY < 0 ? 1 : -1;
    const newScale = Math.min(Math.max(scale + delta * zoomIntensity, 0.4), 3.0);
    setScale(newScale);
  };

  // Formatting helper for custom display headings
  const renderFormattedMarkdown = (markdown: string) => {
    if (!markdown) return null;
    return markdown.split("\n\n").map((part, index) => {
      if (part.startsWith("###")) {
        return (
          <h4 key={index} className="text-[11px] sm:text-xs font-serif font-black text-[#D4AF37] border-b border-[#D4AF37]/15 pb-1 mt-3 mb-1.5 uppercase tracking-wider">
            {part.replace("###", "").trim()}
          </h4>
        );
      }
      return (
        <p key={index} className="text-[11px] text-zinc-300 font-serif leading-relaxed text-justify mb-2">
          {part.trim()}
        </p>
      );
    });
  };

  return (
    <div className="w-full min-h-[calc(100vh-80px)] relative text-[#F5F2ED] bg-[#1E0402] overflow-x-hidden" id="history-tab-outer-frame">
      <AnimatePresence mode="wait">
        
        // ==========================================
        // VIEW A: Centered Book Card selection Page
        // ==========================================
        {!showMapPlayer ? (
          <motion.div
            key="selection-gateway-palace"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
            className="max-w-7xl mx-auto px-4 py-8 sm:py-10 space-y-6"
            id="history-selection-transit-page"
          >
            <div className="relative w-full">
              <AnimatePresence mode="wait">
                {activeBookId === "" ? (
                  /* Initial State: About 30 book cards beautifully arranged and centered */
                  <motion.div
                    key="full-library-deck"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="space-y-6"
                  >
                    {/* Elegant Gyeongbokgung/Kyujanggak header styling - Only visible in card list overview */}
                    <div className="text-center space-y-2 border-b border-[#D4AF37]/20 pb-6 max-w-3xl mx-auto relative">
                      <div className="flex justify-center mb-1 text-[#D4AF37]">
                        <Sparkles className="w-5 h-5 animate-pulse" />
                      </div>
                      <span className="text-[9px] tracking-[0.3em] text-[#D4AF37] font-bold font-serif block uppercase">
                        [ 奎 章 閣 秘 藏 大 典 SILLOK ]
                      </span>
                      <h2 className="text-xl sm:text-3xl font-serif font-black text-white tracking-tight">
                        사서 목록 및 주요 사건 선택
                      </h2>
                      <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent mx-auto my-2" />
                      <p className="text-xs text-[#DEC8B2] font-serif leading-relaxed">
                        조선왕실과 중앙관청 영수들이 필사한 수식 사첩서 책들을 한데 모았습니다.<br />
                        서책을 클릭하면 오른쪽에서 수록된 대명 역사사건 연대표가 웅장하게 밀려 나옵니다.
                      </p>
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] text-[#D4AF37] font-serif font-black flex items-center gap-1.5 uppercase">
                        <BookOpen className="w-3.5 h-3.5" /> 대전 보전 서책 명록 (총 {HISTORICAL_BOOKS.length}권 수록됨)
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-0.5 max-h-[5800px] overflow-y-auto">
                      {HISTORICAL_BOOKS.map((book) => (
                        <motion.div
                          key={book.id}
                          whileHover={{ y: -3, scale: 1.01 }}
                          transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          onClick={() => {
                            setActiveBookId(book.id);
                            onSelectBook(book.id);
                            setActiveIndex(0);
                          }}
                          className="relative p-5 bg-[#310D0A] hover:bg-[#4E1712] border border-[#D4AF37]/25 hover:border-[#D4AF37]/80 rounded-none shadow-md cursor-pointer flex flex-col justify-between group overflow-hidden h-[178px] transition-all duration-300"
                        >
                          {/* Imperial Golden corner accents */}
                          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#D4AF37]/35 group-hover:border-[#D4AF37]" />
                          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-[#D4AF37]/35 group-hover:border-[#D4AF37]" />
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-mono font-bold text-[#D4AF37] px-1.5 py-0.5 bg-[#1B0503] border border-[#D4AF37]/15">
                                {book.dynasty}
                              </span>
                              <BookOpen className="w-3.5 h-3.5 text-[#D4AF37]/35 group-hover:text-[#D4AF37] transition-colors" />
                            </div>
                            <h4 className="text-xs sm:text-sm font-serif font-black text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1">
                              {book.title.split(" (")[0]}
                            </h4>
                            <p className="text-[10.5px] text-[#DEC5AC] line-clamp-3 leading-relaxed font-serif text-justify">
                              {book.description}
                            </p>
                          </div>
                          
                          <div className="text-right text-[9.5px] text-[#D4AF37] font-serif pt-1 flex items-center justify-end gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>연대표 열람</span>
                            <span>→</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  /* SPLIT VIEW (Sliding layout): when a book card is clicked, layout splits: left column keeps the books list, right column slides in the events */
                  <motion.div
                    key="split-event-reveal"
                    initial={{ opacity: 0, x: 80 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
                  >
                    {/* Left Column: Traditional Book Directory List (Compact side-rail) - Hidden on Mobile */}
                    <div className="hidden lg:flex lg:col-span-4 bg-[#1F0705] border border-[#D4AF37]/25 p-4 flex-col justify-between h-[580px] rounded-none">
                      <div className="space-y-3 flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-2.5">
                          <span className="text-xs font-serif font-black text-[#D4AF37] flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-[#D4AF37]" /> 보전 아카이브 서첩
                          </span>
                          <button
                            onClick={() => {
                              setActiveBookId("");
                            }}
                            className="px-2.5 py-1 bg-[#4E1712] hover:bg-[#8B2518] text-[#D4AF37] hover:text-white text-[10px] font-serif border border-[#D4AF37]/40 cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <LayoutGrid className="w-3 h-3" /> [서서도첩]
                          </button>
                        </div>
                        
                        {/* Scrollable list of compact books for switching */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar scrollbar-thin scrollbar-thumb-[#8B2518]">
                          {HISTORICAL_BOOKS.map((book) => {
                            const isSelected = activeBookId === book.id;
                            return (
                              <div
                                key={book.id}
                                onClick={() => {
                                  setActiveBookId(book.id);
                                  onSelectBook(book.id);
                                  setActiveIndex(0);
                                }}
                                className={`p-2.5 border transition-all cursor-pointer rounded-none flex items-center justify-between ${
                                  isSelected
                                    ? "bg-[#4E1712] border-[#D4AF37] text-white"
                                    : "bg-[#140403] border-[#D4AF37]/10 text-stone-300 hover:border-[#D4AF37]/45 hover:bg-[#2C0E0B]"
                                }`}
                              >
                                <span className="text-[11.5px] font-serif font-bold truncate pr-3">
                                  {book.title.split(" (")[0]}
                                </span>
                                <span className="text-[8.5px] font-mono text-[#D4AF37] flex-shrink-0">
                                  [{book.dynasty}]
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right Column (Slid In): Major Events List dynamically paired with the clicked book */}
                    <div className="lg:col-span-8 w-full bg-[#310D0A] border border-[#D4AF37]/25 p-5 flex flex-col justify-between h-[580px] rounded-none shadow-md">
                      <div className="space-y-4 flex-1 flex flex-col min-h-0">
                        
                        <div className="flex justify-between items-start gap-4 border-b border-[#D4AF37]/20 pb-3">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setActiveBookId("");
                              }}
                              className="lg:hidden p-1 bg-[#4E1712] hover:bg-[#8B2518] text-[#D4AF37] hover:text-white border border-[#D4AF37]/35 rounded-none cursor-pointer flex items-center justify-center w-8 h-8 flex-shrink-0"
                              title="사서도첩 탭으로 가기"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div>
                              <span className="text-[9px] text-[#D4AF37] font-black tracking-wider uppercase block">
                                COURT CHRONICLES EVENT TIMELINE
                              </span>
                              <h3 className="text-base sm:text-lg font-serif font-black text-white mt-0.5">
                                [{currentBook?.title.split(" (")[0]}] 수록 사건 전집 일록
                              </h3>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-[#D4AF37] bg-[#140403] px-2 py-1 border border-[#D4AF37]/20 flex-shrink-0">
                            총 {events.length}건 기재식
                          </span>
                        </div>

                        {/* Detailed Description */}
                        <p className="text-[11.5px] text-[#DEC5AC] leading-relaxed font-serif text-justify border-b border-[#D4AF37]/10 pb-3">
                          <strong>서책 고찰:</strong> {currentBook?.description}
                        </p>

                        {/* Grid of events inside this book */}
                        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 custom-scrollbar">
                          {events.map((evt, idx) => (
                            <div
                              key={evt.id}
                              onClick={() => {
                                setActiveIndex(idx);
                                setShowMapPlayer(true);
                              }}
                              className="bg-[#1C0604] hover:bg-[#451410] p-4 border border-[#D4AF37]/15 hover:border-[#D4AF37] transition-all cursor-pointer group flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                            >
                              <div className="space-y-1.5 flex-1 pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-[#D4AF37] font-serif font-black bg-[#310D0A] px-2 py-0.5 border border-[#D4AF37]/15">
                                    {evt.dateStr}
                                  </span>
                                  <span className="text-[9px] px-1 bg-amber-950 text-[#D4AF37] border border-[#D4AF37]/20 font-bold">
                                    {evt.category}
                                  </span>
                                </div>
                                <h4 className="text-xs sm:text-sm font-serif font-black text-white group-hover:text-[#D4AF37] transition-colors">
                                  {idx + 1}. {evt.title}
                                </h4>
                                <p className="text-[11px] text-[#CBD5E1] line-clamp-1 leading-relaxed">
                                  {evt.description}
                                </p>
                              </div>
                              <button className="flex-shrink-0 bg-[#310D0A] text-[#D4AF37] group-hover:bg-[#8B2518] group-hover:text-white px-3 py-1.5 border border-[#D4AF37]/30 group-hover:border-[#D4AF37] cursor-pointer text-[10px] font-serif transition-all">
                                고지도 경로 분석 →
                              </button>
                            </div>
                          ))}
                        </div>

                      </div>
                    </div>

                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          // ==========================================
          // VIEW B: Full Map Player Screen (Traditional)
          // ==========================================
          <motion.div
            key="interactive-map-player-traditional"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full relative min-h-[calc(100vh-80px)] bg-[#1C0604]"
            id="history-overlay-canvas-container"
          >
            {/* ========================================================================= */}
            {/* (1) DESKTOP ONLY VIEW: Immersive maps + Floating traditional sidebars & panel */}
            {/* ========================================================================= */}
            <div className="hidden lg:block w-full h-[calc(100vh-80px)] relative overflow-hidden" id="desktop-view-mainframe">
              {/* Antique Korea Map Canvas Backdrop */}
              <div 
                className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing overflow-hidden bg-[#E8E3D9]"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onWheel={handleWheel}
              >
                <div
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    transformOrigin: "center center",
                    transition: isDragging ? "none" : "transform 0.15s ease-out"
                  }}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  <img 
                    src="/src/assets/images/antique_korea_map_1782138795299.jpg" 
                    alt="조선 고지도 바탕" 
                    className="w-full h-full object-cover opacity-85 filter sepia contrast-125 select-none"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                  
                  {/* Paths connecting nodes */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    {events.map((evt, idx) => {
                      if (idx === 0) return null;
                      const prev = events[idx - 1];
                      return (
                        <g key={`desk-path-${idx}`}>
                          <line
                            x1={`${prev.mapX}%`}
                            y1={`${prev.mapY}%`}
                            x2={`${evt.mapX}%`}
                            y2={`${evt.mapY}%`}
                            stroke="#4A1510"
                            strokeWidth="2.5"
                            strokeDasharray="4,4"
                            className="opacity-40"
                          />
                          <line
                            x1={`${prev.mapX}%`}
                            y1={`${prev.mapY}%`}
                            x2={`${evt.mapX}%`}
                            y2={`${evt.mapY}%`}
                            stroke="#D4AF37"
                            strokeWidth="1.2"
                            className="opacity-70"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Desktop Pins plotted on map backdrop */}
                  <div className="absolute inset-0 z-20 pointer-events-none">
                    {events.map((evt, idx) => {
                      const isActive = idx === activeIndex;
                      return (
                        <div
                          key={`desk-pin-grp-${evt.id}`}
                          style={{ left: `${evt.mapX}%`, top: `${evt.mapY}%` }}
                          className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2"
                        >
                          <button
                            onClick={() => {
                              setIsPlaying(false);
                              setActiveIndex(idx);
                              setShowPopup(true);
                            }}
                            className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border cursor-pointer shadow-md ${
                              isActive
                                ? "bg-[#D4AF37] border-white text-[#1B0604] scale-125 z-40"
                                : "bg-[#8B4513] border-[#D4AF37]/45 text-[#F5F2ED] hover:bg-[#A93226] scale-100 z-30"
                            }`}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                          
                          <span className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1.5 text-[9.5px] font-serif font-black px-1.5 py-0.5 whitespace-nowrap border z-30 transition-colors ${
                            isActive
                              ? "bg-[#8B2518] border-[#D4AF37] text-white"
                              : "bg-[#FDFBF7]/90 border-[#8B4513]/20 text-[#1A1A1A]"
                          }`}>
                            {evt.title.split(" (")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Upper Left Floating Controller: Back to archives */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  setShowMapPlayer(false);
                }}
                className="absolute top-6 left-6 z-40 bg-[#FAF6EE] hover:bg-[#F6F1E5] border-2 border-[#5C4033] px-3.5 py-2 text-xs font-serif font-black text-[#8B0000] hover:text-[#A31D1D] rounded-none shadow-md flex items-center gap-1.5 transition-all cursor-pointer shadow-amber-950/15"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>[서고합서 회귀]</span>
              </button>

              {/* Floating Dialog Pop-up balloon on Map */}
              <AnimatePresence>
                {showPopup && currentEvent && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-20 left-6 z-40 max-w-[320px] p-4 bg-[#FAF6EE] border-2 border-[#5C4033] text-[#2C251F] rounded-none shadow-md space-y-2 pointer-events-auto shadow-amber-950/20"
                  >
                    <div className="flex items-center justify-between border-b border-[#5C4033]/20 pb-1.5">
                      <span className="text-[9px] font-black font-serif text-[#8B0000] tracking-widest uppercase flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-[#8B0000]" /> 사건 초안서록 (事件書錄)
                      </span>
                      <button 
                        onClick={() => setShowPopup(false)}
                        className="text-stone-700 hover:text-[#8B0000] font-sans font-bold px-1.5 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-serif font-black text-[#2C251F]">
                        {currentEvent.title}
                      </h4>
                      <p className="text-[10px] text-[#8B0000] font-serif font-bold mt-1">
                        지역관문: {currentEvent.locationName} ({currentEvent.dateStr})
                      </p>
                    </div>
                    <p className="text-[#3E352C] text-xs font-serif text-justify leading-relaxed pt-2 border-t border-[#5C4033]/15">
                      {currentEvent.description}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Right Sidebar: Hanji textured traditional details panel */}
              {currentEvent && (
                <div 
                  className="absolute top-6 bottom-6 right-6 w-[360px] md:w-[380px] bg-[#FAF6EE] border-2 border-[#5C4033] z-40 p-5 flex flex-col justify-between overflow-y-auto pointer-events-auto shadow-2xl rounded-none shadow-amber-950/25"
                  id="desktop-history-sidebar"
                >
                  <div className="space-y-4">
                    {/* Event metadata */}
                    <div className="border-b border-[#5C4033]/20 pb-3">
                      <span className="text-[9.5px] font-black text-[#8B0000] tracking-widest uppercase block mb-1">
                        기록 연대관 · 서기 {currentEvent.year}년
                      </span>
                      <h3 className="text-base font-serif font-black text-[#2C251F] leading-tight">
                        {currentEvent.title}
                      </h3>
                      <p className="text-xs font-serif text-[#8B0000] font-bold mt-1.5">
                        {currentEvent.locationName} · {currentEvent.dateStr}
                      </p>
                    </div>

                    {/* Bullet summary of facts */}
                    <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                      <span className="text-[10px] font-black text-[#8B0000] tracking-widest font-serif block uppercase">
                        사건 상세 정본 (詳細正本)
                      </span>
                      <ul className="space-y-1.5 text-xs text-[#3E352C] font-serif list-disc pl-4 leading-relaxed text-justify">
                        {currentEvent.details.map((dt, i) => (
                          <li key={i} className="marker:text-[#8B0000]">
                            {dt}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Next Event / Date Transition trigger */}
                    {activeIndex < events.length - 1 && (
                      <div className="border-t border-[#5C4033]/20 pt-3" id="desktop-next-event-transition-block">
                        <span className="text-[10px] font-black text-[#8B0000] tracking-widest font-serif block uppercase">
                          사건 탐독 검토 완료 (檢討畢)
                        </span>
                        <button
                          onClick={() => {
                            setIsPlaying(false);
                            setActiveIndex(activeIndex + 1);
                            setShowPopup(true);
                          }}
                          className="w-full mt-1.5 flex items-center justify-between px-3 py-2 bg-[#F6F1E5] hover:bg-[#EBDCBE] border border-[#5C4033]/30 text-[#8B0000] font-serif font-black text-xs transition-all cursor-pointer shadow-xs"
                        >
                          <span className="flex items-center gap-1">☞ 다음 연월일 [{events[activeIndex + 1].dateStr}] 이동</span>
                          <span className="text-[10px] font-bold text-stone-700 truncate max-w-[120px]" title={events[activeIndex + 1].title}>
                            {events[activeIndex + 1].title.split(" (")[0]}
                          </span>
                        </button>
                      </div>
                    )}

                    {/* AI scholarly critiques */}
                    <div className="border-t border-[#5C4033]/20 pt-3 space-y-2">
                      <span className="text-[10px] font-black text-[#8B0000] tracking-widest font-serif uppercase flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-[#8B0000]" /> 대제학 실시간 학술비평 (大提學 批評)
                      </span>
                      <div className="relative overflow-y-auto rounded-none border border-[#5C4033]/20 bg-[#F6F1E5] p-3 text-[#2C251F] text-xs leading-relaxed text-justify h-[160px]">
                        {aiAnalysis ? (
                          <div className="space-y-1 font-serif text-[11px]">
                            {renderFormattedMarkdown(aiAnalysis)}
                          </div>
                        ) : isLoadingAI ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F6F1E5]/90 p-2 text-center gap-1">
                            <p className="text-[10px] text-[#8B0000] font-serif animate-pulse font-black">
                              고문서 서법을 수령하여 학설을 판석중입니다...
                            </p>
                          </div>
                        ) : aiError ? (
                          <div className="flex flex-col items-center justify-center text-center p-2 h-full gap-1 text-red-800">
                            <p className="text-[10px] leading-relaxed font-serif font-medium">{aiError}</p>
                            <button
                              onClick={fetchAICommentary}
                              className="text-[9px] bg-[#FAF6EE] text-[#8B0000] border border-[#5C4033]/35 px-2 py-0.5 rounded-none cursor-pointer"
                            >
                              자문 재청
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full text-stone-500 font-serif text-[10px]">
                            대제학 학술 해설을 받으려면 동판 버튼을 누르십시오.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={fetchAICommentary}
                    disabled={isLoadingAI}
                    className="w-full mt-4 py-2 bg-[#8B0000] hover:bg-[#A31D1D] text-white font-serif font-black text-xs rounded-none border border-[#5C4033] shadow-md cursor-pointer flex items-center justify-center gap-1 transition-all"
                  >
                    {isLoadingAI ? "대각 자문 대조 중..." : "[대제학 AI 주론 자문요청]"}
                  </button>
                </div>
              )}

              {/* Floating Bottom Timeline: Timeframe slider and nodes */}
              <div 
                className="absolute bottom-6 left-6 right-[406px] bg-[#FAF6EE] border-2 border-[#5C4033] shadow-xl z-40 p-4 flex flex-row items-center gap-5 pointer-events-auto rounded-none shadow-amber-950/20"
                id="desktop-timeline-controls"
              >
                {/* Playback Key controls */}
                <div className="flex items-center gap-2 select-none flex-shrink-0">
                  <button
                    onClick={handleStepPrev}
                    className="p-1 px-1.5 text-xs text-[#5C4033] hover:text-[#8B0000] bg-[#FAF6EE] hover:bg-[#F6F1E5] border border-[#5C4033]/40 rounded-none transition-all cursor-pointer flex items-center justify-center"
                    title="이전 사건 노선"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="p-1.5 px-3 text-xs font-serif font-bold text-white bg-[#8B0000] hover:bg-[#A31D1D] rounded-none border border-[#5C4033] cursor-pointer flex items-center gap-1 shadow-sm transition-all"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 text-white" />
                        <span className="text-[10px]">일시정지</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-white hover:scale-105" />
                        <span className="text-[10px]">자동재생</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleStepNext}
                    className="p-1 px-1.5 text-xs text-[#5C4033] hover:text-[#8B0000] bg-[#FAF6EE] hover:bg-[#F6F1E5] border border-[#5C4033]/40 rounded-none transition-all cursor-pointer flex items-center justify-center"
                    title="다음 사건 노선"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Progress Slider Bar */}
                <div className="flex-1 mx-1 flex flex-col gap-1.5 self-center">
                  <div className="flex justify-between items-center text-[10px] text-[#5C4033] font-serif font-bold px-1 select-none">
                    <span>지방 대의기원: 시조년도</span>
                    <span className="font-serif text-[#8B0000] font-black">지맥전령 추적경로: {activeIndex + 1} / {events.length}</span>
                    <span>개항기 치세성국</span>
                  </div>
                  
                  <div className="relative h-2 w-full bg-[#F6F1E5] border border-[#5C4033]/25 rounded-none flex items-center">
                    <div 
                      style={{ width: `${(activeIndex / Math.max(1, events.length - 1)) * 100}%` }}
                      className="absolute inset-y-0 left-0 bg-[#8B0000] h-full pointer-events-none z-10" 
                    />
                    {events.map((_, idx) => (
                      <div
                        key={`desktop-step-${idx}`}
                        style={{ left: `${(idx / Math.max(1, events.length - 1)) * 100}%` }}
                        className={`absolute w-3.5 h-3.5 cursor-pointer transform -translate-x-1/2 rounded-full border transition-all z-20 ${
                          idx <= activeIndex 
                            ? "bg-[#8B0000] border-white scale-110" 
                            : "bg-[#FAF6EE] border-[#5C4033]/45 hover:border-[#8B0000]"
                        }`}
                        onClick={() => {
                          setIsPlaying(false);
                          setActiveIndex(idx);
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Speed control */}
                <div className="flex items-center bg-[#F6F1E5] border border-[#5C4033]/25 rounded-none p-1 gap-1 shadow-inner justify-center flex-shrink-0">
                  {[
                    { label: "×0.5", val: 4000 },
                    { label: "×1.0", val: 2500 },
                    { label: "×2.0", val: 1200 }
                  ].map((sp) => (
                    <button
                      key={`desktop-speed-${sp.val}`}
                      onClick={() => setPlaybackSpeed(sp.val)}
                      className={`px-2 py-0.5 text-[9px] font-serif font-bold rounded-none transition-all cursor-pointer ${
                        playbackSpeed === sp.val
                          ? "bg-[#8B0000] text-[#FAF6EE] font-black"
                          : "text-[#5C4033] hover:text-[#8B0000]"
                      }`}
                    >
                      {sp.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* ========================================================================= */}
            {/* (2) MOBILE ONLY VIEW: Vertical sequence (Map -> Playback (Opacity-0) -> explanation) */}
            {/* ========================================================================= */}
            <div className="lg:hidden w-full flex flex-col bg-[#1C0604] min-h-[calc(100vh-80px)] overflow-y-auto pb-10" id="mobile-view-mainframe">
              
              {/* [STEP 1] Antique Korea Map (Top of the page) */}
              <div 
                className="w-full h-[360px] relative bg-[#E8E3D9] border-b-2 border-[#5C4033] overflow-hidden"
              >
                <div 
                  className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing overflow-hidden"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUpOrLeave}
                  onMouseLeave={handleMouseUpOrLeave}
                  onWheel={handleWheel}
                >
                  <div
                    style={{
                      transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                      transformOrigin: "center center",
                      transition: isDragging ? "none" : "transform 0.15s ease-out"
                    }}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <img 
                      src="/src/assets/images/antique_korea_map_1782138795299.jpg" 
                      alt="조선 고지도 바탕" 
                      className="w-full h-full object-cover opacity-85 filter sepia contrast-125 select-none"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                      {events.map((evt, idx) => {
                        if (idx === 0) return null;
                        const prev = events[idx - 1];
                        return (
                          <g key={`mobile-path-${idx}`}>
                            <line
                              x1={`${prev.mapX}%`}
                              y1={`${prev.mapY}%`}
                              x2={`${evt.mapX}%`}
                              y2={`${evt.mapY}%`}
                              stroke="#4A1510"
                              strokeWidth="2.5"
                              strokeDasharray="4,4"
                              className="opacity-40"
                            />
                            <line
                              x1={`${prev.mapX}%`}
                              y1={`${prev.mapY}%`}
                              x2={`${evt.mapX}%`}
                              y2={`${evt.mapY}%`}
                              stroke="#D4AF37"
                              strokeWidth="1.2"
                              className="opacity-70"
                            />
                          </g>
                        );
                      })}
                    </svg>

                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {events.map((evt, idx) => {
                        const isActive = idx === activeIndex;
                        return (
                          <div
                            key={`mobile-pin-grp-${evt.id}`}
                            style={{ left: `${evt.mapX}%`, top: `${evt.mapY}%` }}
                            className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2"
                          >
                            <button
                              onClick={() => {
                                setIsPlaying(false);
                                setActiveIndex(idx);
                                setShowPopup(true);
                              }}
                              className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 border cursor-pointer shadow-md ${
                                isActive
                                  ? "bg-[#D4AF37] border-white text-[#1B0604] scale-125 z-40"
                                  : "bg-[#8B4513] border-[#D4AF37]/45 text-[#F5F2ED] hover:bg-[#A93226] scale-100 z-30"
                              }`}
                            >
                              <MapPin className="w-3 h-3" />
                            </button>
                            
                            <span className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-[8.5px] font-serif font-black px-1 py-0.5 whitespace-nowrap border z-30 transition-colors ${
                              isActive
                                ? "bg-[#8B2518] border-[#D4AF37] text-white"
                                : "bg-[#FDFBF7]/90 border-[#8B4513]/20 text-[#1A1A1A]"
                            }`}>
                              {evt.title.split(" (")[0]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Mobile Floating Dialog Pop-up inside map framework */}
                <AnimatePresence>
                  {showPopup && currentEvent && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-4 left-4 right-4 z-40 p-3 bg-[#FAF6EE] border-2 border-[#5C4033] text-[#2C251F] rounded-none shadow-md space-y-1.5 pointer-events-auto"
                    >
                      <div className="flex items-center justify-between border-b border-[#5C4033]/20 pb-1">
                        <span className="text-[8.5px] font-black font-serif text-[#8B0000] tracking-widest uppercase flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-[#8B0000]" /> 사건 초안서록 (事件書錄)
                        </span>
                        <button 
                          onClick={() => setShowPopup(false)}
                          className="text-stone-700 hover:text-[#8B0000] font-sans font-bold px-1.5 text-xs cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <div>
                        <h4 className="text-xs font-serif font-black text-[#2C251F]">
                          {currentEvent.title}
                        </h4>
                        <p className="text-[9px] text-[#8B0000] font-serif font-bold mt-0.5">
                          지역관문: {currentEvent.locationName} ({currentEvent.dateStr})
                        </p>
                      </div>
                      <p className="text-[#3E352C] text-[11px] font-serif text-justify leading-relaxed pt-1.5 border-t border-[#5C4033]/15">
                        {currentEvent.description}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* [STEP 2] TRANSPARENT PLAYBACK CONTROL AREA (Middle - OPACITY-0, NO GLASSMORPHISM!) */}
              <div 
                className="w-full opacity-0 pointer-events-none p-3.5 flex flex-col justify-center items-center bg-stone-900/10 border-b border-[#5C4033]/15"
                id="mobile-transparent-playback-zone"
              >
                <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-none border border-white/10">
                  <button onClick={handleStepPrev} className="p-1"><ChevronLeft className="w-4 h-4" /></button>
                  <button className="p-1 px-2 font-serif text-[10px]">재생제어</button>
                  <button onClick={handleStepNext} className="p-1"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="h-1 w-24 bg-stone-800 mt-1"></div>
              </div>

              {/* [STEP 3] EXPLANTION SIDEBAR TAB (Bottom of the page) */}
              <div 
                className="w-full max-w-lg mx-auto bg-[#FAF6EE] text-[#2C251F] border-t-2 border-[#5C4033] p-4 flex flex-col gap-4 shadow-xl"
                id="mobile-history-details-sheet"
              >
                {/* Meta Header block */}
                <div className="border-b border-[#5C4033]/20 pb-2.5 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="text-[8.5px] font-black text-[#8B0000] tracking-widest uppercase block mb-0.5">
                      기록 연대관 · 서기 {currentEvent.year}년
                    </span>
                    <h3 className="text-sm font-serif font-black text-[#2C251F] leading-tight">
                      {currentEvent.title}
                    </h3>
                    <p className="text-[10px] font-serif text-[#8B0000] font-bold mt-1">
                      {currentEvent.locationName} · {currentEvent.dateStr}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setShowMapPlayer(false);
                    }}
                    className="bg-[#8B0000] hover:bg-[#A31D1D] px-2.5 py-1 text-[9px] font-serif font-black text-white hover:text-amber-100 rounded-none shadow-sm flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>[서고합서 회귀]</span>
                  </button>
                </div>

                {/* Details list */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-[#8B0000] tracking-widest font-serif block uppercase">
                    사건 상세 정본 (詳細正本)
                  </span>
                  <ul className="space-y-1 text-xs text-[#3E352C] font-serif list-disc pl-4 leading-relaxed text-justify">
                    {currentEvent.details.map((dt, i) => (
                      <li key={`mobile-dt-${i}`} className="marker:text-[#8B0000]">
                        {dt}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Next Event / Date Transition trigger */}
                {activeIndex < events.length - 1 && (
                  <div className="border-t border-[#5C4033]/20 pt-2.5 pb-0.5" id="mobile-next-event-transition-block">
                    <span className="text-[9px] font-black text-[#8B0000] tracking-widest font-serif block uppercase">
                      사건 탐독 검토 완료 (檢討畢)
                    </span>
                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setActiveIndex(activeIndex + 1);
                        setShowPopup(true);
                      }}
                      className="w-full mt-1 flex items-center justify-between px-3 py-1.5 bg-[#F6F1E5] hover:bg-[#EBDCBE] border border-[#5C4033]/30 text-[#8B0000] font-serif font-black text-[11px] transition-all cursor-pointer shadow-xs"
                    >
                      <span className="flex items-center gap-1">☞ 다음 연월일 [{events[activeIndex + 1].dateStr}] 이동</span>
                      <span className="text-[9.5px] font-bold text-stone-700 truncate max-w-[140px]">
                        {events[activeIndex + 1].title.split(" (")[0]}
                      </span>
                    </button>
                  </div>
                )}

                {/* AI Scholarly Critiques and query box */}
                <div className="border-t border-[#5C4033]/20 pt-3 flex flex-col gap-3">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-[#8B0000] tracking-widest font-serif uppercase flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#8B0000]" /> 대제학 실시간 학술비평 (大提學 批評)
                    </span>
                    
                    <div className="relative overflow-y-auto rounded-none border border-[#5C4033]/20 bg-[#F6F1E5] p-2.5 text-[#2C251F] text-xs leading-relaxed text-justify h-[140px]">
                      {aiAnalysis ? (
                        <div className="space-y-1 font-serif text-[11px]">
                          {renderFormattedMarkdown(aiAnalysis)}
                        </div>
                      ) : isLoadingAI ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F6F1E5]/90 p-2 text-center gap-1">
                          <p className="text-[10px] text-[#8B0000] font-serif animate-pulse font-black">
                            고문서 서법을 수령하여 학설을 판석중입니다...
                          </p>
                        </div>
                      ) : aiError ? (
                        <div className="flex flex-col items-center justify-center text-center p-2 h-full gap-1 text-red-800">
                          <p className="text-[10px] leading-relaxed font-serif font-medium">{aiError}</p>
                          <button
                            onClick={fetchAICommentary}
                            className="text-[9px] bg-[#FAF6EE] text-[#8B0000] border border-[#5C4033]/35 px-2 py-0.5 rounded-none cursor-pointer"
                          >
                            자문 재청
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-stone-500 font-serif text-[10px]">
                          대제학 학술 해설을 받으려면 동판 버튼을 누르십시오.
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={fetchAICommentary}
                    disabled={isLoadingAI}
                    className="w-full py-1.5 bg-[#8B0000] hover:bg-[#A31D1D] text-white font-serif font-black text-xs rounded-none border border-[#5C4033] shadow-xs cursor-pointer flex items-center justify-center gap-1 transition-all"
                  >
                    {isLoadingAI ? "대각 자문 대조 중..." : "[대제학 AI 주론 자문요청]"}
                  </button>
                </div>
              </div>

            </div>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
