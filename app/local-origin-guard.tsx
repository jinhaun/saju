"use client";

import { useEffect } from "react";
import { canonicalizeLocalUrl } from "../lib/supabase/auth-redirect";

export default function LocalOriginGuard() {
  useEffect(() => {
    const canonicalUrl = canonicalizeLocalUrl(window.location.href);
    if (canonicalUrl.origin !== window.location.origin) {
      window.location.replace(canonicalUrl.toString());
    }
  }, []);

  return null;
}
