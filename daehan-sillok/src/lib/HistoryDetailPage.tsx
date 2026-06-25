import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "./supabaseClient";

type HistoricalBookRow = {
  id: string;
  title: string;
  dynasty: string;
  description: string;
  cover_color?: string | null;
  accent_color?: string | null;
  sort_order?: number | null;
};

export default function HistoryDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [book, setBook] = useState<HistoricalBookRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadBook = async () => {
      if (!id) {
        setErrorMessage("잘못된 기록 주소입니다.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const { data, error } = await supabase
          .from("historical_books")
          .select("*")
          .eq("id", id)
          .single();

        if (error) {
          throw error;
        }

        setBook(data as HistoricalBookRow);
      } catch (error) {
        console.error("History detail load failed:", error);
        setBook(null);
        setErrorMessage("존재하지 않는 기록이거나 데이터를 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    };

    loadBook();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-[#D4AF37] font-serif">
        기록을 불러오는 중...
      </div>
    );
  }

  if (errorMessage || !book) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-[#D4AF37] font-serif">
        {errorMessage || "존재하지 않는 기록입니다."}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-[#F5F2ED]">
      <div className="border border-[#D4AF37]/25 bg-[#1E0402] p-8">
        <p className="text-xs text-[#D4AF37] font-serif mb-3">
          {book.dynasty}
        </p>

        <h1 className="text-3xl font-serif font-black text-[#F5F2ED] mb-6">
          {book.title}
        </h1>

        <p className="text-sm leading-relaxed font-serif text-[#DEC5AC]">
          {book.description}
        </p>
      </div>
    </div>
  );
}