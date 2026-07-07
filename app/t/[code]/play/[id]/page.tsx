"use client";

import { PlayEditor } from "@/components/play-editor";
import { useParams } from "next/navigation";

export default function PlayPage() {
  const { code, id } = useParams<{ code: string; id: string }>();
  return (
    <main className="flex-1 px-4 py-6">
      <PlayEditor
        joinCode={decodeURIComponent(code).toUpperCase()}
        playId={decodeURIComponent(id)}
      />
    </main>
  );
}
