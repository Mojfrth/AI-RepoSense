import { prisma } from "@/lib/db";
import { encryptToken } from "@/lib/encryption";
import { exchangeGitHubCode, verifyGitHubOAuthState } from "@/lib/github";
import { NextRequest, NextResponse } from "next/server";

function appUrl(path: string) {
  return new URL(path, process.env.AUTH_URL ?? "http://localhost:3000");
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      appUrl(`/settings?github_error=${encodeURIComponent(oauthError)}`),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(appUrl("/settings?github_error=missing_code"));
  }

  const verified = verifyGitHubOAuthState(state);
  if (!verified) {
    return NextResponse.redirect(
      appUrl("/settings?github_error=invalid_state"),
    );
  }

  try {
    const { accessToken, login } = await exchangeGitHubCode(code);

    await prisma.user.update({
      where: { id: verified.userId },
      data: {
        githubAccessToken: encryptToken(accessToken),
        githubUsername: login,
      },
    });

    return NextResponse.redirect(appUrl("/settings?github=connected"));
  } catch {
    return NextResponse.redirect(
      appUrl("/settings?github_error=exchange_failed"),
    );
  }
}