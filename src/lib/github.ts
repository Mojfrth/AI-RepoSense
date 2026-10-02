import { decryptToken } from "@/lib/encryption";
import { createHmac, timingSafeEqual } from "crypto";

const GITHUB_API = "https://api.github.com";

export type GitHubRepo = {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  pushed_at: string | null;
  size: number; // KB according to GitHub API
};

function getAppUrl() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

function signState(payload: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function createGitHubOAuthState(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, ts: Date.now() }),
    "utf8",
  ).toString("base64url");
  return signState(payload);
}

export function verifyGitHubOAuthState(
  state: string,
): { userId: string } | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { userId?: string; ts?: number };
    if (!parsed.userId || !parsed.ts) return null;
    // State valid for 10 minutes
    if (Date.now() - parsed.ts > 10 * 60 * 1000) return null;
    return { userId: parsed.userId };
  } catch {
    return null;
  }
}

export function getGitHubAuthorizeUrl(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) throw new Error("GITHUB_CLIENT_ID is not set");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${getAppUrl()}/api/github/callback`,
    scope: "read:user user:email repo",
    state,
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeGitHubCode(code: string): Promise<{
  accessToken: string;
  login: string;
}> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth env vars are missing");
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${getAppUrl()}/api/github/callback`,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error("Failed to exchange GitHub OAuth code");
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
  };

  if (!tokenJson.access_token) {
    throw new Error(tokenJson.error ?? "GitHub did not return an access token");
  }

  const userRes = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-codebase-auditor",
    },
  });

  if (!userRes.ok) {
    throw new Error("Failed to fetch GitHub user profile");
  }

  const profile = (await userRes.json()) as { login?: string };
  if (!profile.login) {
    throw new Error("GitHub profile is missing a username");
  }

  return { accessToken: tokenJson.access_token, login: profile.login };
}

export async function listGitHubRepos(
  encryptedToken: string,
): Promise<GitHubRepo[]> {
  const token = decryptToken(encryptedToken);
  const repos: GitHubRepo[] = [];
  let page = 1;

  while (page <= 5) {
    const res = await fetch(
      `${GITHUB_API}/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "ai-codebase-auditor",
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          "GitHub access denied. Reconnect GitHub in Settings and check permissions.",
        );
      }
      throw new Error("Failed to list GitHub repositories");
    }

    const batch = (await res.json()) as GitHubRepo[];
    repos.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }

  return repos;
}

export async function downloadGitHubZipball(
  encryptedToken: string,
  fullName: string,
  ref?: string,
): Promise<Buffer> {
  const token = decryptToken(encryptedToken);
  const url = ref
    ? `${GITHUB_API}/repos/${fullName}/zipball/${encodeURIComponent(ref)}`
    : `${GITHUB_API}/repos/${fullName}/zipball`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ai-codebase-auditor",
    },
    redirect: "follow",
  });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        "Repository not found or you do not have access to this private repo.",
      );
    }
    throw new Error("Failed to download repository archive from GitHub");
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}