import type { Metadata } from "next";
import { Workspace } from "@/components/workspace";

export const metadata: Metadata = {
  title: "Console — Helix",
  description: "A calm place to talk with leading AI models.",
};

// The console: one client workspace — a conversation rail and a chat
// surface. Rendered from a thin server route so the document shell and
// fonts stream first.
export default function ChatPage() {
  return <Workspace />;
}
