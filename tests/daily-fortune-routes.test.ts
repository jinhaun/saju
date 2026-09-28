import test from "node:test";
import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";

const localRequire = createRequire(__filename);

type ModuleLoad = (
  request: string,
  parent: NodeModule | null | undefined,
  isMain: boolean,
) => unknown;

type RouteStubs = {
  auth?: Record<string, unknown>;
  admin?: Record<string, unknown>;
  service?: Record<string, unknown>;
};

class MockDailyFortuneServiceError extends Error {
  code: "PROFILE_REQUIRED" | "DATABASE_ERROR" | "GENERATION_ERROR";

  constructor(
    code: MockDailyFortuneServiceError["code"],
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

function loadRoute<T>(routePath: string, stubs: RouteStubs): T {
  const routeFile = localRequire.resolve(routePath);
  delete localRequire.cache[routeFile];

  const moduleWithLoad = Module as unknown as { _load: ModuleLoad };
  const originalLoad = moduleWithLoad._load;
  moduleWithLoad._load = function mockedLoad(request, parent, isMain) {
    const normalized = request.replaceAll("\\", "/");
    if (normalized === "server-only") return {};
    if (normalized.endsWith("lib/supabase/auth")) return stubs.auth;
    if (normalized.endsWith("lib/supabase/admin")) return stubs.admin;
    if (normalized.endsWith("lib/saju/daily-fortune-service")) {
      return {
        DailyFortuneServiceError: MockDailyFortuneServiceError,
        ...stubs.service,
      };
    }
    return originalLoad.call(Module, request, parent, isMain);
  };

  try {
    return localRequire(routeFile) as T;
  } finally {
    moduleWithLoad._load = originalLoad;
  }
}

async function jsonBody(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

test("오늘의 운세 API는 로그인하지 않은 요청을 401로 거부한다", async () => {
  let adminChecked = false;
  const { GET } = loadRoute<{ GET: () => Promise<Response> }>(
    "../app/api/daily-fortune/route.ts",
    {
      auth: { getAuthenticatedUser: async () => null },
      admin: {
        hasSupabaseAdminConfig: () => {
          adminChecked = true;
          return true;
        },
        createAdminClient: () => ({}),
      },
      service: { ensureDailyFortune: async () => assert.fail("호출되면 안 됩니다.") },
    },
  );

  const response = await GET();
  const body = await jsonBody(response);

  assert.equal(response.status, 401);
  assert.equal(body.code, "AUTH_REQUIRED");
  assert.equal(adminChecked, false);
});

test("로그인했지만 기준 정보가 없으면 404와 PROFILE_REQUIRED를 반환한다", async () => {
  const { GET } = loadRoute<{ GET: () => Promise<Response> }>(
    "../app/api/daily-fortune/route.ts",
    {
      auth: {
        getAuthenticatedUser: async () => ({
          id: "00000000-0000-4000-8000-000000000001",
          email: "test@example.com",
          displayName: "테스트",
        }),
      },
      admin: {
        hasSupabaseAdminConfig: () => true,
        createAdminClient: () => ({}),
      },
      service: {
        ensureDailyFortune: async () => {
          throw new MockDailyFortuneServiceError(
            "PROFILE_REQUIRED",
            "먼저 기본 사주 해석을 한 번 만들어 주세요.",
          );
        },
      },
    },
  );

  const response = await GET();
  const body = await jsonBody(response);

  assert.equal(response.status, 404);
  assert.equal(body.code, "PROFILE_REQUIRED");
  assert.match(String(body.message), /기본 사주 해석/);
});

test("Cron 비밀값이 설정되지 않으면 요청을 503으로 거부한다", { concurrency: false }, async () => {
  const originalSecret = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  let adminCreated = false;

  try {
    const { GET } = loadRoute<{ GET: (request: Request) => Promise<Response> }>(
      "../app/api/cron/daily-fortunes/route.ts",
      {
        admin: {
          hasSupabaseAdminConfig: () => true,
          createAdminClient: () => {
            adminCreated = true;
            return {};
          },
        },
        service: { ensureDailyFortune: async () => assert.fail("호출되면 안 됩니다.") },
      },
    );

    const response = await GET(
      new Request("http://localhost/api/cron/daily-fortunes"),
    );
    assert.equal(response.status, 503);
    assert.equal(adminCreated, false);
  } finally {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  }
});

test("Cron Authorization 값이 다르면 요청을 401로 거부한다", { concurrency: false }, async () => {
  const originalSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "expected-cron-secret";
  let adminCreated = false;

  try {
    const { GET } = loadRoute<{ GET: (request: Request) => Promise<Response> }>(
      "../app/api/cron/daily-fortunes/route.ts",
      {
        admin: {
          hasSupabaseAdminConfig: () => true,
          createAdminClient: () => {
            adminCreated = true;
            return {};
          },
        },
        service: { ensureDailyFortune: async () => assert.fail("호출되면 안 됩니다.") },
      },
    );

    const response = await GET(
      new Request("http://localhost/api/cron/daily-fortunes", {
        headers: { Authorization: "Bearer wrong-secret" },
      }),
    );
    const body = await jsonBody(response);

    assert.equal(response.status, 401);
    assert.equal(body.success, false);
    assert.equal(adminCreated, false);
  } finally {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  }
});

test("올바른 Cron 비밀값은 예약 작업을 실행한다", { concurrency: false }, async () => {
  const originalSecret = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "expected-cron-secret";
  let listed = false;

  try {
    const fakeAdminClient = {
      from: (table: string) => {
        assert.equal(table, "saju_profiles");
        return {
          select: () => ({
            order: () => ({
              limit: async () => {
                listed = true;
                return { data: [], error: null };
              },
            }),
          }),
        };
      },
    };
    const { GET } = loadRoute<{ GET: (request: Request) => Promise<Response> }>(
      "../app/api/cron/daily-fortunes/route.ts",
      {
        admin: {
          hasSupabaseAdminConfig: () => true,
          createAdminClient: () => fakeAdminClient,
        },
        service: { ensureDailyFortune: async () => assert.fail("대상이 없어야 합니다.") },
      },
    );

    const response = await GET(
      new Request("http://localhost/api/cron/daily-fortunes", {
        headers: { Authorization: "Bearer expected-cron-secret" },
      }),
    );
    const body = await jsonBody(response);

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.targets, 0);
    assert.equal(listed, true);
  } finally {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  }
});

