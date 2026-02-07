import BoardClient from "./BoardClient";
import BoardHeader from "./BoardHeader";

export default function BoardPage() {
  return (
    <div className="min-h-screen bg-[var(--bg0)] text-[var(--text0)]">
      <BoardHeader />

      <main className="mx-auto max-w-[1800px] px-4 py-4">
        <BoardClient />
      </main>
    </div>
  );
}
