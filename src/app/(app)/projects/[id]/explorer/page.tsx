import { CodeExplorer } from "@/components/projects/code-explorer";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildFileTree,
  listProjectFilePaths,
  readProjectFile,
} from "@/lib/files/explorer";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ file?: string }>;
};

export default async function ProjectExplorerPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const query = await searchParams;

  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!project) notFound();

  let paths: string[] = [];
  try {
    paths = await listProjectFilePaths(project.id);
  } catch {
    paths = [];
  }

  const tree = buildFileTree(paths);
  const initialFile =
    query.file && paths.includes(query.file) ? query.file : (paths[0] ?? null);

  let initialContent: string | null = null;
  if (initialFile) {
    const file = await readProjectFile(project.id, initialFile);
    initialContent = file?.content ?? null;
  }

  return (
    <main className="app-page app-page-wide">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="app-kicker">Code Explorer</p>
          <h1 className="app-title mt-2 text-3xl">{project.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/projects/${project.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Overview
          </Link>
          <Link
            href={`/projects/${project.id}/chat`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Chat
          </Link>
          <Link
            href={`/projects/${project.id}/report`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Report
          </Link>
          <Link
            href={`/projects/${project.id}/issues`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Issues
          </Link>
        </div>
      </div>

      {paths.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No extracted files are available for this project yet.
        </div>
      ) : (
        <CodeExplorer
          projectId={project.id}
          tree={tree}
          initialFile={initialFile}
          initialContent={initialContent}
        />
      )}
    </main>
  );
}