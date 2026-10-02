import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

const CODE_LINES = [
  { cls: "code-comment", text: "// AI RepoSense" },
  { cls: "code-key", text: 'project.connect("github.com/you/app")' },
  { cls: "", text: "" },
  { cls: "code-ok", text: "→ reading files.............. done" },
  { cls: "code-ok", text: "→ detecting framework........ Next.js" },
  { cls: "code-ok", text: "→ creating code knowledge.... 148 chunks" },
  { cls: "code-ok", text: "→ running analysis........... ok" },
  { cls: "code-ok", text: "→ generating report.......... ready" },
  { cls: "", text: "" },
  { cls: "code-key", text: "health.score = 82" },
  { cls: "code-key", text: "issues.critical = 1" },
  { cls: "code-key", text: 'ask("Explain the auth flow")' },
  { cls: "", text: "" },
];

const FLOW = [
  {
    step: "01",
    title: "Connect a repository",
    text: "Link GitHub or upload a ZIP. We filter noise and keep the source that matters.",
  },
  {
    step: "02",
    title: "Build code knowledge",
    text: "Tree-sitter chunks your JS/TS, embeddings land in a vector store, ready for retrieval.",
  },
  {
    step: "03",
    title: "Ask, review, improve",
    text: "Chat with citations, scan a health report, and walk a priority roadmap of issues.",
  },
];

const OUTCOMES = [
  {
    title: "Health report",
    text: "Architecture, security, performance, quality, and testing — scored clearly.",
  },
  {
    title: "Grounded chat",
    text: "Answers cite real files and line ranges from your project, not generic advice.",
  },
  {
    title: "Issues & roadmap",
    text: "Filter findings by severity and category, then tackle what matters first.",
  },
];

const NAV_LINKS = [
  { href: "#why", label: "Why" },
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#demo", label: "Demo" },
];

function CodePlane() {
  const lines = [...CODE_LINES, ...CODE_LINES, ...CODE_LINES];
  return (
    <div
      className="landing-code-plane landing-reveal landing-reveal-delay-2"
      aria-hidden
    >
      <div className="landing-code-fade" />
      <pre>
        {lines.map((line, index) => (
          <span key={`${line.text}-${index}`} className={line.cls || undefined}>
            {line.text}
            {"\n"}
          </span>
        ))}
      </pre>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="landing-shell">
      <section id="top" className="landing-hero">
        <div className="landing-hero-glow" aria-hidden />

        <div className="relative z-40 mx-auto w-full max-w-6xl px-6 pt-6 sm:px-10">
          <header className="landing-header landing-reveal flex items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:gap-4 sm:px-5">
            <a
              href="#top"
              className="landing-brand shrink-0 text-sm text-(--landing-ink)"
            >
            AI RepoSense
            </a>
            <nav
              aria-label="Landing sections"
              className="hidden items-center gap-1 md:flex lg:gap-2"
            >
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="landing-nav-link"
                >
                  {link.label}
                </a>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-2 text-sm sm:gap-3">
              <ThemeToggle className="border-(--landing-line) bg-transparent hover:bg-(--landing-fog)" />
              <Link
                href="/login"
                className="text-(--landing-muted) transition-colors hover:text-(--landing-ink)"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-(--landing-ink) px-3.5 py-2 font-medium text-(--landing-paper) transition-opacity hover:opacity-90"
              >
                Get started
              </Link>
            </div>
          </header>
        </div>

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-5.5rem)] w-full max-w-6xl items-center gap-10 px-6 pb-16 pt-10 sm:px-10 md:grid-cols-[1.05fr_0.95fr] md:gap-12 lg:gap-14">
          <div className="py-6 sm:py-10">
            <h1 className="landing-reveal landing-reveal-delay-1 landing-title text-5xl text-(--landing-ink) sm:text-6xl lg:text-[4.75rem]">
              AI RepoSense
            </h1>
            <p className="landing-reveal landing-reveal-delay-2 mt-6 text-2xl font-semibold tracking-tight text-(--landing-ink) sm:text-3xl">
            An AI Senior Developer for your Codebase.
            </p>
            <p className="landing-reveal landing-reveal-delay-3 mt-5 max-w-md text-base leading-relaxed text-(--landing-muted) sm:text-lg">
              Connect a project, get a health report, and ask precise questions
              grounded in your real code.
            </p>
            <div className="landing-reveal landing-reveal-delay-4 mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="landing-btn-primary rounded-xl px-5 py-3.5 text-sm font-semibold"
              >
                Analyze My Repository
              </Link>
              <a
                href="#demo"
                className="landing-btn-secondary rounded-xl px-5 py-3.5 text-sm font-semibold"
              >
                View Demo
              </a>
            </div>
          </div>

          <div className="hidden md:block">
            <CodePlane />
          </div>
        </div>
      </section>

      <section
        id="why"
        className="landing-band scroll-mt-28 px-6 py-24 sm:px-10"
      >
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="landing-kicker">Why it exists</p>
            <h2 className="landing-title mt-5 text-3xl sm:text-5xl">
              Stop guessing through unfamiliar code.
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-(--landing-muted) sm:text-lg">
            Static linters catch patterns. This product builds a searchable
            understanding of your codebase — then reasons over it like a senior
            engineer sitting beside you.
          </p>
        </div>
      </section>

      <section id="how" className="scroll-mt-28 px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="landing-title text-3xl sm:text-5xl">
            From repository to insight
          </h2>
          <p className="mt-5 max-w-xl text-base text-(--landing-muted) sm:text-lg">
            One clear path. No dashboard clutter in the first five minutes.
          </p>
          <ol className="mt-14 space-y-0 border-t border-(--landing-line)">
            {FLOW.map((item) => (
              <li
                key={item.step}
                className="grid gap-4 border-b border-(--landing-line) py-10 sm:grid-cols-[96px_1fr]"
              >
                <span className="font-mono text-sm font-medium text-(--landing-accent)">
                  {item.step}
                </span>
                <div>
                  <h3 className="landing-title text-2xl">{item.title}</h3>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-(--landing-muted)">
                    {item.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="features"
        className="landing-band scroll-mt-28 px-6 py-24 sm:px-10"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="landing-title text-3xl sm:text-5xl">
            Built for real review sessions
          </h2>
          <p className="mt-5 max-w-xl text-base text-(--landing-muted) sm:text-lg">
            Everything a course viewer expects to demo — and a developer wants
            to keep using.
          </p>
          <div className="mt-14 grid gap-x-10 gap-y-12 border-t border-(--landing-line) pt-12 md:grid-cols-3">
            {OUTCOMES.map((item) => (
              <div key={item.title}>
                <h3 className="landing-title text-xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-(--landing-muted) sm:text-base">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="demo" className="scroll-mt-28 px-6 py-24 sm:px-10">
        <div className="mx-auto max-w-6xl">
          <h2 className="landing-title text-3xl sm:text-5xl">
            A product you can show on camera
          </h2>
          <p className="mt-5 max-w-xl text-base text-(--landing-muted) sm:text-lg">
            Progress, report, chat, and explorer — the full loop looks polished
            in a YouTube walkthrough.
          </p>

          <div className="landing-demo mt-12 overflow-hidden rounded-3xl p-6 text-white sm:p-10">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="font-mono text-xs tracking-[0.18em] text-(--landing-glow) uppercase">
                  project / payment-api
                </p>
                <p className="landing-score landing-title mt-5 text-6xl sm:text-7xl">
                  82
                  <span className="text-2xl text-white/45"> / 100</span>
                </p>
                <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
                  Health score with architecture, security, performance,
                  quality, and testing.
                </p>
              </div>
              <div className="space-y-3 font-mono text-xs sm:text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-(--landing-glow)">You</p>
                  <p className="mt-2 text-white/90">
                    Explain the authentication flow.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-4">
                  <p className="text-(--landing-glow)">AI Engineer</p>
                  <p className="mt-2 leading-relaxed text-white/85">
                    Auth starts in{" "}
                    <span className="text-(--landing-glow)">
                      src/lib/auth.ts
                    </span>
                    . Sessions are issued after credential checks, then the
                    proxy guards dashboard routes.
                  </p>
                  <p className="mt-3 text-white/40">
                    Sources: src/lib/auth.ts · src/proxy.ts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-cta px-6 py-24 sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="landing-title text-3xl text-white sm:text-5xl">
              Build it. Demo it. Ship the understanding.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/65 sm:text-lg">
              Free to try with daily analysis limits. Upgrade to Premium in
              Settings when you need more runs, projects, and chat capacity.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/register"
              className="landing-btn-primary rounded-xl px-5 py-3.5 text-sm font-semibold"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="rounded-xl border border-white/20 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white"
            >
              Analyze My Repository
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-(--landing-line) px-6 py-8 text-sm text-(--landing-muted) sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="landing-brand text-(--landing-ink)">
            AI RepoSense
          </p>
          <p>Next.js · RAG · Groq · pgvector</p>
        </div>
      </footer>
    </div>
  );
}