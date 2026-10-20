// Validación y normalización de dominios + límite de peticiones en memoria.

const DOMAIN_RE =
  /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/;

/**
 * Normaliza la entrada del usuario (acepta URLs o dominios sueltos) y
 * devuelve el dominio puro o null si es inválido.
 */
export function normalizeDomain(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let d = input.trim().toLowerCase();
  // Quitar protocolo, rutas, puertos y espacios.
  d = d.replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "").replace(/:.*$/, "");
  // Quitar www. inicial (el dominio raíz es el que importa).
  d = d.replace(/^www\./, "");
  if (d.length === 0 || d.length > 253) return null;
  if (!DOMAIN_RE.test(d)) return null;
  return d;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(input: unknown): boolean {
  return typeof input === "string" && input.length <= 320 && EMAIL_RE.test(input);
}

/**
 * Rate limiter simple en memoria por clave (IP). No es perfecto en entornos
 * serverless multi-instancia, pero frena abusos evidentes sin dependencias.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count++;
  return { ok: true, retryAfterSec: 0 };
}

// Limpieza periódica para evitar fugas de memoria.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}, 60_000).unref?.();
