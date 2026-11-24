/**
 * Guatemala household-employment pay rules used by CERO.
 *
 * Sources (checked November 2026):
 * - Minimum wage 2026, Acuerdo Gubernativo 256-2025: non-agricultural CE1 Q4,002.28,
 *   CE2 Q3,816.90, plus the Q250 bonificación incentivo.
 * - Aguinaldo, Decreto 76-78: one ordinary monthly salary per 1 Dec – 30 Nov, prorated;
 *   50% paid in the first half of December, 50% in the second half of January.
 * - Bono 14, Decreto 42-92: one ordinary monthly salary per 1 Jul – 30 Jun, prorated;
 *   paid in the first half of July.
 * - Vacations, Código de Trabajo art. 130: 15 working days after each year of service.
 * - Indemnización, Código de Trabajo art. 82: one month per year of service, prorated,
 *   on the average salary of the last 6 months, plus 1/12 of aguinaldo and 1/12 of Bono 14
 *   ("salario integrado", factor 14/12).
 * - The Q250 incentive bonus is never part of the base for these calculations.
 *
 * All amounts are in quetzales. Dates are ISO strings (YYYY-MM-DD) and are handled in UTC,
 * so the result never depends on the phone's time zone. Every result is a guide, not legal
 * advice; formulas should be reviewed by a Guatemalan accountant before launch.
 */

export type EconomicZone = 'CE1' | 'CE2';

export const INCENTIVE_BONUS = 250;

export const MINIMUM_WAGE_2026: Record<EconomicZone, number> = {
  CE1: 4002.28,
  CE2: 3816.9,
};

export const ZONE_LABEL: Record<EconomicZone, string> = {
  CE1: 'Departamento de Guatemala',
  CE2: 'Resto del país',
};

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365;

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function parseDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Fecha no válida: ${iso}`);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.getUTCMonth() !== Number(m[2]) - 1) throw new Error(`Fecha no válida: ${iso}`);
  return d;
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utc(y: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(y, monthIndex, day));
}

/** Days from start to end, counting both days. 0 if end is before start. */
export function daysInclusive(start: Date, end: Date): number {
  const diff = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  return diff < 0 ? 0 : diff + 1;
}

/** "2025-12-01" → "01/12/2025" */
function dmy(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b;
}
function minDate(a: Date, b: Date): Date {
  return a < b ? a : b;
}

export interface BonusResult {
  periodStart: string;
  periodEnd: string;
  /** Days of the period the worker was employed, up to the cutoff date. */
  daysWorked: number;
  amount: number;
  /** True when the worker covered the whole period, so she earns one full salary. */
  full: boolean;
}

function prorate(
  monthlySalary: number,
  employmentStart: Date,
  periodStart: Date,
  periodEnd: Date,
  cutoff: Date,
): BonusResult {
  const from = maxDate(periodStart, employmentStart);
  const to = minDate(periodEnd, cutoff);
  const periodDays = daysInclusive(periodStart, periodEnd);
  const daysWorked = daysInclusive(from, to);
  const full = daysWorked >= periodDays;
  const amount = full ? monthlySalary : (monthlySalary * daysWorked) / YEAR_DAYS;
  return {
    periodStart: toISO(periodStart),
    periodEnd: toISO(periodEnd),
    daysWorked,
    amount: round2(Math.min(amount, monthlySalary)),
    full,
  };
}

/** The aguinaldo period (1 Dec – 30 Nov) that contains the given date. */
export function aguinaldoPeriod(on: Date): { start: Date; end: Date } {
  const y = on.getUTCFullYear();
  const startYear = on.getUTCMonth() === 11 ? y : y - 1;
  return { start: utc(startYear, 11, 1), end: utc(startYear + 1, 10, 30) };
}

/** The Bono 14 period (1 Jul – 30 Jun) that contains the given date. */
export function bono14Period(on: Date): { start: Date; end: Date } {
  const y = on.getUTCFullYear();
  const startYear = on.getUTCMonth() >= 6 ? y : y - 1;
  return { start: utc(startYear, 6, 1), end: utc(startYear + 1, 5, 30) };
}

/**
 * Aguinaldo earned in the period that contains `cutoff`, counting up to `cutoff`.
 * Pass the period end (30 Nov) as cutoff to get the amount due in December.
 */
export function aguinaldo(monthlySalary: number, employmentStart: string, cutoff: string): BonusResult {
  const c = parseDate(cutoff);
  const p = aguinaldoPeriod(c);
  return prorate(monthlySalary, parseDate(employmentStart), p.start, p.end, c);
}

/**
 * Bono 14 earned in the period that contains `cutoff`, counting up to `cutoff`.
 * Pass the period end (30 Jun) as cutoff to get the amount due in July.
 */
export function bono14(monthlySalary: number, employmentStart: string, cutoff: string): BonusResult {
  const c = parseDate(cutoff);
  const p = bono14Period(c);
  return prorate(monthlySalary, parseDate(employmentStart), p.start, p.end, c);
}

export interface VacationResult {
  /** Start of the current, not yet completed, year of service. */
  serviceYearStart: string;
  daysInServiceYear: number;
  /** Vacation days earned so far in the current year of service. */
  earnedDays: number;
  /** Earned days plus any full-year days not yet taken. */
  totalDays: number;
  dailySalary: number;
  amount: number;
}

/**
 * Vacation pay owed at `cutoff` (usually the last day worked): 15 days per year of service,
 * prorated for the current year, plus `pendingDays` from earlier years not yet taken.
 */
export function vacationPay(
  monthlySalary: number,
  employmentStart: string,
  cutoff: string,
  pendingDays = 0,
): VacationResult {
  const start = parseDate(employmentStart);
  const c = parseDate(cutoff);
  let anniversary = utc(c.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  if (anniversary > c) anniversary = utc(c.getUTCFullYear() - 1, start.getUTCMonth(), start.getUTCDate());
  if (anniversary < start) anniversary = start;
  const daysInServiceYear = daysInclusive(anniversary, c);
  const earnedDays = Math.min(15, (15 * daysInServiceYear) / YEAR_DAYS);
  const totalDays = earnedDays + Math.max(0, pendingDays);
  const dailySalary = monthlySalary / 30;
  return {
    serviceYearStart: toISO(anniversary),
    daysInServiceYear,
    earnedDays: round2(earnedDays),
    totalDays: round2(totalDays),
    dailySalary: round2(dailySalary),
    amount: round2(dailySalary * totalDays),
  };
}

export interface SeveranceResult {
  daysOfService: number;
  /** Average salary of the last 6 months times 14/12. */
  integratedMonthlyBase: number;
  amount: number;
}

/**
 * Indemnización (Código de Trabajo art. 82) for a dismissal without just cause.
 * `averageSalaryLast6Months` excludes the Q250 incentive bonus.
 */
export function severance(
  averageSalaryLast6Months: number,
  employmentStart: string,
  lastDayWorked: string,
): SeveranceResult {
  const daysOfService = daysInclusive(parseDate(employmentStart), parseDate(lastDayWorked));
  const integratedMonthlyBase = (averageSalaryLast6Months * 14) / 12;
  return {
    daysOfService,
    integratedMonthlyBase: round2(integratedMonthlyBase),
    amount: round2((integratedMonthlyBase * daysOfService) / YEAR_DAYS),
  };
}

export type EndReason = 'renuncia' | 'despido_injustificado' | 'despido_justificado' | 'mutuo_acuerdo' | 'otro';

export const END_REASON_LABEL: Record<EndReason, string> = {
  renuncia: 'Renuncia de la trabajadora',
  despido_injustificado: 'Despido sin causa justificada',
  despido_justificado: 'Despido con causa justificada',
  mutuo_acuerdo: 'Mutuo acuerdo',
  otro: 'Otro',
};

export interface SettlementLine {
  key: 'aguinaldo' | 'bono14' | 'vacaciones' | 'indemnizacion';
  label: string;
  amount: number;
  detail: string;
}

export interface SettlementResult {
  lines: SettlementLine[];
  total: number;
}

/** Everything owed when the job ends, apart from salary days not yet paid. */
export function settlement(input: {
  monthlySalary: number;
  averageSalaryLast6Months?: number;
  employmentStart: string;
  lastDayWorked: string;
  reason: EndReason;
  pendingVacationDays?: number;
}): SettlementResult {
  const avg = input.averageSalaryLast6Months ?? input.monthlySalary;
  const ag = aguinaldo(input.monthlySalary, input.employmentStart, input.lastDayWorked);
  const b14 = bono14(input.monthlySalary, input.employmentStart, input.lastDayWorked);
  const vac = vacationPay(input.monthlySalary, input.employmentStart, input.lastDayWorked, input.pendingVacationDays);
  const lines: SettlementLine[] = [
    {
      key: 'aguinaldo',
      label: 'Aguinaldo proporcional',
      amount: ag.amount,
      detail: `${ag.daysWorked} días desde el ${dmy(ag.periodStart)}`,
    },
    {
      key: 'bono14',
      label: 'Bono 14 proporcional',
      amount: b14.amount,
      detail: `${b14.daysWorked} días desde el ${dmy(b14.periodStart)}`,
    },
    {
      key: 'vacaciones',
      label: 'Vacaciones no gozadas',
      amount: vac.amount,
      detail: `${vac.totalDays} días a Q${vac.dailySalary.toFixed(2)} diarios`,
    },
  ];
  if (input.reason === 'despido_injustificado') {
    const sev = severance(avg, input.employmentStart, input.lastDayWorked);
    lines.push({
      key: 'indemnizacion',
      label: 'Indemnización',
      amount: sev.amount,
      detail: `${sev.daysOfService} días de servicio sobre Q${sev.integratedMonthlyBase.toFixed(2)} mensuales`,
    });
  }
  return { lines, total: round2(lines.reduce((s, l) => s + l.amount, 0)) };
}

export type WageCheck =
  | { status: 'ok' | 'below'; minimum: number; shortfall: number }
  | { status: 'part_time'; minimum: number; shortfall: 0 };

/**
 * Compares a full-time salary (5+ days a week) with the 2026 minimum for the zone.
 * Part-time arrangements are flagged rather than judged, since the minimum is prorated.
 */
export function checkMinimumWage(monthlySalary: number, zone: EconomicZone, daysPerWeek: number): WageCheck {
  const minimum = MINIMUM_WAGE_2026[zone];
  if (daysPerWeek < 5) return { status: 'part_time', minimum, shortfall: 0 };
  const shortfall = round2(Math.max(0, minimum - monthlySalary));
  return { status: shortfall > 0 ? 'below' : 'ok', minimum, shortfall };
}

export interface Obligation {
  key: 'bono14' | 'aguinaldo_1' | 'aguinaldo_2';
  label: string;
  dueDate: string;
  amount: number;
  daysUntil: number;
}

/**
 * The next legal bonus payments after `today`: Bono 14 by 15 July, and the aguinaldo
 * in two halves, by 15 December and by 31 January. Amounts are projected to the end
 * of each period, assuming the job continues at the same salary.
 */
export function upcomingObligations(monthlySalary: number, employmentStart: string, today: string): Obligation[] {
  const t = parseDate(today);
  const start = parseDate(employmentStart);
  const out: Obligation[] = [];

  // Bono 14 for the period that ends on the next 30 June.
  let b14End = utc(t.getUTCFullYear(), 5, 30);
  let b14Due = utc(t.getUTCFullYear(), 6, 15);
  if (t > b14Due) {
    b14End = utc(t.getUTCFullYear() + 1, 5, 30);
    b14Due = utc(t.getUTCFullYear() + 1, 6, 15);
  }
  if (start <= b14End) {
    const r = bono14(monthlySalary, employmentStart, toISO(b14End));
    out.push({ key: 'bono14', label: 'Bono 14', dueDate: toISO(b14Due), amount: r.amount, daysUntil: daysInclusive(t, b14Due) - 1 });
  }

  // Aguinaldo for the period that ends on the next 30 November: half by 15 Dec, half by 31 Jan.
  // In January the period that ended last 30 November still has its second half due.
  const agEnd =
    t.getUTCMonth() === 0 ? utc(t.getUTCFullYear() - 1, 10, 30) : utc(t.getUTCFullYear(), 10, 30);
  if (start <= agEnd) {
    const r = aguinaldo(monthlySalary, employmentStart, toISO(agEnd));
    const half = round2(r.amount / 2);
    const firstDue = utc(agEnd.getUTCFullYear(), 11, 15);
    const secondDue = utc(agEnd.getUTCFullYear() + 1, 0, 31);
    if (t <= firstDue) {
      out.push({ key: 'aguinaldo_1', label: 'Aguinaldo (primera mitad)', dueDate: toISO(firstDue), amount: half, daysUntil: daysInclusive(t, firstDue) - 1 });
    }
    if (t <= secondDue) {
      out.push({ key: 'aguinaldo_2', label: 'Aguinaldo (segunda mitad)', dueDate: toISO(secondDue), amount: round2(r.amount - half), daysUntil: daysInclusive(t, secondDue) - 1 });
    }
  }

  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function formatQ(n: number): string {
  const [int, dec] = round2(n).toFixed(2).split('.');
  return `Q${int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`;
}
