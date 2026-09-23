import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="narrow-page">
      <section className="state-card" aria-labelledby="auth-error-title">
        <p className="eyebrow">로그인 안내</p>
        <h1 id="auth-error-title">로그인을 완료하지 못했습니다.</h1>
        <p>
          Google 로그인을 취소했거나 인증 시간이 지났을 수 있어요. 입력한 사주
          정보는 변경되지 않으니 홈으로 돌아가 다시 시도해 주세요.
        </p>
        <Link className="primary-link" href="/">
          홈에서 다시 로그인하기
        </Link>
      </section>
    </main>
  );
}
