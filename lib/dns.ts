// Utilidades de resolución DNS (DNS-over-HTTPS vía Google) con timeouts y manejo de errores.

export interface DnsAnswer {
  name: string;
  type: number;
  data: string;
}

interface DoHResponse {
  Status: number; // 0 = NOERROR, 3 = NXDOMAIN
  Answer?: DnsAnswer[];
}

const DOH_BASE = "https://dns.google/resolve";
const DNS_TIMEOUT_MS = 8000;

/** Consulta registros TXT/MX/A de un nombre vía DNS-over-HTTPS. */
export async function resolve(
  name: string,
  type: "TXT" | "MX" | "A" | "CNAME"
): Promise<{ answers: DnsAnswer[]; nxdomain: boolean }> {
  const url = `${DOH_BASE}?name=${encodeURIComponent(name)}&type=${type}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DNS_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`DNS query failed (${res.status}) for ${name}/${type}`);
    const json = (await res.json()) as DoHResponse;
    return {
      answers: json.Answer ?? [],
      nxdomain: json.Status === 3,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Extrae valores TXT sin las comillas del formato de registro. */
export function txtValues(answers: DnsAnswer[]): string[] {
  return answers
    .filter((a) => a.type === 16)
    .map((a) => a.data.replace(/^"|"$/g, "").replace(/"\s+"/g, ""));
}

/**
 * Selectores DKIM habituales. Sin conocer el selector exacto del remitente,
 * probamos los más comunes (Google, Microsoft 365, Mailchimp, SendGrid…).
 */
export const COMMON_DKIM_SELECTORS = [
  "google",
  "selector1",
  "selector2",
  "k1",
  "s1",
  "dkim",
];

export async function findDkimRecord(
  domain: string
): Promise<{ selector: string; value: string } | null> {
  const results = await Promise.allSettled(
    COMMON_DKIM_SELECTORS.map(async (selector) => {
      const { answers } = await resolve(`${selector}._domainkey.${domain}`, "TXT");
      const value = txtValues(answers).find((v) => v.includes("v=DKIM1"));
      return value ? { selector, value } : null;
    })
  );
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) return r.value;
  }
  return null;
}

/** Blacklists DNSBL públicas consultadas por IP. */
export const PUBLIC_DNSBL = [
  "zen.spamhaus.org",
  "b.barracudacentral.org",
  "psbl.surriel.com",
];

export interface BlacklistResult {
  lists: string[];
  checked: number;
  skipped: boolean;
}

/**
 * Consulta blacklists DNSBL usando el primer A record del dominio.
 * Una IP listada devuelve respuesta A en `<ip-revertida>.<dnsbl>`.
 */
export async function checkBlacklists(domain: string): Promise<BlacklistResult> {
  const { answers } = await resolve(domain, "A");
  const ips = answers.filter((a) => a.type === 1).map((a) => a.data);
  if (ips.length === 0) {
    return { lists: [], checked: 0, skipped: true };
  }
  const reversed = ips[0].split(".").reverse().join(".");

  const results = await Promise.allSettled(
    PUBLIC_DNSBL.map(async (bl) => {
      const { answers } = await resolve(`${reversed}.${bl}`, "A");
      return answers.some((a) => a.type === 1) ? bl : null;
    })
  );

  const listed: string[] = [];
  let checked = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      checked++;
      if (r.value) listed.push(r.value);
    }
  }
  return { lists: listed, checked, skipped: false };
}
