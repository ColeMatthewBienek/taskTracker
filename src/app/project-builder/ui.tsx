"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchBoard } from "@/components/board/api";

type SaveResponse = {
  project: any;
  spec: any;
};

export default function ProjectBuilderClient() {
  const [boardId, setBoardId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [keyPrefix, setKeyPrefix] = useState("");
  const [description, setDescription] = useState("");
  const [markdown, setMarkdown] = useState("");

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoard()
      .then((b) => setBoardId(b.id))
      .catch(() => setBoardId(null));
  }, []);

  const canSave = useMemo(() => {
    return !!boardId && !!name.trim() && !!keyPrefix.trim();
  }, [boardId, name, keyPrefix]);

  async function save(mode: "draft" | "save") {
    if (!boardId) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/project-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardId,
          name: name.trim(),
          keyPrefix: keyPrefix.trim(),
          description,
          markdown,
          mode,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Failed");
      }
      const data = (await res.json()) as SaveResponse;
      setStatus(mode === "draft" ? "Draft saved" : "Saved");
      // if saved, normalize returned values
      setName(data.project.name);
      setKeyPrefix(data.project.keyPrefix);
      setDescription(data.project.description ?? "");
      setMarkdown(data.spec.markdown ?? "");
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg1)] p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-[var(--text2)]">Project name *</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm outline-none"
              placeholder="TaskTracker"
            />
          </div>
          <div>
            <div className="text-xs font-medium text-[var(--text2)]">Key prefix *</div>
            <input
              value={keyPrefix}
              onChange={(e) => setKeyPrefix(e.target.value.toUpperCase())}
              className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm outline-none"
              placeholder="TASK"
            />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-medium text-[var(--text2)]">Description</div>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 text-sm outline-none"
              placeholder="One-liner about the project"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium text-[var(--text2)]">Spec (Markdown)</div>
          </div>
          <textarea
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            rows={14}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm outline-none"
            placeholder="# Problem\n\n# Goals\n\n# Requirements\n"
          />
        </div>

        {error ? <div className="mt-3 text-sm text-red-300">{error}</div> : null}
        {status ? <div className="mt-3 text-sm text-emerald-300">{status}</div> : null}

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={!boardId || saving}
            className="rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text0)] hover:bg-[var(--bg1)] disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            onClick={() => save("save")}
            disabled={!canSave || saving}
            className="rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm font-medium text-[var(--text0)] hover:bg-[var(--bg1)] disabled:opacity-50"
          >
            Save
          </button>
        </div>

        <div className="mt-2 text-xs text-[var(--text2)]">
          * Required fields: project name + key prefix.
        </div>
      </div>
    </div>
  );
}
