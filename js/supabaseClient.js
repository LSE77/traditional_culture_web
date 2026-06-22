import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase 프로젝트 URL
const SUPABASE_URL = "https://xzjhwifmtixfrtoanwip.supabase.co";

// Supabase publishable key를 여기에 붙여넣기
const SUPABASE_KEY = "sb_publishable_YUqjNXZr2wPpb3EvdmEidw_4kbMo4la";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);