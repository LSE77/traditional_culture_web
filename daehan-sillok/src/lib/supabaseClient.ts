import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase 환경변수가 없습니다. .env 또는 .env.local 파일을 확인하세요.");
  console.error("VITE_SUPABASE_URL:", supabaseUrl);
  console.error("VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "있음" : "없음");

  throw new Error(
    "Supabase 환경변수가 설정되지 않았습니다. 대한실록/.env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 넣어주세요."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

