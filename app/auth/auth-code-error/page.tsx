import Link from "next/link";

const messages = {
  "missing-verifier":
    "로그인 시작 주소와 돌아온 주소가 달라 임시 인증 정보를 찾지 못했습니다. 아래 버튼으로 홈에 돌아간 뒤 같은 창에서 다시 시도해 주세요.",
  "bad-verifier":
    "로그인 요청과 돌아온 인증 정보가 서로 맞지 않습니다. 아래 버튼으로 홈에 돌아간 뒤 같은 창에서 다시 시도해 주세요.",
  "flow-state":
    "Supabase에서 이번 로그인 요청 기록을 찾지 못했습니다. 아래 버튼으로 홈에 돌아간 뒤 다시 시도해 주세요.",
  expired:
    "로그인 인증 시간이 지났습니다. 아래 버튼으로 홈에 돌아간 뒤 다시 시도해 주세요.",
  exchange:
    "Google 로그인 정보는 돌아왔지만 Supabase에서 세션을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.",
} as const;

export default async function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const message = messages[reason as keyof typeof messages] ?? messages.exchange;

  return (
    <main className="narrow-page">
      <section className="state-card" aria-labelledby="auth-error-title">
        <p className="eyebrow">로그인 안내</p>
        <h1 id="auth-error-title">로그인을 완료하지 못했습니다.</h1>
        <p>{message}</p>
        <Link className="primary-link" href="/">
          홈에서 다시 로그인하기
        </Link>
      </section>
    </main>
  );
}
