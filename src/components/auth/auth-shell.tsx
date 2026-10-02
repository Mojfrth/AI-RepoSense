import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import Link from "next/link";

type AuthShellProps = {
  children: React.ReactNode;
  mode: "login" | "register";
};

const STEPS = {
  register: [
    { n: 1, label: "Sign up your account", active: true },
    { n: 2, label: "Connect a repository", active: false },
    { n: 3, label: "Review your health report", active: false },
  ],
  login: [
    { n: 1, label: "Sign in to your account", active: true },
    { n: 2, label: "Open your dashboard", active: false },
    { n: 3, label: "Analyze a repository", active: false },
  ],
} as const;

export function AuthShell({ children, mode }: AuthShellProps) {
  const steps = STEPS[mode];

  return (
    <div className="auth-shell flex min-h-svh items-center justify-center bg-background p-3 text-foreground sm:p-5">
      <div className="auth-frame relative grid min-h-[min(900px,calc(100svh-2.5rem))] w-full max-w-[1180px] overflow-hidden rounded-[1.75rem] border border-border bg-card lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="auth-panel relative hidden overflow-hidden lg:flex lg:flex-col">
          <div className="auth-panel-noise pointer-events-none absolute inset-0" />
          <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-white"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                <span className="size-2.5 rounded-full bg-white" />
              </span>
              <span className="text-sm font-semibold tracking-tight">
                AI Codebase Auditor
              </span>
            </Link>

            <div className="space-y-8">
              <div className="max-w-sm space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-white xl:text-5xl">
                  Get Started with Us
                </h1>
                <p className="text-sm leading-relaxed text-white/60">
                  Complete these easy steps to{" "}
                  {mode === "register"
                    ? "register your account"
                    : "access your workspace"}
                  .
                </p>
              </div>

              <ol className="max-w-sm space-y-3">
                {steps.map((step) => (
                  <li
                    key={step.n}
                    className={cn(
                      "flex items-center gap-3 rounded-full px-4 py-3 text-sm font-medium",
                      step.active
                        ? "bg-white text-black"
                        : "bg-white/10 text-white/70",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        step.active
                          ? "bg-black text-white"
                          : "bg-white/15 text-white/80",
                      )}
                    >
                      {step.n}
                    </span>
                    {step.label}
                  </li>
                ))}
              </ol>
            </div>

            <p className="text-xs text-white/35">
              Health reports · grounded chat · issue roadmap
            </p>
          </div>
        </aside>

        <section className="relative flex flex-col bg-card">
          <div className="absolute top-4 right-4 z-20 sm:top-5 sm:right-5">
            <ThemeToggle />
          </div>

          <div className="flex flex-1 items-center justify-center px-5 py-16 sm:px-10">
            <div className="w-full max-w-[420px]">{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}