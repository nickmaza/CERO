import { useState } from 'react';
import { View } from 'react-native';

import type { Employment } from '@/lib/database.types';
import { JOB_LABEL, parseAmount, parseDMY, toDMY, todayGT } from '@/lib/format';
import { INCENTIVE_BONUS, MINIMUM_WAGE_2026, ZONE_LABEL, checkMinimumWage, formatQ, type EconomicZone } from '@/lib/pay';

import {
  Banner,
  Button,
  Card,
  Choice,
  DateField,
  Divider,
  FadeIn,
  Field,
  MoneyField,
  Muted,
  NumberPicker,
  Row,
  Steps,
  Subtitle,
  Toggle,
  type IconName,
} from './ui';

export interface WorkerFormValues {
  worker_name: string;
  worker_phone: string | null;
  worker_dpi: string | null;
  job_type: string;
  start_date: string;
  days_per_week: number;
  live_in: boolean;
  monthly_salary: number;
  incentive_bonus: number;
  economic_zone: EconomicZone;
  igss_precapi: boolean;
}

const JOB_ICON: Record<string, IconName> = {
  limpieza: 'sparkles-outline',
  cocina: 'restaurant-outline',
  ninera: 'happy-outline',
  cuidado: 'heart-outline',
  jardin: 'leaf-outline',
  chofer: 'car-outline',
  otro: 'ellipsis-horizontal',
};

const STEP_LABELS = ['¿Quién es?', 'Su trabajo', 'Su salario'];

/** Three short steps instead of one long form. */
export function WorkerForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Employment;
  submitLabel: string;
  onSubmit: (values: WorkerFormValues) => Promise<string | null>;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initial?.worker_name ?? '');
  const [phone, setPhone] = useState(initial?.worker_phone ?? '');
  const [dpi, setDpi] = useState(initial?.worker_dpi ?? '');
  const [job, setJob] = useState(initial?.job_type ?? 'limpieza');
  const [start, setStart] = useState(initial ? toDMY(initial.start_date) : toDMY(todayGT()));
  const [days, setDays] = useState(initial?.days_per_week ?? 5);
  const [liveIn, setLiveIn] = useState(initial?.live_in ?? false);
  const [zone, setZone] = useState<EconomicZone>((initial?.economic_zone as EconomicZone) ?? 'CE1');
  const [salary, setSalary] = useState(initial ? String(initial.monthly_salary) : '');
  const [precapi, setPrecapi] = useState(initial?.igss_precapi ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const salaryNum = parseAmount(salary);
  const wage = salaryNum !== null ? checkMinimumWage(salaryNum, zone, days) : null;
  const incentive = initial ? Number(initial.incentive_bonus) : INCENTIVE_BONUS;

  function validate(s: number): string | null {
    if (s === 0 && !name.trim()) return 'Escribe su nombre.';
    if (s === 1) {
      const iso = parseDMY(start);
      if (!iso) return 'Escribe la fecha de inicio como DD/MM/AAAA.';
      if (iso > todayGT()) return 'La fecha de inicio no puede ser futura.';
    }
    if (s === 2 && (salaryNum === null || salaryNum <= 0)) return 'Escribe el salario mensual, por ejemplo 4002.28.';
    return null;
  }

  function next() {
    const err = validate(step);
    setError(err);
    if (!err) setStep((s) => s + 1);
  }

  async function submit() {
    const err = validate(0) ?? validate(1) ?? validate(2);
    setError(err);
    if (err) return;
    setBusy(true);
    const result = await onSubmit({
      worker_name: name.trim(),
      worker_phone: phone.trim() || null,
      worker_dpi: dpi.trim() || null,
      job_type: job,
      start_date: parseDMY(start)!,
      days_per_week: days,
      live_in: liveIn,
      monthly_salary: salaryNum!,
      incentive_bonus: incentive,
      economic_zone: zone,
      igss_precapi: precapi,
    });
    setBusy(false);
    if (result) setError(result);
  }

  return (
    <>
      <Steps step={step} total={3} labels={STEP_LABELS} />

      {step === 0 ? (
        <FadeIn key="s0" style={{ gap: 14 }}>
          <Subtitle>¿Quién trabaja en tu casa?</Subtitle>
          <Field label="Nombre completo" value={name} onChangeText={setName} autoCapitalize="words" icon="person-outline" placeholder="María Ajú" />
          <Field label="Teléfono (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" icon="call-outline" />
          <Field label="DPI (opcional)" value={dpi} onChangeText={setDpi} keyboardType="number-pad" icon="card-outline" hint="Lo necesitarás para inscribirla en el IGSS." />
        </FadeIn>
      ) : null}

      {step === 1 ? (
        <FadeIn key="s1" style={{ gap: 14 }}>
          <Subtitle>¿Qué hace y desde cuándo?</Subtitle>
          <Choice
            label="Trabajo"
            value={job}
            onChange={setJob}
            options={Object.entries(JOB_LABEL).map(([value, label]) => ({ value, label, icon: JOB_ICON[value] }))}
          />
          <DateField label="Fecha de inicio" value={start} onChangeText={setStart} />
          <NumberPicker label="Días de trabajo por semana" value={days} onChange={setDays} min={1} max={7} />
          <Toggle label="Vive en la casa (de planta)" value={liveIn} onChange={setLiveIn} />
          <Choice<EconomicZone>
            label="¿Dónde trabaja?"
            value={zone}
            onChange={setZone}
            options={[
              { value: 'CE1', label: ZONE_LABEL.CE1, icon: 'business-outline' },
              { value: 'CE2', label: ZONE_LABEL.CE2, icon: 'map-outline' },
            ]}
          />
        </FadeIn>
      ) : null}

      {step === 2 ? (
        <FadeIn key="s2" style={{ gap: 14 }}>
          <Subtitle>¿Cuánto gana?</Subtitle>
          <MoneyField
            label="Salario mensual"
            value={salary}
            onChangeText={setSalary}
            placeholder={MINIMUM_WAGE_2026[zone].toFixed(2)}
            hint={`Sin la bonificación incentivo de ${formatQ(incentive)}, que CERO suma aparte.`}
          />
          {days >= 5 ? (
            <Button
              title={`Usar el mínimo 2026: ${formatQ(MINIMUM_WAGE_2026[zone])}`}
              variant="ghost"
              onPress={() => setSalary(MINIMUM_WAGE_2026[zone].toFixed(2))}
            />
          ) : null}
          {wage?.status === 'below' ? (
            <Banner tone="warn">
              Está {formatQ(wage.shortfall)} por debajo del mínimo 2026 para tiempo completo en {ZONE_LABEL[zone]} ({formatQ(wage.minimum)}).
            </Banner>
          ) : wage?.status === 'ok' ? (
            <Banner tone="ok">Cumple con el salario mínimo 2026.</Banner>
          ) : wage?.status === 'part_time' ? (
            <Muted>Para menos de 5 días por semana, el salario mínimo se calcula en proporción.</Muted>
          ) : null}

          {salaryNum ? (
            <Card>
              <Row label="Salario" value={formatQ(salaryNum)} />
              <Row label="Bonificación incentivo" value={formatQ(incentive)} />
              <Row label="Total al mes" value={formatQ(salaryNum + incentive)} strong />
              <Divider />
              <Row label="Bono 14 y aguinaldo, al año" value={formatQ(salaryNum * 2)} icon="gift-outline" />
              <Muted>Por ley son dos salarios extra al año: uno en julio y otro entre diciembre y enero.</Muted>
            </Card>
          ) : null}

          <Toggle
            label="Inscrita en el PRECAPI del IGSS"
            detail="Programa del IGSS para trabajadoras de casa particular, solo en el Departamento de Guatemala."
            value={precapi}
            onChange={setPrecapi}
          />
        </FadeIn>
      ) : null}

      {error ? <Banner tone="danger">{error}</Banner> : null}

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {step > 0 ? (
          <View style={{ flex: 1 }}>
            <Button title="Atrás" variant="secondary" icon="arrow-back" onPress={() => (setError(null), setStep((s) => s - 1))} />
          </View>
        ) : null}
        <View style={{ flex: 2 }}>
          {step < 2 ? (
            <Button title="Siguiente" icon="arrow-forward" onPress={next} />
          ) : (
            <Button title={submitLabel} icon="checkmark" onPress={submit} loading={busy} />
          )}
        </View>
      </View>
    </>
  );
}
