const LOCAL_LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "[::1]"]);

function normalizeConfiguredOrigin(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  const url = new URL(trimmed);
  return url.origin;
}

export function canonicalizeLocalUrl(rawUrl: string) {
  const url = new URL(rawUrl);

  if (LOCAL_LOOPBACK_HOSTS.has(url.hostname)) {
    url.hostname = "localhost";
  }

  return url;
}

export function getAuthCallbackUrl(
  browserOrigin: string,
  configuredSiteUrl?: string,
) {
  const configuredOrigin = normalizeConfiguredOrigin(configuredSiteUrl);
  const origin = configuredOrigin ?? canonicalizeLocalUrl(browserOrigin).origin;
  const callbackUrl = new URL("/auth/callback", origin);
  callbackUrl.searchParams.set("next", "/");
  return callbackUrl.toString();
}

export type AuthExchangeFailureReason =
  | "missing-verifier"
  | "bad-verifier"
  | "flow-state"
  | "expired"
  | "exchange";

export function classifyAuthExchangeFailure(
  error: { code?: string; message?: string },
  hasCodeVerifier: boolean,
): AuthExchangeFailureReason {
  if (!hasCodeVerifier) return "missing-verifier";

  const detail = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  if (detail.includes("bad_code_verifier") || detail.includes("code verifier")) {
    return "bad-verifier";
  }
  if (detail.includes("flow_state_not_found")) return "flow-state";
  if (detail.includes("expired")) return "expired";
  return "exchange";
}
