"use client";

import dynamic from "next/dynamic";

const EditorPage = dynamic(
  () => import("@/components/editor/editor-page").then((m) => m.EditorPage),
  { ssr: false },
);

export default function Home() {
  return <EditorPage />;
}
