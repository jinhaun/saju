import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "../../../lib/supabase/server";
import { classifyAuthExchangeFailure } from "../../../lib/supabase/auth-redirect";
import { safeNextPath } from "../../../lib/supabase/redirect";

export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const cookieStore = await cookies();
    const hasCodeVerifier = cookieStore
      .getAll()
      .some(({ name }) => name.endsWith("-code-verifier"));
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);

    const errorUrl = new URL("/auth/auth-code-error", origin);
    errorUrl.searchParams.set(
      "reason",
      classifyAuthExchangeFailure(error, hasCodeVerifier),
    );
    return NextResponse.redirect(errorUrl);
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
