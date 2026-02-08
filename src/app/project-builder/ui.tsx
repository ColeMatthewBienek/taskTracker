"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchBoard } from "@/components/board/api";

type ProjectWithSpec = {
  id: string;
  boardId: string;
  name: string;
  keyPrefix: string;
  description: string;
  spec: null | {
    id: string;
    projectId: string;
    markdown: string;
    status: "DRAFT" | "SAVED";
    createdAt: string;
    updatedAt: string;
  };
};

type SaveResponse = {
  project: any;
  spec: any;
};

export default function ProjectBuilderClient() {
  const [boardId, setBoardId] = useState<string | null>(null);

  const [projects, setProjects] = useState<ProjectWithSpec[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const [projectId, setProjectId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [keyPrefix, setKeyPrefix] = useState("");
  const [description, setDescription] = useState("");
  const [markdown, setMarkdown] = useState("");

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProjects(bid: string) {
    setProjectsLoading(true);
    try {
      const res = await fetch(`/api/project-builder?boardId=${encodeURIComponent(bid)}`);
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { projects: ProjectWithSpec[] };
      setProjects(data.projects ?? []);
    } finally {
      setProjectsLoading(false);
    }
  }

  useEffect(() => {
    fetchBoard()
      .then((b) => {
        setBoardId(b.id);
        loadProjects(b.id).catch(() => {});
      })
      .catch(() => setBoardId(null));
  }, []);

  const canSave = useMemo(() => {
    return !!boardId && !!name.trim() && !!keyPrefix.trim();
  }, [boardId, name, keyPrefix]);

  function applyProject(p: ProjectWithSpec | null) {
    if (!p) {
      setProjectId(null);
      setName("");
      setKeyPrefix("");
      setDescription("");
      setMarkdown("");
      setStatus(null);
      setError(null);
      return;
    }

    setProjectId(p.id);
    setName(p.name ?? "");
    setKeyPrefix(p.keyPrefix ?? "");
    setDescription(p.description ?? "");
    setMarkdown(p.spec?.markdown ?? "");
    setStatus(null);
    setError(null);
  }

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
          projectId: projectId ?? undefined,
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
      // normalize returned values
      setProjectId(data.project.id);
      setName(data.project.name);
      setKeyPrefix(data.project.keyPrefix);
      setDescription(data.project.description ?? "");
      setMarkdown(data.spec.markdown ?? "");

      // refresh list so you can re-load immediately
      await loadProjects(boardId);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg1)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-xs font-medium text-[var(--text2)]">Load project</div>
            <select
              value={projectId ?? ""}
              disabled={!boardId || projectsLoading}
              onChange={(e) => {
                const id = e.target.value || null;
                const p = id ? projects.find((x) => x.id === id) ?? null : null;
                applyProject(p);
              }}
              className="mt-1 h-9 w-[320px] max-w-full rounded-md border border-[var(--border)] bg-[var(--bg2)] px-2 text-sm outline-none disabled:opacity-50"
            >
              <option value="">(New project)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.keyPrefix} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              if (boardId) loadProjects(boardId).catch(() => {});
            }}
            disabled={!boardId || projectsLoading}
            className="rounded-md border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 text-sm text-[var(--text0)] hover:bg-[var(--bg1)] disabled:opacity-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
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
            placeholder={`# Problem\n\n# Goals\n\n# Requirements\n`}
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

        <div className="mt-2 text-xs text-[var(--text2)]">* Required fields: project name + key prefix.</div>
      </div>
    </div>
  );
}
