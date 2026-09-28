import Link from "next/link";
import AuthControls from "../auth-controls";
import TodayFortuneCard from "./today-fortune-card";
import { getAuthenticatedUser } from "../../lib/supabase/auth";

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const user = await getAuthenticatedUser();
  const preview =
    process.env.NODE_ENV === "development" &&
    (await searchParams).preview === "1";

  return (
    <main>
      <nav className="page-nav" aria-label="주요 메뉴">
        <Link className="brand-link" href="/">
          나의 사주 안내서
        </Link>
        <AuthControls user={user} />
      </nav>
      <header className="subpage-header today-page-header">
        <p className="eyebrow">매일 오전 아홉 시</p>
        <h1>오늘의 운세</h1>
        <p>로그인 후 저장한 나의 사주와 오늘의 흐름을 함께 살펴봅니다.</p>
      </header>

      {user || preview ? (
        <TodayFortuneCard preview={preview} />
      ) : (
        <section className="state-card today-state">
          <h2>로그인이 필요합니다.</h2>
          <p>Google로 로그인하면 본인의 사주를 기준으로 오늘의 운세를 볼 수 있어요.</p>
        </section>
      )}
    </main>
  );
}
