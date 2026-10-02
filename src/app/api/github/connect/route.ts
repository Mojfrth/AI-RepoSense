import { auth } from "@/lib/auth";
import { createGitHubOAuthState, getGitHubAuthorizeUrl } from "@/lib/github";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.AUTH_URL));
  }

  const state = createGitHubOAuthState(session.user.id);
  const url = getGitHubAuthorizeUrl(state);
  return NextResponse.redirect(url);
}