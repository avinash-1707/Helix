import { Workspace } from "@/components/workspace";

// The whole experience is one client workspace: a conversation rail and
// a chat surface. Rendered from a thin server route so the document shell
// and fonts stream first.
export default function Page() {
  return <Workspace />;
}
