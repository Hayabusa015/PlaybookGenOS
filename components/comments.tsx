"use client";

import { getCoachName, rpc, setCoachName } from "@/lib/api";
import type { PlayComment } from "@/lib/types";
import { btnPrimary, input } from "@/lib/ui";
import { useEffect, useState } from "react";

export function Comments({
  code,
  playId,
  comments,
  onAdded,
}: {
  code: string;
  playId: string;
  comments: PlayComment[];
  onAdded: (c: PlayComment) => void;
}) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setName(getCoachName()), []);

  const submit = async () => {
    if (!body.trim()) return;
    setBusy(true);
    setError("");
    try {
      setCoachName(name);
      const { comment } = await rpc<{ comment: PlayComment }>("addComment", {
        code,
        playId,
        coachName: name,
        body,
      });
      setBody("");
      onAdded(comment);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post");
    }
    setBusy(false);
  };

  const mine = comments
    .filter((c) => c.playId === playId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-neutral-400">
        Suggestions ({mine.length})
      </h3>
      <ul className="mb-3 space-y-2">
        {mine.map((c) => (
          <li key={c.id} className="rounded-lg bg-neutral-800/70 p-2.5 text-sm">
            <span className="font-bold text-amber-400">{c.coachName}</span>{" "}
            <span className="text-xs text-neutral-500">
              {new Date(c.createdAt).toLocaleDateString()}
            </span>
            <p className="mt-0.5 whitespace-pre-wrap text-neutral-200">{c.body}</p>
          </li>
        ))}
        {mine.length === 0 && (
          <li className="text-sm text-neutral-500">
            No suggestions yet — leave the first one.
          </li>
        )}
      </ul>
      <div className="flex flex-col gap-2">
        <input
          className={`${input} text-sm`}
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className={`${input} h-20 resize-none text-sm`}
          placeholder="e.g. Against a 3-3 stack, have the TE stay in to block…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button
          className={`${btnPrimary} self-start text-sm`}
          onClick={submit}
          disabled={busy || !body.trim()}
        >
          {busy ? "Posting…" : "Post suggestion"}
        </button>
      </div>
    </div>
  );
}
