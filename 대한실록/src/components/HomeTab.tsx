import React, { useState } from "react";
import { HistoricalBook } from "../types";
import { HISTORICAL_BOOKS } from "../data";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HomeTabProps {
  onSelectBook: (bookId: string) => void;
  onNavigateToFolktales: () => void;
}

export default function HomeTab({ onSelectBook, onNavigateToFolktales }: HomeTabProps) {
  const [activeChapter, setActiveChapter] = useState<number>(0);

  const chapters = [
    {
      title: "제1장: 대한실록의 문을 열며",
      heading: "역사와 전승을 전하는 새로운 디지털 기록소",
      bgColor: "bg-[#1C1816]",
      accentColor: "#D4AF37",
      content: [
        "대한실록은 조선왕조실록 및 구비 고전 자료들에 내재된 역사의 거룩한 맥락을 현대 컴퓨터 기술로 정밀 보존하여 융합한 반응형 학술 플랫폼입니다.",
        "우리는 활자 중심의 지루한 아카이브 나열 방법에서 탈피하여 역사적 연대기와 한반도의 전통 지도 체계를 지리적으로 조화롭게 통합하였습니다.",
        "디지털 시대에 걸맞은 방식으로 왕조의 격동기, 수많은 영웅적 대립, 슬픈 사건의 전개를 추적하여 오늘날을 지탱하는 삶의 거울로 삼고자 합니다."
      ]
    },
    {
      title: "제2장: 시간의 동선과 역사 지도",
      heading: "고지도 좌표 위에 시각화된 시간선의 경로",
      bgColor: "bg-[#191C1E]",
      accentColor: "#B83F35",
      content: [
        "대한실록 역사 탭에서는 고풍스러운 한반도 한양 도성 및 전국 산하 지도를 전체 화면 배경으로 배치하여 역사의 기척을 시각화합니다.",
        "정치 변화, 반란 및 구국의 군사 행동, 해외 외교, 수도 도성 조영 사한 등 모든 기록을 특정 지리 영역의 역사적 사건 마커로 표시합니다.",
        "시간 슬라이더 및 자동 재생 장치를 사용해 연속된 시간 흐름 속에서 지도상의 기점이 유기적으로 점등하며 살아 숨 쉬는 역사 전개를 추적합니다."
      ],
      roleInfo: "역사 탭 역할 요약: 고지도 위에서 책을 고르고 사건 전개를 동영상 슬라이더식으로 재생 및 탐문하는 기능을 수행합니다."
    },
    {
      title: "제3장: 전해 내려오는 이야기와 영물",
      heading: "정사의 이면에 깃든 고대 정신세계의 상징",
      bgColor: "bg-[#131A1C]",
      accentColor: "#008B8B",
      content: [
        "오래된 백성들의 구술 서사와 야담집, 그리고 삼국유사에 등장하는 요괴와 신선, 바다 용왕의 태자 등 다양한 가상 전생 체계를 분류하여 정사 이면의 상징들을 탐독합니다.",
        "그들이 지닌 신비성, 힘, 인간 친화성 등의 성향 지표를 수량화하여 고유의 민담적 본질을 명료하게 고찰할 수 있습니다.",
        "차가운 기록만이 아닌 조상들의 상상력이 수놓은 별천지를 청하빛 가상의 방에서 기묘하게 경험할 수 있도록 구성했습니다."
      ],
      roleInfo: "설화 탭 역할 요약: 고대 신화와 전통 요물들의 특성을 모아 그 기원과 성향을 요약 정리하는 열람실 역할을 수행합니다."
    },
    {
      title: "제4장: 인공지능 대제학의 비평",
      heading: "인공지능 지능을 통한 학술적 주석",
      bgColor: "bg-[#181519]",
      accentColor: "#9C27B0",
      content: [
        "역사 사건 또는 설화 수호령을 살펴보는 동안, 구글의 첨단 인공지능 모델이 학술적 보좌관인 옛 대제학의 지위로서 깊이 있는 해설 비평 주장을 전합니다.",
        "일차적 요약을 넘어 사건 이면의 입체적 역학 관계에 관한 역사학적 분석을 구성하며, 더 나아가 현대 인류에게 건네는 철학적 가치를 3단계로 정밀 해석합니다.",
        "실시간 생성 기술을 활용해 학제적 깊이가 살아 숨 쉬는 명석하고 흥미로운 해설 강의를 즉각적으로 받아볼 수 있습니다."
      ]
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };

  const nextChapter = () => {
    setActiveChapter((prev) => (prev + 1) % chapters.length);
  };

  const prevChapter = () => {
    setActiveChapter((prev) => (prev - 1 + chapters.length) % chapters.length);
  };

  const current = chapters[activeChapter];

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-12"
      id="home-tab-container"
    >
      {/* 1. Multi-Page Comprehensive Site Overview Slider (Unboxed, full span layout) */}
      <motion.div 
        variants={itemVariants}
        className="w-full py-2 space-y-8 relative overflow-hidden"
        id="home-info-multi-page-board"
      >
        {/* Header Indicator */}
        <div className="flex flex-wrap justify-between items-center border-b border-[#D4AF37]/20 pb-4 relative z-10 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-widest text-[#D4AF37] font-mono font-bold uppercase">
              대한실록 특별 전시관 (特別展示館)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {chapters.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveChapter(idx)}
                className={`h-1.5 rounded-none transition-all duration-300 ${
                  activeChapter === idx ? "w-8 bg-[#D4AF37]" : "w-2 bg-neutral-750 hover:bg-neutral-605"
                }`}
                aria-label={`Go to section ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Content Slider with AnimatePresence Overlay Transit */}
        <div className="relative h-[520px] sm:h-[400px] md:h-[300px] w-full overflow-hidden z-10 flex items-center">
          {/* LEFT COLUMN BUTTON OR INNER SLIDE FOR COMPREHENSIVE CONTROL */}
          <div className="absolute left-0 z-30 pointer-events-auto">
            <button
              onClick={prevChapter}
              className="p-2 sm:p-3 bg-[#2E1E1C]/80 hover:bg-[#8B2518] text-[#D4AF37] hover:text-white border border-[#D4AF37]/25 rounded-none shadow-md transition-all cursor-pointer"
              title="이전 전시실"
              aria-label="Previous Chapter"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 h-6" />
            </button>
          </div>

          <div className="w-full h-full px-12 sm:px-14 relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeChapter}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="absolute inset-x-12 sm:inset-x-14 inset-y-0 grid grid-cols-1 md:grid-cols-12 gap-6 items-start bg-[#1E0402]/30 p-4 border border-[#D4AF37]/10"
                id="home-pagination-chapter-card"
              >
                {/* Left Column - Main Callouts */}
                <div className="md:col-span-4 space-y-4 mt-1">
                  <span className="text-xs font-serif text-[#D4AF37] font-bold block bg-[#2E251E] px-3 py-1 rounded-none w-fit border border-[#D4AF37]/10">
                    {current.title}
                  </span>
                  <h3 className="text-base sm:text-xl md:text-2xl font-serif font-black text-[#F5F2ED] leading-tight">
                    {current.heading}
                  </h3>
                </div>

                {/* Right Column - Elaborate Texts / Brief Duties */}
                <div className="md:col-span-8 space-y-4 border-l border-neutral-800 md:pl-6 mt-1">
                  <div className="space-y-3 text-xs sm:text-sm text-neutral-300 font-serif leading-relaxed text-justify">
                    {current.content.map((p, pIdx) => (
                      <p key={pIdx}>{p}</p>
                    ))}
                  </div>

                  {current.roleInfo && (
                    <div className="p-3 rounded-none bg-[#251E1A] border-l-2 border-[#D4AF37] border-y border-r border-neutral-800">
                      <span className="text-[10px] text-[#D4AF37] font-sans font-bold uppercase tracking-wider block mb-0.5">
                        역할 관리 안내
                      </span>
                      <p className="text-xs text-neutral-300 font-serif font-medium leading-relaxed">
                        {current.roleInfo}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="absolute right-0 z-30 pointer-events-auto">
            <button
              onClick={nextChapter}
              className="p-2 sm:p-3 bg-[#2E1E1C]/80 hover:bg-[#8B2518] text-[#D4AF37] hover:text-white border border-[#D4AF37]/25 rounded-none shadow-md transition-all cursor-pointer"
              title="다음 전시실"
              aria-label="Next Chapter"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-between items-center pt-6 border-t border-neutral-800 mt-6 select-none relative z-20">
          <span className="text-[11px] text-[#D4AF37]/75 font-serif flex items-center gap-1.5">
            <span>☞</span> [ 좌우 화살표 버튼 혹은 명록 단추를 누르면 다음 전시 장으로 전환됩니다 ]
          </span>
          <span className="text-xs text-[#D4AF37] font-mono bg-[#251E1A] px-3 py-1 border border-[#D4AF37]/15">
            {activeChapter + 1} / {chapters.length}
          </span>
        </div>
      </motion.div>

      {/* Decorative Traditional Banner */}
      <motion.div
        variants={itemVariants}
        className="relative bg-gradient-to-r from-[#1C1816] to-[#14110F] border border-[#D4AF37]/15 rounded-none p-6 shadow-sm overflow-hidden flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left"
      >
        <div className="space-y-1">
          <p className="text-lg font-serif text-[#F2ECE4] font-bold">
            “역사는 흘러가 사라지는 과거의 낙엽이 아닙니다. 오늘날 우리의 마음을 비추는 거룩한 거울입니다.”
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => onSelectBook("annals")}
            className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#BCA02B] text-neutral-900 text-xs font-serif font-black rounded-none transition-all shadow-sm cursor-pointer"
          >
            기록선 열람
          </button>
          <button
            onClick={onNavigateToFolktales}
            className="px-5 py-2.5 border border-neutral-700 hover:border-neutral-500 text-neutral-300 hover:bg-neutral-800 text-xs font-serif font-bold rounded-none transition-all cursor-pointer"
          >
            설화 비평
          </button>
        </div>
      </motion.div>

      {/* 2. Book List / Classical Cover Library Grid */}
      <div className="space-y-8" id="home-book-covers-section">
        <motion.div variants={itemVariants} className="text-center space-y-2">
          <h3 className="text-xl sm:text-2xl font-serif font-black text-[#F5F2ED]">
            보관각 서서 선집
          </h3>
          <p className="text-xs sm:text-sm text-[#D4AF37]/80 font-serif font-semibold">
            대한의 소중한 기록 유산과 전승 목록이 보관되어 있습니다. 서고를 열고 지도 추적기를 구동해 주십시오.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 justify-items-center"
        >
          {HISTORICAL_BOOKS.map((book) => (
            <motion.div
              key={book.id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              onClick={() => onSelectBook(book.id)}
              className="w-full max-w-[280px] aspect-[3/4] rounded-none p-5 flex flex-col justify-between cursor-pointer relative shadow-md border-l-4 border-[#2C1A04] overflow-hidden group bg-gradient-to-br"
              style={{
                backgroundImage: "linear-gradient(135deg, #1E1B18 0%, #151210 100%)",
                borderRight: `0.5px solid rgba(212, 175, 55, 0.15)`,
                borderTop: `0.5px solid rgba(212, 175, 55, 0.15)`,
                borderBottom: `0.5px solid rgba(212, 175, 55, 0.15)`
              }}
              id={`book-cover-${book.id}`}
            >
              {/* Spine edge effect */}
              <div className="absolute inset-y-0 left-0 w-[0.5px] bg-black/40" />
              <div className="absolute inset-y-0 left-[2px] w-[0.5px] bg-neutral-800/20" />
              
              {/* Traditional book corner brass brackets (pure CSS styling) */}
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-[#D4AF37]/20 rounded-none" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-[#D4AF37]/20 rounded-none" />

              {/* Thread-binding loops representation typical for Joseon books */}
              <div className="absolute left-[8px] inset-y-0 flex flex-col justify-between py-8 pointer-events-none">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-2.5 h-[1.5px] bg-[#D4AF37]/20 rounded-none border border-black/30" />
                ))}
              </div>

              {/* Book Header Label */}
              <div className="pl-6 pt-2 flex justify-between items-start">
                <span className="text-[9px] uppercase tracking-widest font-sans text-[#D4AF37] font-bold border border-[#D4AF37]/15 px-1.5 py-0.5 rounded-none bg-[#251F1A]">
                  {book.dynasty}
                </span>
                <span className="text-[10px] text-neutral-400 font-bold flex items-center gap-1 font-serif">
                  {book.events.length}건 수록
                </span>
              </div>

              {/* Vertical Title Area in the center */}
              <div className="flex justify-center my-6">
                <div className="px-3.5 py-6 bg-[#161311] text-[#E8E3D9] border border-[#D4AF37]/15 rounded-none shadow-inner flex flex-col items-center gap-2 group-hover:bg-[#1C1815] transition-colors min-h-[160px] justify-center">
                  <h4 className="text-base sm:text-lg font-serif font-black tracking-wider text-center break-all [writing-mode:vertical-rl] leading-none text-[#F2ECE4]">
                    {book.title.split(" (")[0]}
                  </h4>
                  <span className="text-[9px] text-[#D4AF37] border-t border-[#D4AF37]/15 pt-1 mt-1 font-serif font-bold">
                    기록서
                  </span>
                </div>
              </div>

              {/* Book Footer Summary Description */}
              <div className="pl-6 pb-2 space-y-2">
                <p className="text-[10px] text-neutral-400 line-clamp-2 font-serif group-hover:text-neutral-200 transition-colors font-medium">
                  {book.description.replace("이옵니다.", "입니다.").replace("가득하옵니다.", "가득하기 때문입니다.")}
                </p>
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#D4AF37] group-hover:text-[#F2ECE4] transition-all">
                  <span>지도에서 정밀 열람</span>
                  <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
