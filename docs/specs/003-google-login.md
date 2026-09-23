# 003 Google 로그인

## 목적

사용자가 Google 계정으로 간단히 로그인하고, 이후 자신의 사주 해석 결과를 안전하게 저장하고 다시 볼 수 있는 사용자 식별 기반을 만듭니다.

## 이번 Spec의 UX 결정

- 로그인하지 않아도 기존 사주 계산과 Gemini 해석은 계속 사용할 수 있습니다.
- 로그인은 결과 저장과 이전 결과 보기에만 필요합니다.
- 로그인하지 않은 상태에서 만든 결과는 자동 저장하지 않습니다.
- 로그인 버튼은 입력을 방해하지 않는 위치에 두고, 로그인 상태에서는 Google 계정의 표시 이름 또는 이메일과 로그아웃 버튼을 보여줍니다.

## 사용자 흐름

### 로그인

1. 사용자가 `Google로 계속하기`를 누릅니다.
2. Google 동의 화면으로 이동합니다.
3. Google 인증이 끝나면 Supabase Auth를 거쳐 `/auth/callback`으로 돌아옵니다.
4. 서버 콜백이 인증 코드를 세션으로 교환하고 쿠키에 세션을 저장합니다.
5. 사용자는 서비스 화면으로 돌아오며 로그인 상태가 표시됩니다.

### 로그아웃

1. 사용자가 `로그아웃`을 누릅니다.
2. Supabase Auth 세션과 인증 쿠키를 제거합니다.
3. 저장된 사주 결과는 삭제하지 않으며, 다시 로그인하면 그대로 볼 수 있습니다.

## Google과 Supabase 설정

### Google Auth Platform

- OAuth 클라이언트 유형은 `Web application`을 사용합니다.
- 승인된 JavaScript 출처에 로컬 주소와 실제 배포 주소를 각각 등록합니다.
  - 로컬: `http://localhost:3000`
  - 배포: 배포 후 확정된 HTTPS 기본 주소
- 승인된 리디렉션 URI에는 Supabase Dashboard의 Google Provider 화면에 표시된 프로젝트 콜백 주소를 등록합니다.
- 요청 범위는 기본 사용자 식별에 필요한 `openid`, `email`, `profile`만 사용합니다.
- Google Drive, Calendar 등 다른 Google 서비스 접근 권한은 요청하지 않습니다.

### Supabase Auth

- Google Provider를 활성화하고 Google Client ID와 Client Secret을 Supabase Dashboard에 저장합니다.
- 앱의 Site URL과 Redirect URLs에 아래 주소를 등록합니다.
  - `http://localhost:3000/auth/callback`
  - 실제 배포 주소의 `/auth/callback`
- Google Client Secret은 앱 코드나 `.env`에 복사하지 않습니다.

## Next.js 구현 구조

- `@supabase/supabase-js`와 `@supabase/ssr`를 설치할 때 버전을 고정하고 잠금 파일을 함께 갱신합니다.
- 브라우저용 클라이언트와 서버용 클라이언트를 별도 유틸리티로 만듭니다.
- Next.js 서버 렌더링에서는 세션을 localStorage가 아니라 쿠키로 관리합니다.
- OAuth 시작 시 `signInWithOAuth({ provider: "google", options: { redirectTo } })`를 사용합니다.
- `app/auth/callback/route.ts`에서 `exchangeCodeForSession`으로 인증 코드를 세션으로 교환합니다.
- `next` 이동 경로는 `/`로 시작하는 내부 상대 경로만 허용해 외부 사이트로 보내는 공격을 막습니다.
- Next.js 16의 `proxy.ts`에서 만료된 인증 토큰을 갱신하고, 서버에서 로그인 여부를 확인할 때 `getSession()` 결과를 신뢰하지 않고 검증된 claims를 사용합니다.

## 환경변수

- `NEXT_PUBLIC_SUPABASE_URL`: 브라우저와 서버가 사용할 Supabase 프로젝트 주소
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: RLS와 함께 사용하는 공개 가능한 프로젝트 키
- `SUPABASE_SECRET_KEY` 또는 기존 `service_role` 키는 이번 기능에 사용하지 않습니다.
- 공개 키는 비밀키는 아니지만 프로젝트별 설정값이므로 `.env`에서 관리합니다.

## 개인정보와 보안

- 앱은 Google이 제공한 사용자 ID, 이메일, 표시 이름, 프로필 사진만 로그인 화면 표시에 사용할 수 있습니다.
- 권한 판단은 이메일이나 사용자가 바꿀 수 있는 `user_metadata`가 아니라 Supabase가 검증한 사용자 ID를 기준으로 합니다.
- Google `provider_token`과 `provider_refresh_token`은 수집하거나 저장하지 않습니다.
- 사용자 이메일과 프로필 정보를 별도 `profiles` 테이블에 복제하지 않습니다.
- 브라우저에 Supabase secret/service-role 키를 포함하지 않습니다.
- 인증 오류 메시지에 토큰, 인증 코드, 이메일 전체를 기록하지 않습니다.

## 화면 상태

1. **확인 중:** 로그인 상태를 확인하는 동안 버튼을 중복 클릭할 수 없고 짧은 진행 상태를 표시합니다.
2. **로그아웃 상태:** `Google로 계속하기` 버튼과 `로그인하면 결과를 저장할 수 있어요` 안내를 표시합니다.
3. **로그인 상태:** 표시 이름 또는 이메일, 로그아웃 버튼을 표시합니다.
4. **사용자 취소:** 현재 입력 화면으로 돌아오며 다시 시도할 수 있습니다.
5. **콜백 실패:** `로그인을 완료하지 못했습니다`와 다시 로그인 버튼을 표시합니다.
6. **세션 만료:** 서비스 사용은 계속 가능하지만 저장 기능은 멈추고 다시 로그인을 안내합니다.

## 제외 범위

- 이메일·비밀번호 로그인
- Apple, Kakao 등 다른 소셜 로그인
- Google Drive, Gmail, Calendar 접근
- 관리자 역할과 유료 회원 권한
- 계정 삭제와 Google 계정 연결 해제
- 별도 프로필 편집 화면

## 완료 조건

- Google 로그인 성공 후 서비스로 돌아오고 새로고침 뒤에도 로그인 상태가 유지됩니다.
- 로그인 취소·콜백 오류·세션 만료 시 이해할 수 있는 안내와 복구 방법이 보입니다.
- 로그아웃하면 세션이 제거되지만 사용자가 저장한 결과는 남습니다.
- 로그인하지 않은 사용자도 기존 사주 계산과 해석을 계속 사용할 수 있습니다.
- Google provider token, Supabase secret/service-role 키가 브라우저 코드·쿠키·로그에 노출되지 않습니다.
- 콜백의 `next` 값으로 외부 주소를 지정해도 외부 사이트로 이동하지 않습니다.

## 테스트 계획

### 자동 테스트

- 로그인 버튼이 `google` provider와 올바른 내부 콜백 주소를 사용합니다.
- 콜백에 코드가 있으면 세션 교환 후 내부 경로로 이동합니다.
- 코드 누락과 세션 교환 실패는 오류 화면으로 이동합니다.
- `next=https://outside.example` 같은 값은 `/`로 바뀝니다.
- 로그인 상태와 로그아웃 상태에 맞는 UI가 표시됩니다.
- 서버 인증 판단에 브라우저가 보낸 사용자 ID나 이메일을 사용하지 않습니다.

### 실제 화면 확인

- 로컬 Google 로그인 성공, 취소, 로그아웃을 각각 확인합니다.
- 새로고침 후 로그인 유지와 로그아웃 후 비로그인 전환을 확인합니다.
- 모바일과 컴퓨터 화면에서 로그인 버튼과 계정 표시가 잘리지 않는지 확인합니다.
- 배포 후 실제 HTTPS 주소에서도 콜백이 정상 동작하는지 별도로 확인합니다.

## 구현 전 준비

- [ ] Google Auth Platform에서 Web OAuth Client를 생성함
- [ ] Google 승인 출처와 Supabase 콜백 URI를 등록함
- [x] Supabase Dashboard에서 Google Provider를 활성화함
- [ ] Supabase Site URL과 Redirect URLs를 등록함
- [x] `.env`의 Supabase URL과 publishable key 값을 확인함

## 참고한 공식 문서

- [Supabase Google 로그인](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase 서버 렌더링 인증](https://supabase.com/docs/guides/auth/server-side)
- [Supabase Redirect URL 설정](https://supabase.com/docs/guides/auth/redirect-urls)

## 검증 기록

- 2026-09-23: `@supabase/ssr` 쿠키 세션, 브라우저·서버 클라이언트, Next.js 16 `proxy.ts`, Google OAuth 시작·콜백·로그아웃 화면을 구현했습니다.
- 외부·프로토콜 상대 `next` 경로 차단을 포함한 자동 테스트, 타입 검사와 프로덕션 빌드가 통과했습니다.
- 공개 Auth 설정 조회에서 Google Provider가 활성화된 것을 확인했고, 비로그인 홈과 로그인 필요 화면을 실제 브라우저에서 확인했습니다.
- 실제 Google 계정 로그인 성공·취소·새로고침 유지·로그아웃은 사용자 인증 승인이 필요해 아직 검증하지 못했습니다. 따라서 전체 Status는 완료로 변경하지 않았습니다.
