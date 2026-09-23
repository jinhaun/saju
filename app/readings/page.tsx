import Link from "next/link";
import AuthControls from "../auth-controls";
import { getAuthenticatedUser } from "../../lib/supabase/auth";
import ReadingsList from "./readings-list";

export default async function ReadingsPage() {
  const user = await getAuthenticatedUser();

  return (
    <main>
      <nav className="page-nav" aria-label="주요 메뉴">
        <Link className="brand-link" href="/">
          나의 사주 안내서
        </Link>
        <AuthControls user={user} />
      </nav>
      <header className="subpage-header">
        <p className="eyebrow">내 기록</p>
        <h1>내 사주 결과</h1>
        <p>로그인한 뒤 만든 해석을 최신순으로 다시 볼 수 있어요.</p>
      </header>

      {user ? (
        <ReadingsList />
      ) : (
        <section className="state-card">
          <h2>로그인이 필요합니다.</h2>
          <p>Google로 로그인하면 본인이 저장한 결과만 안전하게 볼 수 있어요.</p>
        </section>
      )}
    </main>
  );
}
