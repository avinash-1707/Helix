import type { ReactNode } from "react";
import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
} from "next/font/google";
import { QueryProvider } from "./providers";
import "./globals.css";

// Display grotesque — the wordmark and headlines. Bricolage has a
// mechanical, slightly optical character that suits an instrument.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

// Body — IBM Plex Sans. Technical heritage, reads as a control panel.
const sans = IBM_Plex_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-plex",
  display: "swap",
});

// Mono — timestamps, labels, telemetry. Anything that is an instrument.
const mono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Helix — LLM inference observability",
  description:
    "A featherweight SDK and real-time pipeline that put every LLM inference on the record — latency, tokens, and errors you can trust.",
};

export const viewport = {
  themeColor: "#0a0c0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
