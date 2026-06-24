/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { ActiveTab } from "./types";
import Header from "./components/Header";
import HomeTab from "./components/HomeTab";
import HistoryTab from "./components/HistoryTab";
import FolktalesTab from "./components/FolktalesTab";

import AdminPage from "./lib/AdminPage";
import HistoryDetailPage from "./lib/HistoryDetailPage";
import FolktaleDetailPage from "./lib/FolktaleDetailPage";

import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [selectedBookId, setSelectedBookId] = useState<string>("annals");
  const [showHistoryMap, setShowHistoryMap] = useState<boolean>(false);

  // Handle book selection on home shelf과 history tab transition
  const handleSelectBookFromHome = (bookId: string) => {
    setSelectedBookId(bookId);
    setActiveTab("history");
  };

  const handleNavigateToFolktales = () => {
    setActiveTab("folktales");
  };

  // Switch custom container background style based on tab and theme guidelines
  const getContainerBg = () => {
    if (activeTab === "home") {
      return "bg-[#14110f] text-[#E8E3D9]";
    }
    if (activeTab === "folktales") {
      return "bg-[#0b1619] text-[#E0F7F6]";
    }
    // History Tab matches active deep crimson and gold theme
    return "bg-[#1E0402] text-[#F5F2ED]";
  };

  const getFooterClass = () => {
    if (activeTab === "home") {
      return "border-[#D4AF37]/20 bg-[#1e1a17]/50 text-[#D4AF37]/70";
    }
    if (activeTab === "folktales") {
      return "border-[#008B8B]/20 bg-[#0c1417]/50 text-[#008B8B]/70";
    }
    return "border-[#D4AF37]/20 bg-[#1E0402] text-[#D4AF37]/75";
  };

  return (
    <div className={`min-h-screen ${getContainerBg()} font-sans flex flex-col transition-colors duration-500`}>
      {/* Header component */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Tab Render Space with custom page transition animations */}
      <main className="flex-1 w-full" id="main-content-canvas">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full h-full"
          >

            <Routes>
              <Route path="/" element={<HomeTab />} />
              <Route path="/history" element={<HistoryTab />} />
              <Route path="/history/:id" element={<HistoryDetailPage />} />
              <Route path="/folktales" element={<FolktalesTab />} />
              <Route path="/folktales/:id" element={<FolktaleDetailPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>

          </motion.div>
        </AnimatePresence>
      </main>

      {/* Traditional elegant footer - hidden when viewing full-screen historical map */}
      {!(activeTab === "history" && showHistoryMap) && (
        <footer className={`w-full border-t py-6 text-center text-xs font-serif mt-auto transition-colors duration-500 ${getFooterClass()}`}>
          <p className="tracking-wide">
            © 2026 대한실록 임시 고서적 보관각. 전역 데이터 및 소설 구비 무형문화재 준용.
          </p>
          <p className="text-[10px] opacity-70 mt-1">
            국가 전자 사초 보존위원회 대제학 자문기구
          </p>
        </footer>
      )}
    </div>
  );
}

