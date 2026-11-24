import { parseDate } from './pay';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "2026-12-15" → "15 dic 2026" */
export function formatDate(iso: string): string {
  const d = parseDate(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "15/12/2026" → "2026-12-15", or null when it isn't a real date. */
export function parseDMY(input: string): string | null {
  const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(input);
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  try {
    parseDate(iso);
    return iso;
  } catch {
    return null;
  }
}

/** "2026-12-15" → "15/12/2026" */
export function toDMY(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Today's date in Guatemala (UTC−6, no daylight saving time), as YYYY-MM-DD. */
export function todayGT(): string {
  return new Date(Date.now() - 6 * 3_600_000).toISOString().slice(0, 10);
}

/** "Buenos días", "Buenas tardes" or "Buenas noches", by the hour in Guatemala. */
export function greeting(): string {
  const hour = new Date(Date.now() - 6 * 3_600_000).getUTCHours();
  if (hour >= 5 && hour < 12) return 'Buenos días';
  if (hour >= 12 && hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/** Accepts "4,002.28", "4002.28" or "4002,28". Returns null for anything else. */
export function parseAmount(input: string): number | null {
  const s = input.trim().replace(/^Q\s*/i, '');
  if (!s) return null;
  let normalized = s;
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) normalized = s.replace(/,/g, '');
  else if (/^\d+,\d{1,2}$/.test(s)) normalized = s.replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Number(normalized);
}

export const JOB_LABEL: Record<string, string> = {
  limpieza: 'Limpieza',
  cocina: 'Cocina',
  ninera: 'Niñera',
  cuidado: 'Cuidado de adulto mayor',
  jardin: 'Jardinería',
  chofer: 'Chofer',
  otro: 'Otro',
};

export const PAYMENT_LABEL: Record<string, string> = {
  salario: 'Salario',
  bono14: 'Bono 14',
  aguinaldo: 'Aguinaldo',
  vacaciones: 'Vacaciones',
  indemnizacion: 'Indemnización',
  otro: 'Otro pago',
};

export const METHOD_LABEL: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  deposito: 'Depósito',
  otro: 'Otro',
};
