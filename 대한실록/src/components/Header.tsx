import React from "react";
import { ActiveTab } from "../types";
import { motion } from "motion/react";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const tabs = [
    { id: "home", label: "홈" },
    { id: "history", label: "역사" },
    { id: "folktales", label: "설화.신화" },
  ] as const;

  // Header styles depending on the active tab
  const getHeaderStyles = () => {
    if (activeTab === "home") {
      return {
        headerBg: "bg-[#181513]/95 border-b border-[#D4AF37]/15 text-[#E8E3D9]",
        logoAccentbg: "bg-[#D4AF37]/10 border border-[#D4AF37]/35 text-[#D4AF37]",
        textPrimary: "text-[#E8E3D9]",
        textSecondary: "text-[#D4AF37]/70",
        tabTextActive: "text-[#181513]",
        tabTextInactive: "text-[#E8E3D9] hover:bg-[#D4AF37]/10"
      };
    }
    if (activeTab === "folktales") {
      return {
        headerBg: "bg-[#071012]/95 border-[#008B8B]/20 text-[#E0F7F6]",
        logoAccentbg: "bg-[#008B8B]/20 border border-[#00FA9A]/30 text-[#00FA9A]",
        textPrimary: "text-white",
        textSecondary: "text-[#00CDAC]/75",
        tabTextActive: "text-[#071012]",
        tabTextInactive: "text-[#CBD5E1] hover:bg-[#008B8B]/10"
      };
    }
    // "history" tab - antique palace feel matching content (deep crimson & gold accents)
    return {
      headerBg: "bg-[#1E0402]/95 border-b border-[#D4AF37]/25 text-[#E8E3D9]",
      logoAccentbg: "bg-[#D4AF37]/10 border border-[#D4AF37]/35 text-[#D4AF37]",
      textPrimary: "text-[#FAF6EE]",
      textSecondary: "text-[#D4AF37]/75",
      tabTextActive: "text-[#1E0402] font-black",
      tabTextInactive: "text-[#DEC5AC] hover:bg-[#D4AF37]/10"
    };
  };

  const styles = getHeaderStyles();

  return (
    <header className={`sticky top-0 z-50 w-full backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs transition-colors duration-500 ${styles.headerBg}`}>
      {/* Brand Logo "대한실록" */}
      <div 
        onClick={() => setActiveTab("home")}
        className="flex items-center gap-3 cursor-pointer group"
        id="header-brand-logo"
      >
        <div className={`relative w-10 h-10 flex items-center justify-center font-serif font-black text-base border transition-all ${styles.logoAccentbg} rounded-none`}>
          <span>실</span>
        </div>
        <div>
          <h1 className={`text-xl sm:text-2xl font-serif font-black tracking-widest flex items-center gap-2 ${styles.textPrimary}`}>
            대한실록
          </h1>
          <p className={`text-[9px] font-sans font-medium tracking-wide ${styles.textSecondary}`}>
            역사와 신비의 기록 아카이브
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <nav className="flex items-center gap-1 sm:gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              id={`tab-btn-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-3.5 py-1.5 sm:px-5 sm:py-2 text-xs sm:text-sm font-serif font-bold transition-all duration-300 flex items-center rounded-none cursor-pointer border border-transparent ${
                isActive
                  ? styles.tabTextActive
                  : styles.tabTextInactive
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab-glow"
                  className={`absolute inset-0 border border-transparent rounded-none ${
                    activeTab === "folktales" 
                      ? "bg-[#00CDAC]" 
                      : "bg-[#D4AF37]"
                  }`}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </header>
  );
}
