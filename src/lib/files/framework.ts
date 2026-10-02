import type { ExtractedFile } from "@/lib/files/filters";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

function hasDep(pkg: PackageJson, name: string): boolean {
  return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
}

/** Detect framework from package.json + common folder hints */
export function detectFramework(
  files: ExtractedFile[],
  allRelativePaths: string[],
): string {
  const packageFile = files.find(
    (file) =>
      file.relativePath === "package.json" ||
      file.relativePath.endsWith("/package.json"),
  );

  if (packageFile) {
    try {
      const pkg = JSON.parse(packageFile.content) as PackageJson;
      if (hasDep(pkg, "next")) return "Next.js";
      if (hasDep(pkg, "nuxt")) return "Nuxt";
      if (hasDep(pkg, "remix") || hasDep(pkg, "@remix-run/react"))
        return "Remix";
      if (hasDep(pkg, "astro")) return "Astro";
      if (hasDep(pkg, "@nestjs/core")) return "NestJS";
      if (hasDep(pkg, "express")) return "Express";
      if (hasDep(pkg, "fastify")) return "Fastify";
      if (hasDep(pkg, "vue")) return "Vue";
      if (hasDep(pkg, "react")) return "React";
    } catch {
      // ignore invalid package.json
    }
  }

  const joined = allRelativePaths.join("\n");
  if (joined.includes("next.config")) return "Next.js";
  if (joined.includes("nuxt.config")) return "Nuxt";
  if (joined.includes("astro.config")) return "Astro";

  const hasTs = allRelativePaths.some(
    (p) => p.endsWith(".ts") || p.endsWith(".tsx"),
  );
  const hasJs = allRelativePaths.some(
    (p) => p.endsWith(".js") || p.endsWith(".jsx"),
  );
  if (hasTs) return "TypeScript";
  if (hasJs) return "JavaScript";

  return "Unknown";
}