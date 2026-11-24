import { describe, expect, it } from 'vitest';
import {
  aguinaldo,
  bono14,
  checkMinimumWage,
  daysInclusive,
  formatQ,
  parseDate,
  settlement,
  severance,
  upcomingObligations,
  vacationPay,
} from './pay';

describe('daysInclusive', () => {
  it('counts both ends', () => {
    expect(daysInclusive(parseDate('2025-12-01'), parseDate('2026-11-30'))).toBe(365);
    expect(daysInclusive(parseDate('2026-01-01'), parseDate('2026-01-01'))).toBe(1);
    expect(daysInclusive(parseDate('2026-01-02'), parseDate('2026-01-01'))).toBe(0);
  });
  it('rejects impossible dates', () => {
    expect(() => parseDate('2026-02-30')).toThrow();
  });
});

describe('aguinaldo', () => {
  it('pays one full salary for a full 1 Dec – 30 Nov period', () => {
    const r = aguinaldo(4000, '2020-03-15', '2026-11-30');
    expect(r).toMatchObject({ periodStart: '2025-12-01', periodEnd: '2026-11-30', daysWorked: 365, full: true, amount: 4000 });
  });
  it('prorates by days worked when the job started mid-period', () => {
    // Started 1 June 2026: 1 Jun – 30 Nov = 183 days. 4000 × 183 / 365 = 2005.48
    const r = aguinaldo(4000, '2026-06-01', '2026-11-30');
    expect(r.daysWorked).toBe(183);
    expect(r.amount).toBe(2005.48);
  });
  it('prorates up to the last day worked', () => {
    // Leaves 31 Mar 2026: 1 Dec – 31 Mar = 121 days. 4500 × 121 / 365 = 1491.78
    const r = aguinaldo(4500, '2019-01-01', '2026-03-31');
    expect(r.daysWorked).toBe(121);
    expect(r.amount).toBe(1491.78);
  });
  it('uses the period that starts in December', () => {
    expect(aguinaldo(4000, '2020-01-01', '2026-12-10').periodStart).toBe('2026-12-01');
  });
});

describe('bono14', () => {
  it('pays one full salary for a full 1 Jul – 30 Jun period', () => {
    expect(bono14(4002.28, '2024-01-10', '2026-06-30')).toMatchObject({ periodStart: '2025-07-01', amount: 4002.28, full: true });
  });
  it('prorates up to the last day worked', () => {
    // 1 Jul 2025 – 31 Mar 2026 = 274 days. 4500 × 274 / 365 = 3378.08
    const r = bono14(4500, '2019-01-01', '2026-03-31');
    expect(r.daysWorked).toBe(274);
    expect(r.amount).toBe(3378.08);
  });
});

describe('vacationPay', () => {
  it('prorates 15 days over the current year of service', () => {
    // Anniversary 1 Sep 2025, cutoff 28 Feb 2026 = 181 days → 15 × 181/365 = 7.44 days
    const r = vacationPay(3000, '2023-09-01', '2026-02-28');
    expect(r.serviceYearStart).toBe('2025-09-01');
    expect(r.daysInServiceYear).toBe(181);
    expect(r.earnedDays).toBe(7.44);
    expect(r.dailySalary).toBe(100);
    expect(r.amount).toBe(743.84);
  });
  it('adds pending days from earlier years', () => {
    const r = vacationPay(3000, '2023-09-01', '2026-02-28', 15);
    expect(r.totalDays).toBe(22.44);
    expect(r.amount).toBe(2243.84);
  });
  it('never counts days before the job started', () => {
    expect(vacationPay(3000, '2026-02-01', '2026-02-28').daysInServiceYear).toBe(28);
  });
});

describe('severance', () => {
  it('uses the integrated base (average × 14/12) per day of service', () => {
    // 1 Jan 2024 – 31 Dec 2025 = 731 days. Base 4000 × 14/12 = 4666.67. × 731/365 = 9346.12
    const r = severance(4000, '2024-01-01', '2025-12-31');
    expect(r.daysOfService).toBe(731);
    expect(r.integratedMonthlyBase).toBe(4666.67);
    expect(r.amount).toBe(9346.12);
  });
});

describe('settlement', () => {
  const base = { monthlySalary: 4500, employmentStart: '2019-01-01', lastDayWorked: '2026-03-31' };
  it('includes severance only for dismissal without just cause', () => {
    expect(settlement({ ...base, reason: 'renuncia' }).lines.map((l) => l.key)).toEqual(['aguinaldo', 'bono14', 'vacaciones']);
    expect(settlement({ ...base, reason: 'despido_injustificado' }).lines.map((l) => l.key)).toContain('indemnizacion');
  });
  it('totals the lines', () => {
    const r = settlement({ ...base, reason: 'despido_injustificado' });
    const sum = r.lines.reduce((s, l) => s + l.amount, 0);
    expect(r.total).toBeCloseTo(sum, 2);
  });
});

describe('checkMinimumWage', () => {
  it('flags a full-time salary below the 2026 minimum', () => {
    expect(checkMinimumWage(3106, 'CE1', 6)).toEqual({ status: 'below', minimum: 4002.28, shortfall: 896.28 });
    expect(checkMinimumWage(4100, 'CE1', 5).status).toBe('ok');
    expect(checkMinimumWage(3816.9, 'CE2', 5).status).toBe('ok');
  });
  it('does not judge part-time arrangements', () => {
    expect(checkMinimumWage(1500, 'CE1', 2).status).toBe('part_time');
  });
});

describe('upcomingObligations', () => {
  it('in late November lists both aguinaldo halves, then Bono 14', () => {
    const r = upcomingObligations(4000, '2020-01-01', '2026-11-23');
    expect(r.map((o) => [o.key, o.dueDate, o.amount])).toEqual([
      ['aguinaldo_1', '2026-12-15', 2000],
      ['aguinaldo_2', '2027-01-31', 2000],
      ['bono14', '2027-07-15', 4000],
    ]);
    expect(r[0].daysUntil).toBe(22);
  });
  it('in January lists only the second aguinaldo half', () => {
    const keys = upcomingObligations(4000, '2020-01-01', '2027-01-10').map((o) => o.key);
    expect(keys).toEqual(['aguinaldo_2', 'bono14']);
  });
  it('on 10 July still lists this year\'s Bono 14', () => {
    expect(upcomingObligations(4000, '2020-01-01', '2026-07-10')[0]).toMatchObject({ key: 'bono14', dueDate: '2026-07-15' });
  });
  it('prorates for a recent hire', () => {
    // Hired 1 Sep 2026: aguinaldo to 30 Nov = 91 days → 4000 × 91/365 = 997.26
    const ag = upcomingObligations(4000, '2026-09-01', '2026-11-23').filter((o) => o.key.startsWith('aguinaldo'));
    expect(ag[0].amount + ag[1].amount).toBeCloseTo(997.26, 2);
  });
});

describe('formatQ', () => {
  it('formats quetzales', () => {
    expect(formatQ(4252.28)).toBe('Q4,252.28');
    expect(formatQ(1234567.5)).toBe('Q1,234,567.50');
    expect(formatQ(0)).toBe('Q0.00');
  });
});
