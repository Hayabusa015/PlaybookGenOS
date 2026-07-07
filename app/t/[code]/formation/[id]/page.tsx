"use client";

import { FormationEditor } from "@/components/formation-editor";
import { useParams } from "next/navigation";

export default function FormationPage() {
  const { code, id } = useParams<{ code: string; id: string }>();
  return (
    <main className="flex-1 px-4 py-6">
      <FormationEditor
        joinCode={decodeURIComponent(code).toUpperCase()}
        formationId={decodeURIComponent(id)}
      />
    </main>
  );
}
