import Link from "next/link";
import type { ReactNode } from "react";

/* ============================================================
   Helix — landing page
   A static server component. Every motion here is CSS-driven
   (see globals.css, the `lp-*` rules), so the marketing surface
   ships no client JavaScript. The product lives at /chat.
   ============================================================ */

// ---- the helix mark -----------------------------------------------------

function HelixMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 22 32"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M6 1 C 17 6, 17 11, 6 16 C -5 21, -5 26, 6 31"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 1 C 5 6, 5 11, 16 16 C 27 21, 27 26, 16 31"
        stroke="var(--color-ink-dim)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line x1="7" y1="6" x2="15" y2="6" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="16" x2="15" y2="16" stroke="var(--color-ink-dim)" strokeWidth="2" strokeLinecap="round" />
      <line x1="7" y1="26" x2="15" y2="26" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ---- small shared pieces ------------------------------------------------

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-accent">
      <span className="h-px w-7 bg-accent/60" />
      {children}
    </div>
  );
}

// ---- data ---------------------------------------------------------------

const PROVIDERS = [
  "anthropic claude",
  "openai gpt-4.1",
  "google gemini",
  "deepseek",
  "grok",
  "mistral",
];

const STAGES = [
  { k: "01", t: "SDK", d: "Wraps the call. Measures latency, tokens, status — without delaying the stream." },
  { k: "02", t: "Redpanda", d: "One log event, emitted fire-and-forget to a Kafka-compatible bus." },
  { k: "03", t: "Ingestion", d: "Validates the payload with Zod, redacts PII, parses metadata." },
  { k: "04", t: "TimescaleDB", d: "Rows land in a hypertable partitioned on time, ready to query." },
  { k: "05", t: "Grafana", d: "Latency, throughput and error panels refresh within seconds." },
];

const FEATURES = [
  {
    n: "01",
    t: "One SDK, every provider",
    d: "A single LLMClient call shape. Anthropic, OpenAI and Gemini sit behind it — swap the model, not your code.",
  },
  {
    n: "02",
    t: "Zero latency on the response path",
    d: "Metadata is emitted fire-and-forget after the stream closes, with a 2s producer timeout. The user never waits on a log.",
  },
  {
    n: "03",
    t: "Streaming, end to end",
    d: "Token-by-token SSE to the browser. First-token latency is measured separately from total — you see both.",
  },
  {
    n: "04",
    t: "PII redaction, twice",
    d: "Email, phone, SSN and card patterns are scrubbed in the SDK, then again at ingestion. Raw text never reaches storage.",
  },
  {
    n: "05",
    t: "Built for time-series",
    d: "Inference logs land in a TimescaleDB hypertable — time-bucket rollups over millions of rows stay fast.",
  },
  {
    n: "06",
    t: "Dashboards you can trust",
    d: "Grafana panels for p50 / p95 / p99 latency, token throughput and error rate, broken down per provider.",
  },
];

const FEED = [
  { t: "08:41:22", code: 200, p: "claude", m: "claude-sonnet-4", ms: "1.21s", tok: 842 },
  { t: "08:41:21", code: 200, p: "gpt", m: "gpt-4.1", ms: "0.94s", tok: 511 },
  { t: "08:41:19", code: 200, p: "gemini", m: "gemini-2.5-pro", ms: "1.68s", tok: 1203 },
  { t: "08:41:17", code: 200, p: "claude", m: "claude-haiku-4", ms: "0.42s", tok: 196 },
  { t: "08:41:15", code: 429, p: "gpt", m: "gpt-4.1", ms: "—", tok: 0 },
  { t: "08:41:12", code: 200, p: "gemini", m: "gemini-2.5-flash", ms: "0.71s", tok: 388 },
  { t: "08:41:09", code: 200, p: "claude", m: "claude-sonnet-4", ms: "1.05s", tok: 674 },
  { t: "08:41:06", code: 200, p: "gpt", m: "gpt-4.1-mini", ms: "0.58s", tok: 240 },
];

const DOT: Record<string, string> = {
  claude: "bg-claude",
  gpt: "bg-gpt",
  gemini: "bg-gemini",
};

// ---- the live telemetry console (hero showpiece) ------------------------

function Console() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-border-hi bg-bg-elev shadow-2xl shadow-black/50">
      {/* scanline sweep */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-accent/[0.07] to-transparent lp-sweep" />

      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 rounded-full bg-accent lp-pulse" />
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-dim">
            stream · llm.inference.logs
          </span>
        </div>
        <span className="font-mono text-[11px] text-ink-faint">live</span>
      </div>

      {/* sparkline */}
      <div className="px-4 pt-4">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            p95 latency · 60s
          </span>
          <span className="font-mono text-[11px] text-accent">1.84s</span>
        </div>
        <svg viewBox="0 0 600 132" className="h-20 w-full" fill="none" aria-hidden>
          <defs>
            <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 96 L60 70 L120 104 L180 50 L240 80 L300 38 L360 90 L420 60 L480 110 L540 56 L600 44 L600 132 L0 132 Z"
            fill="url(#sparkfill)"
          />
          <path
            className="lp-spark"
            d="M0 96 L60 70 L120 104 L180 50 L240 80 L300 38 L360 90 L420 60 L480 110 L540 56 L600 44"
            stroke="var(--color-accent)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* metric tiles */}
      <div className="grid grid-cols-3 gap-px border-y border-border bg-border">
        {[
          { l: "tokens / min", v: "12.4k" },
          { l: "throughput", v: "47 rps" },
          { l: "error rate", v: "0.3%" },
        ].map((tile) => (
          <div key={tile.l} className="bg-bg-elev px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
              {tile.l}
            </div>
            <div className="mt-1 font-display text-xl text-ink">{tile.v}</div>
          </div>
        ))}
      </div>

      {/* scrolling log feed */}
      <div className="px-4 py-3">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          recent inferences
        </div>
        <div className="h-[168px] overflow-hidden [mask-image:linear-gradient(180deg,transparent,#000_14%,#000_86%,transparent)]">
          <div className="lp-feed">
            {[...FEED, ...FEED].map((r, i) => {
              const ok = r.code === 200;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 py-1 font-mono text-[12px]"
                >
                  <span className="text-ink-faint">{r.t}</span>
                  <span className={ok ? "text-positive" : "text-danger"}>
                    {r.code}
                  </span>
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[r.p]}`}
                  />
                  <span className="min-w-0 flex-1 truncate text-ink-dim">
                    {r.m}
                  </span>
                  <span className="text-ink-faint">{r.ms}</span>
                  <span className="w-16 text-right text-ink-dim">
                    {r.tok ? `${r.tok} tok` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- page ---------------------------------------------------------------

export function Landing() {
  return (
    <div className="min-h-dvh">
      {/* ---- nav ---- */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <HelixMark size={22} />
            <span className="font-display text-lg font-semibold tracking-tight">
              Helix
            </span>
          </Link>
          <div className="hidden items-center gap-8 font-mono text-[12px] uppercase tracking-[0.14em] text-ink-dim sm:flex">
            <a href="#pipeline" className="transition-colors hover:text-ink">
              Pipeline
            </a>
            <a href="#features" className="transition-colors hover:text-ink">
              Features
            </a>
            <a
              href="https://github.com/avinash-1707/Helix"
              className="transition-colors hover:text-ink"
            >
              Source
            </a>
          </div>
          <Link
            href="/chat"
            className="rounded-md bg-accent px-4 py-2 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-bg transition-colors hover:bg-accent-hi"
          >
            Open console
          </Link>
        </nav>
      </header>

      {/* ---- hero ---- */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="lp-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-6xl gap-14 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          {/* copy */}
          <div className="flex flex-col justify-center">
            <div className="lp-reveal" style={{ animationDelay: "0.05s" }}>
              <Eyebrow>LLM inference observability</Eyebrow>
            </div>
            <h1
              className="lp-reveal mt-6 font-display text-[clamp(2.7rem,6.5vw,4.9rem)] font-semibold leading-[0.98] tracking-[-0.025em]"
              style={{ animationDelay: "0.12s" }}
            >
              Every inference,
              <br />
              <span className="text-accent">on the record.</span>
            </h1>
            <p
              className="lp-reveal mt-6 max-w-md text-[15px] leading-[1.7] text-ink-dim"
              style={{ animationDelay: "0.2s" }}
            >
              Helix wraps your LLM calls in a featherweight SDK, streams the
              metadata to a real-time pipeline, and turns latency, tokens and
              errors into dashboards you can actually trust — without adding a
              millisecond to the user&apos;s response.
            </p>
            <div
              className="lp-reveal mt-9 flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.28s" }}
            >
              <Link
                href="/chat"
                className="rounded-md bg-accent px-6 py-3 font-mono text-[13px] font-medium uppercase tracking-[0.12em] text-bg transition-colors hover:bg-accent-hi"
              >
                Open the console
              </Link>
              <a
                href="#pipeline"
                className="rounded-md border border-border-hi px-6 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-ink-dim transition-colors hover:border-ink-faint hover:text-ink"
              >
                See the pipeline
              </a>
            </div>
            {/* spec strip */}
            <div
              className="lp-reveal mt-12 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border"
              style={{ animationDelay: "0.36s" }}
            >
              {[
                { v: "3", l: "providers" },
                { v: "0 ms", l: "blocking" },
                { v: "1", l: "cmd to boot" },
              ].map((s) => (
                <div key={s.l} className="bg-bg px-4 py-3">
                  <div className="font-display text-2xl font-semibold text-ink">
                    {s.v}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* console */}
          <div
            className="lp-reveal flex items-center"
            style={{ animationDelay: "0.32s" }}
          >
            <div className="w-full">
              <Console />
            </div>
          </div>
        </div>
      </section>

      {/* ---- provider ticker ---- */}
      <section className="overflow-hidden border-b border-border py-5">
        <div className="flex w-max lp-ticker">
          {[...PROVIDERS, ...PROVIDERS].map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-8 px-8 font-mono text-[13px] uppercase tracking-[0.18em] text-ink-faint"
            >
              <span className="h-1 w-1 rounded-full bg-accent" />
              {p}
            </div>
          ))}
        </div>
      </section>

      {/* ---- pipeline ---- */}
      <section
        id="pipeline"
        className="mx-auto max-w-6xl scroll-mt-20 px-6 py-24"
      >
        <Eyebrow>The path of one log line</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
          From a model call to a dashboard, in five stops.
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-[1.7] text-ink-dim">
          The response path and the logging path never touch. Your user gets
          their tokens; the telemetry takes the scenic route.
        </p>

        <div className="relative mt-14">
          {/* connecting rail */}
          <div className="absolute left-0 right-0 top-5 hidden h-px bg-border lg:block" />
          <ol className="grid gap-5 lg:grid-cols-5">
            {STAGES.map((s) => (
              <li key={s.k} className="relative">
                <div className="mb-5 hidden lg:block">
                  <span className="relative z-10 block h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-bg" />
                </div>
                <div className="h-full rounded-md border border-border bg-surface p-5 transition-colors hover:border-border-hi">
                  <div className="font-mono text-[11px] tracking-[0.14em] text-accent">
                    {s.k}
                  </div>
                  <div className="mt-2 font-display text-lg font-semibold text-ink">
                    {s.t}
                  </div>
                  <p className="mt-2 text-[13px] leading-[1.6] text-ink-dim">
                    {s.d}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---- features ---- */}
      <section
        id="features"
        className="scroll-mt-20 border-y border-border bg-bg-elev"
      >
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Eyebrow>What you get</Eyebrow>
          <h2 className="mt-5 max-w-2xl font-display text-[clamp(1.9rem,4vw,3rem)] font-semibold leading-[1.05] tracking-[-0.02em]">
            An observability layer that earns its place.
          </h2>

          <div className="mt-14 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.n}
                className="group flex flex-col gap-3 bg-bg-elev p-7 transition-colors hover:bg-surface"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[12px] tracking-[0.14em] text-ink-faint">
                    {f.n}
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-border-hi transition-colors group-hover:bg-accent" />
                </div>
                <h3 className="font-display text-lg font-semibold leading-snug text-ink">
                  {f.t}
                </h3>
                <p className="text-[13px] leading-[1.65] text-ink-dim">{f.d}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---- closing cta ---- */}
      <section className="relative overflow-hidden">
        <div className="lp-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-3xl px-6 py-28 text-center">
          <div className="mx-auto flex w-fit">
            <HelixMark size={34} />
          </div>
          <h2 className="mt-7 font-display text-[clamp(2.1rem,5vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.025em]">
            Stop guessing what your
            <br />
            LLM app is <span className="text-accent">doing.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-[1.7] text-ink-dim">
            Spin up the whole stack with one command, open the console, and
            watch the telemetry land.
          </p>
          <Link
            href="/chat"
            className="mt-9 inline-block rounded-md bg-accent px-7 py-3.5 font-mono text-[13px] font-medium uppercase tracking-[0.12em] text-bg transition-colors hover:bg-accent-hi"
          >
            Open the console
          </Link>
        </div>
      </section>

      {/* ---- footer ---- */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <HelixMark size={18} />
            <span className="font-display text-sm font-semibold">Helix</span>
            <span className="font-mono text-[11px] text-ink-faint">
              · LLM inference observability
            </span>
          </div>
          <div className="flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            <a
              href="https://github.com/avinash-1707/Helix"
              className="transition-colors hover:text-ink-dim"
            >
              GitHub
            </a>
            <Link href="/chat" className="transition-colors hover:text-ink-dim">
              Console
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
