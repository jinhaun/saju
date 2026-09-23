import Link from "next/link";
import { getAuthenticatedUser } from "../../../lib/supabase/auth";
import AuthControls from "../../auth-controls";
import ReadingDetail from "./reading-detail";

export default async function ReadingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, user] = await Promise.all([params, getAuthenticatedUser()]);

  return (
    <main>
      <nav className="page-nav" aria-label="주요 메뉴">
        <Link className="brand-link" href="/readings">
          ← 내 사주 결과
        </Link>
        <AuthControls user={user} />
      </nav>
      {user ? (
        <ReadingDetail id={id} />
      ) : (
        <section className="state-card">
          <h1>로그인이 필요합니다.</h1>
          <p>저장된 결과를 보려면 다시 로그인해 주세요.</p>
        </section>
      )}
    </main>
  );
}
