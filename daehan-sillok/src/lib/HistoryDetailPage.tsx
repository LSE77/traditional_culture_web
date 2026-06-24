import { useParams } from "react-router-dom";
import { HISTORICAL_BOOKS } from "../data/history/book";

export default function HistoryDetailPage() {
  const { id } = useParams();

  const book = HISTORICAL_BOOKS.find(
    (book) => book.id === id
  );

  if (!book) {
    return <div>존재하지 않는 기록입니다.</div>;
  }

  return (
    <div>
      <h1>{book.title}</h1>
      <p>{book.description}</p>
    </div>
  );
}