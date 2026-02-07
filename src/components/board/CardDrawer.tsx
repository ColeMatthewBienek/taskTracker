"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";
import { Priority } from "@prisma/client";
import type { CardDTO } from "@/server/types";
import {
  createCardComment,
  fetchCardActivity,
  fetchCardComments,
  setCardArchived,
  updateCard,
  updateCardComment,
} from "./api";
import { useBoardStore } from "./state";

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function formatValue(v: any): string {
  if (v === null || v === undefined) return String(v);
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function toDatetimeLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  // YYYY-MM-DDTHH:MM
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDueShort(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function CardDrawer(props: { cardId: string | null; onClose: () => void }) {
  const { cardId } = props;
  const { board, upsertCardLocal } = useBoardStore();
  const [activity, setActivity] = useState<any[] | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<Record<string, boolean>>({});

  const [comments, setComments] = useState<any[] | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSort, setCommentSort] = useState<"asc" | "desc">("asc");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTagsArr, setEditTagsArr] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>(Priority.MEDIUM);
  const [editDueDate, setEditDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const card = useMemo(() => {
    if (!board || !cardId) return null;
    for (const col of board.columns) {
      const c = col.cards.find((x) => x.id === cardId);
      if (c) return c;
    }
    return null;
  }, [board, cardId]);

  const allTags = useMemo(() => {
    if (!board) return [] as string[];
    const s = new Set<string>();
    for (const col of board.columns) {
      for (const c of col.cards) {
        for (const t of c.tags || []) s.add(t);
      }
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [board]);

  const dirty = useMemo(() => {
    if (!card) return false;

    const dueIso = editDueDate ? new Date(editDueDate).toISOString() : null;

    const a = {
      title: editTitle.trim(),
      description: editDescription ?? "",
      tags: [...editTagsArr].sort(),
      priority: editPriority,
      dueDate: dueIso,
    };

    const b = {
      title: card.title,
      description: card.description ?? "",
      tags: [...(card.tags ?? [])].sort(),
      priority: card.priority,
      dueDate: card.dueDate,
    };

    return JSON.stringify(a) !== JSON.stringify(b);
  }, [card, editTitle, editDescription, editTagsArr, editPriority, editDueDate]);

  const tagSuggestions = useMemo(() => {
    const q = tagDraft.trim().toLowerCase();
    if (!q) return [] as string[];
    const have = new Set(editTagsArr.map((t) => t.toLowerCase()));
    return allTags
      .filter((t) => !have.has(t.toLowerCase()))
      .filter((t) => t.toLowerCase().includes(q))
      .slice(0, 8);
  }, [tagDraft, editTagsArr, allTags]);

  useEffect(() => {
    if (!cardId) {
      setActivity(null);
      setComments(null);
      setCommentDraft("");
      setCommentSort("asc");
      setEditingCommentId(null);
      setEditingCommentBody("");
      setSaveError(null);
      return;
    }

    fetchCardActivity(cardId)
      .then(setActivity)
      .catch(() => setActivity([]));

    fetchCardComments(cardId, "asc")
      .then(setComments)
      .catch(() => setComments([]));
  }, [cardId]);

  // Initialize edit fields when card changes
  useEffect(() => {
    if (!card) return;
    setEditTitle(card.title);
    setEditDescription(card.description ?? "");
    setEditTagsArr(card.tags ?? []);
    setTagDraft("");
    setEditPriority(card.priority as Priority);
    setEditDueDate(toDatetimeLocal(card.dueDate));
    setSaveError(null);
  }, [cardId, card]);

  async function toggleArchived() {
    if (!card) return;
    const updated = await setCardArchived(card.id, !card.archived);
    upsertCardLocal(updated);
    const acts = await fetchCardActivity(card.id);
    setActivity(acts);
  }

  async function saveEdits() {
    if (!card) return;
    setSaving(true);
    setSaveError(null);
    try {
      const tags = editTagsArr;
      const dueDateIso = editDueDate ? new Date(editDueDate).toISOString() : null;

      const updated = await updateCard({
        id: card.id,
        title: editTitle.trim(),
        description: editDescription,
        tags,
        priority: editPriority,
        dueDate: dueDateIso,
      });

      upsertCardLocal(updated);
      const acts = await fetchCardActivity(card.id);
      setActivity(acts);
    } catch (e: any) {
      setSaveError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function refreshComments(order: "asc" | "desc" = commentSort) {
    if (!card) return;
    setCommentSort(order);
    try {
      const list = await fetchCardComments(card.id, order);
      setComments(list);
    } catch {
      setComments([]);
    }
  }

  async function addComment() {
    if (!card) return;
    const body = commentDraft.trim();
    if (!body) return;
    setSaving(true);
    setSaveError(null);
    try {
      await createCardComment(card.id, body);
      setCommentDraft("");
      await refreshComments(commentSort);
    } catch (e: any) {
      setSaveError(e?.message ?? "Failed to add comment");
    } finally {
      setSaving(false);
    }
  }

  async function saveCommentEdit() {
    if (!card || !editingCommentId) return;
    const body = editingCommentBody.trim();
    if (!body) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateCardComment(card.id, editingCommentId, body);
      setEditingCommentId(null);
      setEditingCommentBody("");
      await refreshComments(commentSort);
    } catch (e: any) {
      setSaveError(e?.message ?? "Failed to update comment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={!!cardId} onOpenChange={(open) => (!open ? props.onClose() : null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content
          className="fixed right-0 top-0 h-full w-full max-w-xl border-l border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
          onKeyDown={(e) => {
            const isSave = (e.ctrlKey || e.metaKey) && e.key === "Enter";
            if (isSave) {
              e.preventDefault();
              if (!saving && dirty && editTitle.trim()) saveEdits();
            }
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-lg font-semibold">
                {card?.title ?? "Card"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-zinc-400">
                {card ? "Card details" : ""}
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-md border border-zinc-800 px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-900">
              Close
            </Dialog.Close>
          </div>

          {card ? (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="grid gap-3">
                  <div>
                    <div className="text-xs font-medium text-zinc-300">Title</div>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="mt-2 h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm outline-none"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-medium text-zinc-300">Description</div>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={5}
                      className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none"
                      placeholder="Details…"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-medium text-zinc-300">Priority</div>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as Priority)}
                        className="mt-2 h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm"
                      >
                        <option value={Priority.LOW}>LOW</option>
                        <option value={Priority.MEDIUM}>MEDIUM</option>
                        <option value={Priority.HIGH}>HIGH</option>
                        <option value={Priority.URGENT}>URGENT</option>
                      </select>
                    </div>

                    <div>
                      <div className="text-xs font-medium text-zinc-300">Due date</div>
                      <input
                        type="datetime-local"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="mt-2 h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-zinc-300">Tags</div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {editTagsArr.length === 0 ? (
                        <span className="text-xs text-zinc-500">(none)</span>
                      ) : null}
                      {editTagsArr.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEditTagsArr((arr) => arr.filter((x) => x !== t))}
                          className="group flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-700"
                          title="Click to remove"
                        >
                          <span>{t}</span>
                          <span className="text-zinc-400 group-hover:text-zinc-200">×</span>
                        </button>
                      ))}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = tagDraft.trim();
                        if (!v) return;
                        setEditTagsArr((arr) => (arr.includes(v) ? arr : [...arr, v]));
                        setTagDraft("");
                      }}
                      className="mt-2 flex items-center gap-2"
                    >
                      <input
                        value={tagDraft}
                        onChange={(e) => setTagDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === ",") {
                            e.preventDefault();
                            const v = tagDraft.trim();
                            if (!v) return;
                            setEditTagsArr((arr) => (arr.includes(v) ? arr : [...arr, v]));
                            setTagDraft("");
                          }
                        }}
                        className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm outline-none"
                        placeholder="Add a tag… (Enter or comma)"
                      />
                      <button
                        type="submit"
                        className="h-9 shrink-0 rounded-md border border-zinc-800 px-3 text-xs text-zinc-200 hover:bg-zinc-900"
                      >
                        Add
                      </button>
                    </form>

                    {tagSuggestions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {tagSuggestions.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => {
                              setEditTagsArr((arr) => (arr.includes(t) ? arr : [...arr, t]));
                              setTagDraft("");
                            }}
                            className="rounded bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  {saveError ? <div className="text-xs text-red-400">{saveError}</div> : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={saveEdits}
                      disabled={saving || !editTitle.trim() || !dirty}
                      className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
                      title="Ctrl/Cmd + Enter"
                    >
                      {saving ? "Saving…" : dirty ? "Save" : "Saved"}
                    </button>

                    {dirty ? <span className="text-xs text-zinc-400">Unsaved changes</span> : null}

                    <button
                      onClick={toggleArchived}
                      className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-100 hover:bg-zinc-900"
                    >
                      {card.archived ? "Unarchive" : "Archive"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-zinc-300">Comments</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => refreshComments(commentSort === "asc" ? "desc" : "asc")}
                      className="rounded border border-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-900"
                    >
                      {commentSort === "asc" ? "Oldest → Newest" : "Newest → Oldest"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCommentDraft((d) => (d ? d + " 😀" : "😀"))}
                      className="rounded border border-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-900"
                      title="Insert emoji"
                    >
                      +😀
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  {comments === null ? (
                    <div className="text-xs text-zinc-500">Loading…</div>
                  ) : comments.length === 0 ? (
                    <div className="text-xs text-zinc-500">No comments yet.</div>
                  ) : (
                    comments.map((c) => {
                      const isEditing = editingCommentId === c.id;
                      return (
                        <div
                          key={c.id}
                          className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2 py-2"
                        >
                          <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
                            <span className="min-w-0 truncate">
                              <span className="text-zinc-200">{c.author}</span> · {new Date(c.createdAt).toLocaleString()}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingCommentId(null);
                                  setEditingCommentBody("");
                                } else {
                                  setEditingCommentId(c.id);
                                  setEditingCommentBody(c.body ?? "");
                                }
                              }}
                              className="rounded border border-zinc-800 px-2 py-0.5 text-[10px] text-zinc-200 hover:bg-zinc-900"
                            >
                              {isEditing ? "Cancel" : "Edit"}
                            </button>
                          </div>

                          {isEditing ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={editingCommentBody}
                                onChange={(e) => setEditingCommentBody(e.target.value)}
                                rows={3}
                                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={saveCommentEdit}
                                  disabled={saving || !editingCommentBody.trim()}
                                  className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{c.body}</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-3">
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none"
                    placeholder="Add a comment…"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addComment}
                      disabled={saving || !commentDraft.trim()}
                      className="rounded-md bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
                    >
                      Add comment
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-3">
                <div className="text-xs font-medium text-zinc-300">Activity</div>
                <div className="mt-2 space-y-2">
                  {activity === null ? (
                    <div className="text-xs text-zinc-500">Loading…</div>
                  ) : activity.length === 0 ? (
                    <div className="text-xs text-zinc-500">No activity yet.</div>
                  ) : (
                    activity.map((a) => {
                      const isEdited = a.type === "EDITED";
                      const isMoved = a.type === "MOVED";
                      const isCreated = a.type === "CREATED";
                      const isArchived = a.type === "ARCHIVED";
                      const isUnarchived = a.type === "UNARCHIVED";

                      const expanded = !!expandedActivity[a.id];

                      const changed = isEdited ? (a.before ?? {}) : null;
                      const changedEntries = isEdited
                        ? (Object.entries(changed) as Array<[string, any]>)
                        : [];

                      const fromColId = isMoved ? a.before?.columnId : null;
                      const toColId = isMoved ? a.after?.columnId : null;
                      const fromColName = fromColId
                        ? board?.columns.find((c) => c.id === fromColId)?.name ?? fromColId
                        : null;
                      const toColName = toColId
                        ? board?.columns.find((c) => c.id === toColId)?.name ?? toColId
                        : null;

                      const created = isCreated ? (a.after ?? {}) : null;

                      return (
                        <div
                          key={a.id}
                          className="rounded-md border border-zinc-800 bg-zinc-950/40 px-2 py-2"
                        >
                          <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
                            <span className="min-w-0 truncate">
                              <span className="text-zinc-200">{a.actor}</span> · {a.type}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="shrink-0">{new Date(a.timestamp).toLocaleString()}</span>
                              {!isEdited && !isMoved && !isCreated && !isArchived && !isUnarchived ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedActivity((m) => ({ ...m, [a.id]: !m[a.id] }))
                                  }
                                  className="rounded border border-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-200 hover:bg-zinc-900"
                                >
                                  {expanded ? "Hide" : "Details"}
                                </button>
                              ) : null}
                            </div>
                          </div>

                          {isEdited ? (
                            changedEntries.length === 0 ? (
                              <div className="mt-2 text-xs text-zinc-500">(no field changes)</div>
                            ) : (
                              <div className="mt-2 space-y-1">
                                {changedEntries.map(([k, v]) => (
                                  <div key={k} className="text-xs text-zinc-300">
                                    <span className="text-zinc-200">{k}</span>: {formatValue(v?.before)} → {formatValue(v?.after)}
                                  </div>
                                ))}
                              </div>
                            )
                          ) : isMoved ? (
                            <div className="mt-2 text-xs text-zinc-300">
                              Moved: <span className="text-zinc-200">{fromColName}</span> →{" "}
                              <span className="text-zinc-200">{toColName}</span>
                            </div>
                          ) : isCreated ? (
                            <div className="mt-2 space-y-1 text-xs text-zinc-300">
                              <div>
                                <span className="text-zinc-200">Title</span>: {formatValue(created?.title)}
                              </div>
                              <div>
                                <span className="text-zinc-200">Priority</span>: {formatValue(created?.priority)}
                              </div>
                              {asArray(created?.tags).length > 0 ? (
                                <div>
                                  <span className="text-zinc-200">Tags</span>: {asArray(created?.tags).join(", ")}
                                </div>
                              ) : null}
                              {created?.dueDate ? (
                                <div>
                                  <span className="text-zinc-200">Due</span>: {formatDueShort(created?.dueDate)}
                                </div>
                              ) : null}
                            </div>
                          ) : isArchived ? (
                            <div className="mt-2 text-xs text-zinc-300">Archived</div>
                          ) : isUnarchived ? (
                            <div className="mt-2 text-xs text-zinc-300">Unarchived</div>
                          ) : expanded ? (
                            <>
                              {a.before ? (
                                <pre className="mt-2 max-h-40 overflow-auto text-[11px] text-zinc-300">
{JSON.stringify(a.before, null, 2)}
                                </pre>
                              ) : null}
                              {a.after ? (
                                <pre className="mt-2 max-h-40 overflow-auto text-[11px] text-zinc-300">
{JSON.stringify(a.after, null, 2)}
                                </pre>
                              ) : null}
                            </>
                          ) : (
                            <div className="mt-2 text-xs text-zinc-500">(details hidden)</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 text-sm text-zinc-400">No card selected.</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
