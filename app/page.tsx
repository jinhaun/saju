import SajuForm from "./saju-form";
import CompatibilityForm from "./compatibility-form";
import SimilarSajuForm from "./similar-saju-form";
import AuthControls from "./auth-controls";
import { getAuthenticatedUser } from "../lib/supabase/auth";

export default async function Page() {
  const user = await getAuthenticatedUser();

  return (
    <main>
      <nav className="page-nav home-nav" aria-label="계정과 결과">
        <span className="brand-link">나의 사주 안내서</span>
        <AuthControls user={user} />
      </nav>
      <section className="book-volume" aria-label="사주 안내와 입력">
        <div className="volume-binding" aria-hidden="true">
          <span className="binding-cord binding-cord-one" />
          <span className="binding-cord binding-cord-two" />
          <span className="binding-cord binding-cord-three" />
          <span className="binding-cord binding-cord-four" />
          <span className="volume-title">나의 사주 안내서</span>
        </div>
        <header className="page-header">
          <div className="hero-copy">
            <p className="eyebrow">오늘을 읽는 조선의 지혜</p>
            <h1>지금 마음에 있는<br />고민부터 시작해요.</h1>
            <p className="intro">
              생년월일과 태어난 시간, 궁금한 주제를 알려주세요. 먼저 사주 원국을
              정확히 계산하고 선택한 고민을 한눈에 정리해 드립니다.
            </p>
          </div>
          <aside className="hero-inscription" aria-hidden="true">
            <span>오늘의 물음이</span>
            <span>내일의 길이 되는 곳</span>
            <i />
            <b>四柱</b>
          </aside>
        </header>
        <SajuForm isAuthenticated={Boolean(user)} />
        <SimilarSajuForm />
      </section>
      <CompatibilityForm />
      <footer className="page-footer">
        <p>
          사주 결과는 자신을 돌아보기 위한 참고 정보입니다. 중요한 결정은 실제
          상황과 전문가의 조언을 함께 살펴보세요.
        </p>
      </footer>
    </main>
  );
}
