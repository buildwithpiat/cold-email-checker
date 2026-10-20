// Contrato de la API /api/check — compartido entre backend y frontend.

export type CheckStatus = "pass" | "fail" | "missing";

export interface CheckItem {
  status: CheckStatus;
  value?: string;
  fix?: string;
}

export interface BlacklistCheck {
  status: "pass" | "fail" | "unknown";
  count: number;
  lists: string[];
}

export interface CheckResult {
  domain: string;
  score: number; // 0-100
  verdict: string;
  spf: CheckItem;
  dkim: CheckItem;
  dmarc: CheckItem;
  blacklists: BlacklistCheck;
  mxConfigured: boolean;
  checkedAt: string; // ISO timestamp
}

export interface CheckError {
  error: string;
}
