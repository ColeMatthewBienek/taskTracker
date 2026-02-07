import BoardClient from "./BoardClient";

export default function BoardPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight">TaskTracker</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-4 py-4">
        <BoardClient />
      </main>
    </div>
  );
}
