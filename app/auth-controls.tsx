"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuthUser } from "../lib/supabase/auth";
import { createClient } from "../lib/supabase/client";

export default function AuthControls({ user }: { user: AuthUser | null }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function signIn() {
    setIsPending(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/`,
        },
      });
      if (authError) throw authError;
    } catch {
      setError("로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setIsPending(false);
    }
  }

  async function signOut() {
    setIsPending(true);
    setError("");
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signOut({ scope: "local" });
      if (authError) throw authError;
      router.push("/");
      router.refresh();
    } catch {
      setError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
      setIsPending(false);
    }
  }

  return (
    <div className="auth-area">
      {user ? (
        <div className="auth-signed-in">
          <div className="auth-copy">
            <span>로그인됨</span>
            <strong>{user.displayName || user.email || "Google 사용자"}</strong>
          </div>
          <Link className="secondary-link" href="/readings">
            내 사주 결과
          </Link>
          <button
            type="button"
            className="text-button"
            onClick={signOut}
            disabled={isPending}
          >
            {isPending ? "로그아웃 중…" : "로그아웃"}
          </button>
        </div>
      ) : (
        <div className="auth-signed-out">
          <p>로그인하면 새로 만든 결과를 안전하게 저장할 수 있어요.</p>
          <button
            type="button"
            className="google-button"
            onClick={signIn}
            disabled={isPending}
          >
            <span aria-hidden="true">G</span>
            {isPending ? "Google로 이동 중…" : "Google로 계속하기"}
          </button>
        </div>
      )}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
