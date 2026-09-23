# 사주 서비스 Starter

Agent와 함께 실제 제품 개발 과정을 연습하는 Starter 프로젝트입니다.

## 실행

```sh
npm install
npm run dev
```

실행 후 터미널에 표시된 주소를 브라우저에서 엽니다.

## 로그인과 결과 저장 준비

`.env`에는 아래 세 설정값을 넣습니다. 실제 값과 비밀키는 Git에 저장하지 않습니다.

```text
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Google 로그인은 Supabase Dashboard의 Google Provider에서 활성화하고, 앱의 허용 Redirect URL에 `http://localhost:3000/auth/callback`을 추가합니다. Google Client Secret은 앱의 `.env`가 아니라 Supabase Dashboard에만 저장합니다.

데이터베이스 구조와 사용자별 보안 정책은 `supabase/migrations/`에 있습니다. Supabase CLI 로그인 후 대상 프로젝트를 연결하고 마이그레이션을 적용합니다.

```sh
npx supabase login
npx supabase link --project-ref azjtaqynzrpcgolxwluy
npx supabase db push
```

## 주요 문서

- `docs/PRD.md`: 무엇을 왜 만들지 기록합니다.
- `docs/specs/`: 기능이 어떻게 동작해야 하는지 기록합니다.
- `docs/status.md`: 현재 어디까지 진행됐는지 기록합니다.
- `AGENTS.md`: Agent가 작업할 때 따르는 기본 원칙입니다.
- `tests/`: 자동화된 검증을 관리합니다.

## 폴더 구조

```text
├── app/                 화면과 페이지
├── lib/saju/            사주 계산 기능
├── docs/
│   ├── PRD.md           제품 목표와 범위
│   ├── status.md        Spec별 진행 상태
│   └── specs/           기능별 요구사항
├── tests/               자동 Test
├── .agents/skills/      반복 작업 Skill
└── AGENTS.md            Agent 작업 원칙
```

이 프로젝트의 AGENTS.md, PRD, Specs, Tests, Status, Skill과 작업 환경을 조합해 Agent가 안정적으로 작업할 수 있는 Harness를 만들어갑니다.

## 작업 흐름

1. 서비스를 실행하고 현재 기능을 직접 확인합니다.
2. Agent와 대화하며 `docs/PRD.md`에 대상 사용자, 해결할 문제와 제품 범위를 작성합니다.
3. 구현할 기능 하나를 정하고 `docs/specs/001-feature-name.md` 형식으로 Spec을 작성합니다.
4. `docs/status.md`에 해당 Spec을 `- [ ]`로 추가합니다.
5. Spec을 기준으로 구현하고 Test와 실제 화면에서 결과를 확인합니다.
6. 구현과 검증이 모두 끝나면 `docs/status.md`의 항목을 `- [x]`로 변경합니다.
7. 다음 기능도 같은 과정을 반복한 뒤 Vercel에 배포하고 배포 주소에서 다시 확인합니다.

한 번에 여러 기능을 구현하지 말고 Spec 하나씩 완료하세요.
