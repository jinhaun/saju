import { hasSupabaseConfig } from "./config";
import { createClient } from "./server";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

function textClaim(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  if (!hasSupabaseConfig()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;

  const claims = data.claims as Record<string, unknown>;
  const metadata =
    claims.user_metadata && typeof claims.user_metadata === "object"
      ? (claims.user_metadata as Record<string, unknown>)
      : {};
  const email = textClaim(claims.email);
  const displayName =
    textClaim(metadata.full_name) || textClaim(metadata.name) || email;

  return { id: data.claims.sub, email, displayName };
}
