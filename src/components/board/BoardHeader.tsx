"use client";

import { useEffect, useRef, useState } from "react";

function setTheme(theme: "nord" | "light") {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("tt.theme", theme);
  } catch {}
}

function getTheme(): "nord" | "light" {
  const t = document.documentElement.dataset.theme;
  return t === "light" ? "light" : "nord";
}

export default function BoardHeader() {
  const [open, setOpen] = useState(false);
  const [theme, setThemeState] = useState<"nord" | "light">("nord");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setThemeState(getTheme());
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg0)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1800px] items-center justify-between px-4 py-3">
        <div className="flex items-baseline gap-3">
          <h1 className="text-lg font-semibold tracking-tight text-[var(--text0)]">TaskTracker</h1>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-md border border-[var(--border)] bg-[var(--bg1)] px-3 py-1.5 text-sm text-[var(--text0)] hover:bg-[var(--bg2)]"
            title="Settings"
          >
            ⚙
          </button>

          {open ? (
            <div className="absolute right-0 top-11 z-20 w-56 rounded-md border border-[var(--border)] bg-[var(--bg1)] p-2 shadow-xl">
              <div className="px-2 py-1 text-xs font-medium text-[var(--text2)]">Theme</div>
              <div className="mt-1 grid gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTheme("nord");
                    setThemeState("nord");
                    setOpen(false);
                  }}
                  className={`rounded px-2 py-1 text-left text-sm text-[var(--text0)] hover:bg-[var(--bg2)] ${
                    theme === "nord" ? "bg-[var(--bg2)]" : ""
                  }`}
                >
                  Nord (dark)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTheme("light");
                    setThemeState("light");
                    setOpen(false);
                  }}
                  className={`rounded px-2 py-1 text-left text-sm text-[var(--text0)] hover:bg-[var(--bg2)] ${
                    theme === "light" ? "bg-[var(--bg2)]" : ""
                  }`}
                >
                  Light
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
