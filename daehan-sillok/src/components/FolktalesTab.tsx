import React, { useState, useEffect } from "react";
import { MythicalCreature } from "../types";
import { MYTHICAL_CREATURES } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, MessageSquare, ChevronLeft, BookOpen, Volume2, Settings, Palette } from "lucide-react";

export default function FolktalesTab() {
  const categories = ["귀신", "도깨비", "인간/변신형", "동물형", "식물형", "비생물형", "거대괴수"] as const;

  // Selected Category / Submenu active state
  const [activeCategory, setActiveCategory] = useState<typeof categories[number]>("귀신");

  // Selected magical creature/mythical figure - initially empty to trigger card view first
  const [selectedId, setSelectedId] = useState<string>("");

  // Q&A dynamic integration states
  const [userQuery, setUserQuery] = useState("");
  const [qaThread, setQaThread] = useState<Array<{ q: string; a: string }>>([]);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [qaError, setQaError] = useState("");

  // Popups to read manuscript similar to visual chronicling layout & view detailed scroll illustration
  const [showManuscript, setShowManuscript] = useState(false);
  const [showIllustration, setShowIllustration] = useState(false);

  const selectedCreature = MYTHICAL_CREATURES.find(m => m.id === selectedId);

  // List of creatures in currently active category
  const filteredCreatures = MYTHICAL_CREATURES.filter(m => m.category === activeCategory);

  // Reset thread when creature changes
  useEffect(() => {
    setQaThread([]);
    setQaError("");
    setUserQuery("");
  }, [selectedId]);

  // Handle Q&A with Gemini AI server
  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || !selectedCreature) return;

    const currentQuery = userQuery.trim();
    setUserQuery("");
    setIsAskingAI(true);
    setQaError("");

    try {
      const response = await fetch("/api/gemini/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `${selectedCreature.name}에 관한 자문: ${currentQuery}`,
          context: `대상: ${selectedCreature.name}, 기원출전: ${selectedCreature.origin}, 상세 묘사: ${selectedCreature.description}.`,
          category: `설화 실시간 학술 질의`
        })
      });

      const data = await response.json();
      if (data.analysis) {
        setQaThread(prev => [...prev, { q: currentQuery, a: data.analysis }]);
      } else {
        setQaError("비평관의 자문을 수령하지 못하였습니다. 서책의 내용을 확인하신 후 다시 여쭈어 주십시오.");
      }
    } catch (err) {
      console.error(err);
      setQaError("학술 자문국과의 교신이 원활치 못합니다. 잠시 후 재차 질문 주십시오.");
    } finally {
      setIsAskingAI(false);
    }
  };

  const renderFormattedMarkdown = (markdown: string) => {
    if (!markdown) return null;
    return markdown.split("\n\n").map((part, index) => {
      if (part.startsWith("###")) {
        return (
          <h5 key={index} className="text-xs font-serif font-black text-[#00FA9A] border-b border-[#008B8B]/20 pb-1 mt-4 mb-2">
            {part.replace("###", "").trim()}
          </h5>
        );
      }
      return (
        <p key={index} className="text-[11px] sm:text-xs text-[#DEC5AC] font-serif leading-relaxed text-justify mb-2">
          {part.trim()}
        </p>
      );
    });
  };

  return (
    <div className="relative min-h-[calc(100vh-80px)] overflow-hidden bg-[#071012]" id="folktales-tab-layout">
      
      {/* MOBILE HORIZONTAL NAVIGATION CATEGORY BAR (Visible only on mobile/tablet below lg) */}
      <div 
        className="lg:hidden sticky top-0 z-30 w-full bg-[#071012]/95 backdrop-blur-md border-b border-[#008B8B]/20 py-2.5 px-4 overflow-x-auto"
        id="folktales-mobile-category-nav"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex items-center gap-6 whitespace-nowrap min-w-max">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={`mobile-nav-${cat}`}
                onClick={() => {
                  setActiveCategory(cat);
                  setSelectedId(""); // Reset selected ID so category text select always displays the transmission album (전승첩) card grid!
                }}
                className={`py-1 text-xs font-serif font-black tracking-wider transition-all cursor-pointer relative shrink-0 ${
                  isActive
                    ? "text-[#00FA9A] scale-105"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <span>{cat}</span>
                {isActive && (
                  <motion.div 
                    layoutId="mobileActiveCategoryGlow"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#00FA9A]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAGICAL AMBIENT BACKGROUND GLOWS */}
      <div className="absolute top-1/4 left-1/3 w-[350px] h-[350px] bg-cyan-500/5 rounded-none filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-teal-500/5 rounded-none filter blur-[120px] pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto h-full">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Sidebar Category Selector (3 Cols) - Hidden on Mobile */}
        {/* ========================================================= */}
        <div className="hidden lg:block lg:col-span-3 space-y-4" id="folktales-left-sidebar">
          
          {/* Header Label */}
          <div className="text-left space-y-1 mb-2">
            <span className="text-[9px] tracking-widest text-[#00F2FE] font-serif font-black block uppercase">
              [전통 구술 전승 명부]
            </span>
            <h3 className="text-lg sm:text-xl font-serif font-black text-white">
              신령 서첩과 영물록
            </h3>
            <p className="text-xs text-[#00CDAC] font-serif leading-relaxed">
              민간설화와 신화 속에서 구전되어 오던 신비로운 존재들의 명기첩입니다.
            </p>
          </div>

          {/* Categories select buttons (7 categories) */}
          <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    // Reset selected on category switch by default to show card gallery
                    setSelectedId("");
                  }}
                  className={`px-3.5 py-2 rounded-none text-xs sm:text-sm font-serif font-bold text-left transition-all duration-300 border flex items-center justify-between cursor-pointer ${
                    isActive
                      ? "bg-[#008B8B]/35 border-[#00FA9A]/50 text-[#00FA9A] shadow-md shadow-cyan-950/20"
                      : "bg-[#0B1B21] border-[#008B8B]/10 text-stone-300 hover:text-[#00FA9A] hover:border-[#008B8B]/40 hover:bg-[#0E262E]"
                  }`}
                >
                  <span>{cat}</span>
                  <span className="text-[10px] opacity-75 font-mono hidden sm:inline">
                    [{MYTHICAL_CREATURES.filter(m => m.category === cat).length}]
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN PANEL CONTENT: 9 Cols                                */}
        {/* ========================================================= */}
        <div className="lg:col-span-9" id="folktales-main-panel">
          <AnimatePresence mode="wait">
            {selectedCreature ? (
              /* DETAILED VIEW: Loaded after selecting a specific mythical character card */
              <motion.div
                key={selectedCreature.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full items-stretch"
              >
                
                {/* Center Column: Detailed Parchment (7 Cols) */}
                <div className="md:col-span-8 flex flex-col justify-between h-full space-y-4">
                  <div className="bg-[#0B1A1E] text-neutral-200 rounded-none p-5 sm:p-8 flex-1 flex flex-col justify-between shadow-sm border border-[#008B8B]/25 relative">
                    {/* Return back button */}
                    <button
                      onClick={() => setSelectedId("")}
                      className="absolute top-4 right-4 text-xs font-serif text-[#00FA9A] hover:text-white flex items-center gap-1 border border-[#008B8B]/30 px-2 py-1 bg-[#10242A] cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>목록회귀</span>
                    </button>

                    <div className="space-y-6">
                      
                      {/* Title Header */}
                      <div className="border-b border-[#008B8B]/20 pb-4 text-center font-serif">
                        <span className="text-[8px] text-[#00FA9A] font-black tracking-widest uppercase">
                          대각서 전승 영무기록첩
                        </span>
                        <h2 className="text-xl sm:text-2xl font-serif font-black text-white mt-1">
                          {selectedCreature.name}
                        </h2>
                        <p className="text-[11.5px] text-[#00CDAC] mt-1 font-serif italic text-center">
                          “ {selectedCreature.tagline} ”
                        </p>
                      </div>

                      {/* Content Section: Description */}
                      <div className="space-y-2 relative group-content">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black font-serif text-[#00FA9A] border-l-2 border-[#00FA9A] pl-1.5 block">
                            [전승 개요 고찰]
                          </span>
                          <button
                            onClick={() => setShowIllustration(true)}
                            className="flex items-center gap-1 text-[10px] font-serif font-black text-[#00FA9A] hover:text-white border border-[#00FA9A]/30 hover:border-[#00FA9A] px-2 py-0.5 bg-[#0C1F24] transition-all duration-300 cursor-pointer rounded-none active:scale-95"
                            title="설화 서화 화첩 보기"
                            id="visualize-creature-btn"
                          >
                            <Palette className="w-3.5 h-3.5" />
                            <span>[영물 畵帖 보기]</span>
                          </button>
                        </div>
                        <p className="text-xs sm:text-sm text-[#D1EAE9] font-serif leading-relaxed text-justify font-medium">
                          {selectedCreature.description
                            .replace(/이옵니다/g, "입니다")
                            .replace(/이었사옵니다/g, "이었습니다")
                            .replace(/있사옵니다/g, "있습니다")
                            .replace(/바라옵니다/g, "바랍니다")
                            .replace(/하였사옵니다/g, "하였습니다")
                            .replace(/있나이다/g, "있습니다")
                            .replace(/나이다/g, "니다")
                            .replace(/시옵니다/g, "십니다")
                          }
                        </p>
                      </div>

                      {/* Content Section: Habits */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[9px] font-black font-serif text-[#FF5E62] border-l-2 border-[#FF5E62] pl-1.5 block">
                          [성조 및 도학적 성격]
                        </span>
                        <p className="text-xs sm:text-sm text-[#D1EAE9] font-serif leading-relaxed text-justify font-medium">
                          {selectedCreature.habits
                            .replace(/이옵니다/g, "입니다")
                            .replace(/이었사옵니다/g, "이었습니다")
                            .replace(/있사옵니다/g, "있습니다")
                            .replace(/바라옵니다/g, "바랍니다")
                            .replace(/하였사옵니다/g, "하였습니다")
                            .replace(/있나이다/g, "있습니다")
                            .replace(/나이다/g, "니다")
                            .replace(/시옵니다/g, "십니다")
                          }
                        </p>
                      </div>

                      {/* Integrated "참조 출전" block inside parchment details */}
                      <div className="border-t border-[#008B8B]/20 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] font-serif">
                        <button
                          onClick={() => setShowManuscript(true)}
                          className="text-stone-300 hover:text-[#00FA9A] font-medium flex items-center gap-1.5 border border-[#008B8B]/20 hover:border-[#00FA9A]/60 px-2.5 py-1.5 bg-[#0C1F24] transition-all cursor-pointer rounded-none group text-left"
                          title="출처 문서 고서로 읽기"
                          id="creature-origin-btn"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-[#00FA9A] group-hover:scale-110 transition-transform" />
                          <span>
                            <strong>참조 출전:</strong> <span className="underline decoration-dotted text-[#00FA9A] font-bold">{selectedCreature.origin}</span> [고서 眞本고찰 ☞]
                          </span>
                        </button>
                        <span className="text-[#00FA9A]/95 text-[10px] font-bold self-start sm:self-center">
                          [전승 정식 분류: {selectedCreature.category}]
                        </span>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Right Column: AI Interactive Q&A Portal (5 Cols) */}
                <div className="md:col-span-4 flex flex-col justify-between space-y-4">
                  <div className="bg-[#0B1619] border border-[#008B8B]/25 p-5 text-neutral-200 rounded-none flex-1 flex flex-col justify-between shadow-sm">
                    
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-2 pb-3 border-b border-[#008B8B]/25">
                        <span className="text-[8px] text-[#00FA9A] tracking-wider uppercase block font-black">
                          SCHOLARLY CHAT FORUM
                        </span>
                        <h4 className="text-xs sm:text-sm font-serif font-black text-white">
                          대제학 AI 실시간 심의 자문
                        </h4>
                        <p className="text-[10px] text-neutral-400 font-serif leading-relaxed">
                          문헌 속 신수 영물에 대한 철학적 비평이나 역학을 사관에게 상세히 상고해 보실 수 있습니다.
                        </p>
                      </div>

                      {/* Q&A Thread Scroll Block */}
                      <div className="flex-1 my-3 overflow-y-auto max-h-[280px] bg-[#050D0E] p-3 border border-[#008B8B]/15 space-y-4">
                        {qaThread.length > 0 ? (
                          qaThread.map((thread, idx) => (
                            <div key={idx} className="space-y-2 text-xs">
                              <div className="bg-[#0E262E] p-2 border-l border-[#00FA9A]/40">
                                <p className="text-[9px] text-[#00FA9A] font-serif font-bold uppercase mb-1">
                                  [자문 원문 질의]
                                </p>
                                <p className="text-neutral-200 font-serif font-semibold">{thread.q}</p>
                              </div>
                              <div className="p-2 space-y-1 bg-[#101F24]/50">
                                <p className="text-[9px] text-neutral-400 font-serif font-bold uppercase">
                                  [사관 AI 비평 답신]
                                </p>
                                <div className="text-neutral-300 font-serif">
                                  {renderFormattedMarkdown(thread.a)}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-4">
                            <span className="text-[10px] text-neutral-500 font-serif">
                              질문 내역이 비어 있습니다.
                            </span>
                            <span className="text-[9px] text-neutral-600 font-serif mt-1">
                              하단 입력기에서 질의를 시작해 주십시오.
                            </span>
                          </div>
                        )}

                        {isAskingAI && (
                          <div className="p-3 bg-[#0E262E] border border-[#00FA9A]/20 animate-pulse text-center">
                            <span className="text-[10px] text-[#00FA9A] font-serif font-black">
                              고문서를 추종하며 분석을 조율하고 있습니다...
                            </span>
                          </div>
                        )}

                        {qaError && (
                          <div className="p-2 bg-rose-950/40 border border-rose-800 text-[10px] text-rose-300 font-serif text-center">
                            {qaError}
                          </div>
                        )}
                      </div>

                      {/* Live user form submission */}
                      <form onSubmit={handleAskAI} className="space-y-2 pt-2 border-t border-[#008B8B]/20">
                        <textarea
                          rows={2}
                          value={userQuery}
                          onChange={(e) => setUserQuery(e.target.value)}
                          placeholder={`${selectedCreature.name.split(" (")[0]}에 대하여 학술적 질문을 입력해 주십시오... (예: 전설 속 기원에 대하여 분석해 달라)`}
                          className="w-full p-2 text-xs font-serif bg-[#091012] border border-[#008B8B]/30 rounded-none text-white focus:outline-none focus:border-[#00FA9A] placeholder-neutral-600 resize-none leading-relaxed"
                          disabled={isAskingAI}
                        />
                        <button
                          type="submit"
                          disabled={isAskingAI || !userQuery.trim()}
                          className="w-full py-1.5 bg-[#008B8B] hover:bg-[#00FA9A] hover:text-neutral-950 text-neutral-100 font-serif font-black text-xs rounded-none border border-[#00FA9A]/15 cursor-pointer disabled:opacity-40 transition-all text-center"
                        >
                          {isAskingAI ? "비평 주석 검토 중..." : "[대제학 AI 주론 질의송부]"}
                        </button>
                      </form>

                    </div>

                  </div>
                </div>

              </motion.div>
            ) : (
              /* CARD GRID GATEWAY VIEW: shown in place of empty preview box, displaying multi-cards searchable targets */
              <motion.div
                key="empty-parchment-guide-cards"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full min-h-[500px] bg-[#0A181C] border border-[#008B8B]/20 rounded-none p-6 flex flex-col justify-between"
              >
                <div className="space-y-5">
                  <div className="flex items-center gap-3 border-b border-[#008B8B]/20 pb-4">
                    <div className="w-10 h-10 border border-[#00FA9A]/40 flex items-center justify-center text-[#00FA9A] font-serif text-base bg-[#0E262E]">
                      說
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-serif font-black text-white">
                        [{activeCategory}] 서첩 영물록 전승첩
                      </h3>
                      <p className="text-xs text-neutral-400 font-serif leading-relaxed mt-0.5">
                        민간 구전서와 전적 속 수록된 대상을 아래 카드에서 선택하여 상세 기원과 비평 서화를 펼쳐 보십시오. 
                      </p>
                    </div>
                  </div>

                  {/* Card grid of available targets in active category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                    {filteredCreatures.map((item) => (
                      <motion.div
                        key={item.id}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedId(item.id)}
                        className="p-4 bg-[#0E2228] hover:bg-[#132F37] border border-[#008B8B]/20 hover:border-[#00FA9A]/60 transition-all rounded-none cursor-pointer flex flex-col justify-between h-[155px] group relative overflow-hidden"
                      >
                        {/* Interactive floating aura color */}
                        <div 
                          className="absolute -top-10 -right-10 w-24 h-24 rounded-full opacity-10 group-hover:opacity-25 transition-opacity pointer-events-none"
                          style={{ backgroundColor: item.glowingColor }}
                        />

                        <div className="space-y-1.5 relative z-10">
                          <h4 className="text-xs sm:text-sm font-serif font-black text-white group-hover:text-[#00FA9A] transition-colors">
                            {item.name.split(" (")[0]}
                          </h4>
                          <p className="text-[10.5px] text-neutral-400 font-serif leading-relaxed line-clamp-2 text-justify">
                            {item.tagline}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#008B8B]/10 flex justify-end items-center text-[9px] font-sans text-neutral-500 group-hover:text-[#00FA9A] transition-colors relative z-10 mt-1">
                          <span className="font-serif underline">[서한 펼치기]</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* 
        (1) ROYAL ARCHIVE MANUSCRIPT POPUP: Styled like the user's provided screen shot 
      */}
      <AnimatePresence>
        {showManuscript && selectedCreature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowManuscript(false)}
          >
            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-4xl bg-[#130E09] border-[3px] border-[#D4AF37]/50 rounded-none p-6 md:p-8 text-[#FAF6EE] shadow-2xl relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background Hanji patterns and textures */}
              <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay bg-repeat bg-[radial-gradient(#FAF6EE_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* Close Button */}
              <button
                onClick={() => setShowManuscript(false)}
                className="absolute top-4 right-4 text-xs font-serif text-[#D4AF37] hover:text-white border border-[#D4AF37]/35 hover:border-[#D4AF37] px-3 py-1 bg-[#251A11] cursor-pointer transition-colors z-40"
              >
                ✕ [서기비급 닫기]
              </button>

              {/* [HEADER]: Recreates the image layout */}
              <div className="border-b border-[#D4AF37]/35 pb-4 mb-6 font-serif">
                <span className="text-[10px] text-[#D4AF37] font-black tracking-widest uppercase block mb-1">
                  사서 수록 원장 고찰 (史書收錄 眞本)
                </span>
                <h2 className="text-2xl md:text-3xl font-serif font-black text-[#F5F2ED] tracking-tight">
                  전승 고문서록
                </h2>
                <p className="text-[12px] text-stone-400 mt-1 flex flex-wrap items-center gap-1.5">
                  <span>참조 출전 비급: </span>
                  <span className="text-[#D4AF37] font-bold underline underline-offset-2">{selectedCreature.origin}</span>
                  <span>· 정식 가상 학술 정본 고해</span>
                </p>
              </div>

              {/* [MAIN LAYOUT - 2 COLUMNS]: Recreates the image layout perfectly */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative" id="manuscript-book-framework">
                
                {/* Left Timeline Side list (3 Cols) */}
                <div className="md:col-span-3 border-r border-[#D4AF37]/15 pr-4 flex flex-col gap-6 font-serif text-stone-400">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wide text-stone-500 font-bold">수록 사서 분류</span>
                    <span className="block text-xs text-[#D4AF37] bg-[#2E1A0F] px-2 py-1 border border-[#D4AF37]/20 font-bold text-center">
                      {selectedCreature.origin.split(" ")[0]} 眞冊
                    </span>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] uppercase tracking-wider text-stone-500 font-bold block border-b border-stone-800 pb-1">
                      사건 발생 대역순 (年代順)
                    </span>
                    
                    {/* Simulated Timeline Steps */}
                    <div className="space-y-4 relative pl-3 border-l border-[#D4AF37]/20">
                      <div className="relative">
                        <div className="absolute -left-[16px] top-1.5 w-2 h-2 rounded-full bg-[#D4AF37] border border-[#130E09]" />
                        <span className="block text-[10px] font-bold text-[#D4AF37]">기원 고설대</span>
                        <span className="text-[9px] text-stone-500 font-serif">영물 최초 출현기</span>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[16px] top-1.5 w-2 h-2 rounded-full bg-stone-700 border border-[#130E09]" />
                        <span className="block text-[10px] text-stone-400 font-serif">삼한 세시기</span>
                        <span className="text-[9px] text-stone-500 font-serif">민간 사화 구전성</span>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[16px] top-1.5 w-2 h-2 rounded-full bg-stone-700 border border-[#130E09]" />
                        <span className="block text-[10px] text-stone-400 font-serif">조선 실록대</span>
                        <span className="text-[9px] text-stone-500 font-serif font-sans">어제 학술 비평 주론</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Cards List (9 Cols) */}
                <div className="md:col-span-9 space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  
                  {/* Card 1: Main Source text */}
                  <div className="p-5 bg-[#1F1610] hover:bg-[#251A13] border border-[#D4AF37]/30 hover:border-[#D4AF37]/60 transition-all rounded-none relative group">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-[#8B2518]/80 text-[#FAF6EE] text-[9.5px] font-bold border border-[#D4AF37]/50">
                          {selectedCreature.origin.split(" ")[0]}
                        </span>
                        <span className="px-2 py-0.5 bg-[#2A1E15] border border-orange-950 text-[#D4AF37] text-[9.5px]">
                          古抄 (고초)
                        </span>
                      </div>

                      {/* PICTURE/DRAWING ICON next to the content */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowIllustration(true);
                        }}
                        className="flex items-center gap-1 text-[10.5px] font-sans font-bold text-[#D4AF37] hover:text-[#FAF6EE] border border-[#D4AF37]/30 hover:border-[#D4AF37] px-2.5 py-1 bg-[#150F0A] cursor-pointer transition-all rounded-none"
                        title="내용을 영물 그림으로 상정보기"
                      >
                        <Palette className="w-3.5 h-3.5 text-[#D4AF37] animate-pulse" />
                        <span>[그림 화첩 보기]</span>
                      </button>
                    </div>

                    {/* Classic Yellow-sand/Gold color typography for the translated text like the image */}
                    <p className="font-serif leading-relaxed text-justify text-[#D1C6A5] text-sm sm:text-base tracking-wide font-medium">
                      “ 위방에 의하면, {selectedCreature.name.split(" (")[0]}은(는) {selectedCreature.description.replace(/입니다/g, "이옵니다").replace(/하였습니다/g, "하였사옵니다")} ”
                    </p>
                  </div>

                  {/* Card 2: Habits details */}
                  <div className="p-5 bg-[#1C140E] hover:bg-[#221811] border border-[#D4AF37]/15 hover:border-[#D4AF37]/45 transition-all rounded-none relative group">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-stone-900 border border-stone-800 text-stone-400 text-[9.5px]">
                          어제비경 (御製秘經)
                        </span>
                        <span className="px-2 py-0.5 bg-[#8B2518]/80 text-[#FAF6EE] text-[9.5px] font-bold border border-[#D4AF37]/50">
                          성품도록 (性品道錄)
                        </span>
                      </div>

                      {/* PICTURE/DRAWING ICON next to the content */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowIllustration(true);
                        }}
                        className="flex items-center gap-1 text-[10.5px] font-sans font-bold text-[#D4AF37] hover:text-[#FAF6EE] border border-[#D4AF37]/30 hover:border-[#D4AF37] px-2.5 py-1 bg-[#150F0A] cursor-pointer transition-all rounded-none"
                        title="내용을 영물 그림으로 상정보기"
                      >
                        <Palette className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>[그림 화첩 보기]</span>
                      </button>
                    </div>

                    <p className="font-serif leading-relaxed text-justify text-[#D1C6A5] text-sm sm:text-base tracking-wide font-medium">
                      “ {selectedCreature.habits.replace(/입니다/g, "이옵니다").replace(/하였습니다/g, "하였사옵니다")} ”
                    </p>
                  </div>

                </div>

              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 
        (2) SPECTACULAR WATERCOLOR TRADITIONAL ILLUSTRATION SCROLL POPUP
      */}
      <AnimatePresence>
        {showIllustration && selectedCreature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowIllustration(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              className="w-full max-w-md bg-[#F4EFE0] border-4 border-[#3D2612] rounded-none p-5 text-neutral-800 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[90vh] max-h-[640px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Wood textures hangers */}
              <div className="absolute top-0 inset-x-0 h-4 bg-[#4A2D16] border-b border-[#2C190D] shadow-md z-30" />
              <div className="absolute bottom-0 inset-x-0 h-4 bg-[#4A2D16] border-t border-[#2C190D] shadow-md z-30" />

              <div className="absolute inset-y-4 inset-x-3 border border-[#3D2612]/20 " />

              {/* Silk Scroll header ribbon */}
              <div className="flex flex-col items-center justify-center pt-4 pb-2 text-center border-b border-[#3D2612]/15 relative z-10">
                <span className="text-[9px] text-[#8B0000] font-black tracking-widest font-serif block uppercase">
                  御製 奎章閣 神獸眞形圖
                </span>
                <h3 className="text-lg font-serif font-black text-[#2e1d0f] flex items-center gap-1.5 mt-0.5">
                  {selectedCreature.name.split(" (")[0]} 진형도 (眞形圖)
                </h3>
              </div>

              {/* Center Canvas: Stylized watercolor paint scroll */}
              <div className="flex-1 my-3 bg-[#EAE2CE] border border-[#3D2612]/15 relative overflow-hidden flex flex-col items-center justify-center p-4">
                {/* Traditional Korean stamp background seal */}
                <div className="absolute top-4 right-4 w-10 h-10 border-2 border-red-700/80 rounded-none flex items-center justify-center text-red-700/80 text-xs font-serif font-black pointer-events-none select-none rotate-6">
                  奎章
                </div>

                {/* Dynamic Traditional Korean Landscape & Creature Motif Illustration */}
                <svg className="w-48 h-48 drop-shadow-xl select-none" viewBox="0 0 100 100">
                  <defs>
                    <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={selectedCreature.glowingColor || "rgba(224, 242, 254, 1)"} stopOpacity="0.45" />
                      <stop offset="100%" stopColor={selectedCreature.glowingColor || "rgba(224, 242, 254, 1)"} stopOpacity="0" />
                    </radialGradient>
                    <radialGradient id="inkAura" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#1E130B" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#1E130B" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Aura aura */}
                  <circle cx="50" cy="50" r="45" fill="url(#auraGlow)" />
                  <circle cx="50" cy="46" r="30" fill="url(#inkAura)" />

                  {/* Traditional mountain ridges sketch inside scroll */}
                  <path d="M10,80 Q25,50 40,75 T70,68 T90,82 L90,88 L10,88 Z" fill="#D9CFAF" opacity="0.6" stroke="#4A341D" strokeWidth="0.4" />
                  <path d="M20,83 Q35,55 50,78 T80,72 T95,85 L95,88 L20,88 Z" fill="#DDD5B8" opacity="0.8" stroke="#4A341D" strokeWidth="0.3" />

                  {/* Stylized mythical motif drawing */}
                  <g transform="translate(50, 44)" className="animate-pulse">
                    {/* Glowing cores */}
                    <circle cx="0" cy="0" r="10" fill={selectedCreature.glowingColor} opacity="0.25" />
                    <circle cx="0" cy="0" r="3" fill="#FFFFFF" />

                    {/* Watercolor ink brush circles */}
                    <circle cx="0" cy="0" r="8" stroke="#1E130B" strokeWidth="1.2" fill="none" strokeDasharray="3,3" opacity="0.7" />
                    
                    {/* Radiating traditional sunburst/beast spikes */}
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, k) => (
                      <line
                        key={k}
                        x1="0"
                        y1="0"
                        x2={14 * Math.cos((angle * Math.PI) / 180)}
                        y2={14 * Math.sin((angle * Math.PI) / 180)}
                        stroke="#3D2612"
                        strokeWidth="1"
                        opacity="0.8"
                      />
                    ))}

                    {/* Classic clouds styling on sidebar */}
                    <path d="M-15,10 Q-10,5 -5,10 T5,10" fill="none" stroke="#3D2612" strokeWidth="0.6" opacity="0.8" />
                    <path d="M5,-5 Q10,-10 15,-5 T25,-5" fill="none" stroke="#3D2612" strokeWidth="0.6" opacity="0.8" />
                  </g>

                  {/* Ink splatter decorations */}
                  <circle cx="25" cy="25" r="1.5" fill="#1E130B" opacity="0.5" />
                  <circle cx="75" cy="20" r="1" fill="#1E130B" opacity="0.4" />
                  <circle cx="30" cy="65" r="2" fill="#1E130B" opacity="0.4" />
                </svg>

                {/* Vertically aligned Brush-written Creature name as calligraphy */}
                <div className="absolute left-4 top-4 border-l border-[#3D2612]/20 pl-2 text-[10.5px] text-[#4A2D16] font-serif leading-tight">
                  <span className="block font-black text-[#8B0000]">{selectedCreature.name.split(" (")[0]}</span>
                  <span>{selectedCreature.category}</span>
                  <span className="block text-[8px] opacity-65 tracking-widest mt-1">傳承眞圖</span>
                </div>

                <div className="text-center font-serif mt-4 max-w-[280px] bg-[#FAF6EE]/80 border border-[#3D2612]/10 p-2.5 shadow-sm">
                  <p className="text-[11.5px] italic text-[#8B0000] font-bold leading-relaxed px-1">
                    {selectedCreature.quotes}
                  </p>
                  <p className="text-[10px] text-stone-600 mt-1 pb-1 border-t border-dashed border-[#3D2612]/15 pt-1.5 leading-relaxed">
                    본 고도는 {selectedCreature.origin}에 기초하여 영물의 형상을 규장각에서 어제 화성한 진형목각도입니다.
                  </p>
                </div>
              </div>

              {/* Back close button */}
              <div className="flex justify-center pb-4 relative z-10">
                <button
                  onClick={() => setShowIllustration(false)}
                  className="px-6 py-2 bg-[#3D2612] hover:bg-[#5C3D21] text-[#F4EFE0] font-sans font-bold text-xs cursor-pointer shadow-md transition-all active:scale-95"
                >
                  [화첩 닫기]
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
