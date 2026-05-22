import { Landing } from "@/components/landing/landing";

// The marketing surface. A static server component — every animation is
// CSS-driven, so the page ships no client JavaScript. The product itself
// lives at /chat.
export default function Page() {
  return <Landing />;
}
