import { RepoPicker } from "@/components/projects/repo-picker";
import { ZipUploadForm } from "@/components/projects/zip-upload-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { connectGitHubAccount } from "@/lib/actions/github";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { listGitHubRepos } from "@/lib/github";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      githubAccessToken: true,
      githubUsername: true,
    },
  });

  const githubConnected = Boolean(user?.githubAccessToken);
  let repos: Awaited<ReturnType<typeof listGitHubRepos>> = [];
  let repoError: string | null = null;

  if (user?.githubAccessToken) {
    try {
      repos = await listGitHubRepos(user.githubAccessToken);
    } catch (error) {
      repoError =
        error instanceof Error
          ? error.message
          : "Failed to load GitHub repositories.";
    }
  }

  return (
    <main className="app-page app-page-narrow">
      <header className="mb-8">
        <p className="app-kicker">New analysis</p>
        <h1 className="app-title mt-2 text-3xl">Analyze a repository</h1>
        <p className="mt-2 text-sm text-[color:var(--app-muted)]">
          Connect GitHub or upload a ZIP of your project.
        </p>
      </header>

      <section className="app-panel space-y-4 p-6">
        <div>
          <h2 className="app-title text-lg">GitHub</h2>
          <p className="mt-1 text-sm text-[color:var(--app-muted)]">
            {githubConnected
              ? `Connected as ${user?.githubUsername ?? "GitHub"}`
              : "Connect GitHub first to select a repository."}
          </p>
        </div>
        {!githubConnected ? (
          <form action={connectGitHubAccount}>
            <Button
              type="submit"
              className="bg-[linear-gradient(135deg,#06b6d4_0%,#0e7490_100%)] text-white hover:opacity-90"
            >
              Connect GitHub
            </Button>
          </form>
        ) : repoError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{repoError}</p>
            <Link
              href="/settings"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Open Settings
            </Link>
          </div>
        ) : (
          <RepoPicker repos={repos} />
        )}
      </section>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-wider text-[color:var(--app-muted)]">
          or
        </span>
        <Separator className="flex-1" />
      </div>

      <section className="app-panel space-y-4 p-6">
        <div>
          <h2 className="app-title text-lg">Upload ZIP</h2>
          <p className="mt-1 text-sm text-[color:var(--app-muted)]">
            No GitHub connection required. Works for local projects.
          </p>
        </div>
        <ZipUploadForm />
      </section>
    </main>
  );
}