import { ProjectChat } from "@/components/projects/project-chat";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectChatPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: { _count: { select: { chunks: true } } },
  });

  if (!project) notFound();

  const ready = project._count.chunks > 0;

  return (
    <main className="app-page app-page-narrow">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="app-kicker">AI Chat</p>
          <h1 className="app-title mt-2 text-3xl">{project.name}</h1>
        </div>
        <Link
          href={`/projects/${project.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Overview
        </Link>
      </div>

      {ready ? (
        <ProjectChat projectId={project.id} projectName={project.name} />
      ) : (
        <div className="app-panel border-dashed p-8 text-center">
          <h2 className="app-title text-xl">Code knowledge is not ready</h2>
          <p className="mt-2 text-sm text-[color:var(--app-muted)]">
            This project has no indexed chunks yet. Finish import / knowledge
            building before chatting.
          </p>
          <Link
            href={`/projects/${project.id}`}
            className={cn(
              buttonVariants(),
              "mt-6 inline-flex bg-[linear-gradient(135deg,#06b6d4_0%,#0e7490_100%)] text-white hover:opacity-90",
            )}
          >
            Back to project
          </Link>
        </div>
      )}
    </main>
  );
}