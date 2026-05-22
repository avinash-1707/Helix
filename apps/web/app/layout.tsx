import type { ReactNode } from "react";

export const metadata = {
  title: "Helix",
  description: "Full-stack LLM observability platform",
};

// Build-order step 7: app shell (sidebar + conversation panel),
// design tokens in globals.css, fonts, TanStack Query provider.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
