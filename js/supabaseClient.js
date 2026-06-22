import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "sb_publishable_YUqjNXZr2wPpb3EvdmEidw_4kbMo4la";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6amh3aWZtdGl4ZnJ0b2Fud2lwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwOTM3NTYsImV4cCI6MjA5NzY2OTc1Nn0.W7Aysc7_YrMons2VBdfc7JaaF3-JHn-ypYMWD--0lGQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);