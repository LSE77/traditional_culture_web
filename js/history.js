import { supabase } from "./supabaseClient.js";

export async function initHistoryPage() {
  const { data, error } = await supabase
    .from("history_events")
    .select("*")
    .order("year", { ascending: true });

  if (error) {
    console.error("역사 데이터 불러오기 실패:", error);
    return;
  }

  console.log("Supabase 역사 데이터:", data);
}