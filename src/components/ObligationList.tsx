import { View } from 'react-native';

import { formatDate } from '@/lib/format';
import { formatQ, type Obligation } from '@/lib/pay';

import { Body, Card, Hero, HeroText, IconCircle, Muted, ProgressBar, colors, type IconName } from './ui';

export function when(daysUntil: number): string {
  if (daysUntil <= 0) return 'Hoy';
  if (daysUntil === 1) return 'Mañana';
  if (daysUntil < 45) return `En ${daysUntil} días`;
  return `En ${Math.round(daysUntil / 30)} meses`;
}

const ICON: Record<Obligation['key'], IconName> = {
  bono14: 'sunny-outline',
  aguinaldo_1: 'gift-outline',
  aguinaldo_2: 'gift-outline',
};

type Item = Obligation & { workerName?: string };

/** The very next legal payment, big and warm, with a bar that fills as the date gets closer. */
export function NextObligationHero({ item, who, delay = 0 }: { item: Item; who?: boolean; delay?: number }) {
  // The bar shows the last 60 days before the due date.
  const progress = 1 - Math.min(item.daysUntil, 60) / 60;
  return (
    <Hero delay={delay} tone={item.daysUntil <= 14 ? 'brand' : 'honey'}>
      <HeroText size={15} style={{ opacity: 0.9, letterSpacing: 0.5 }}>
        PRÓXIMO PAGO DE LEY
      </HeroText>
      <HeroText size={24} bold>
        {item.label}
        {who && item.workerName ? ` · ${item.workerName.split(' ')[0]}` : ''}
      </HeroText>
      <HeroText size={40} bold style={{ letterSpacing: -0.5 }}>
        {formatQ(item.amount)}
      </HeroText>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
        <HeroText size={16}>{formatDate(item.dueDate)}</HeroText>
        <HeroText size={16} bold>
          {when(item.daysUntil)}
        </HeroText>
      </View>
      <ProgressBar value={progress} />
    </Hero>
  );
}

export function ObligationList({ items, who, delay = 0 }: { items: Item[]; who?: boolean; delay?: number }) {
  if (items.length === 0) return <Muted>No hay pagos de ley próximos.</Muted>;
  return (
    <Card delay={delay}>
      {items.map((o, i) => (
        <View
          key={`${o.key}-${o.workerName ?? ''}-${i}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 10,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: colors.line,
          }}
        >
          <IconCircle icon={ICON[o.key]} tone={o.key === 'bono14' ? 'honey' : 'brand'} size={40} />
          <View style={{ flex: 1 }}>
            <Body style={{ fontWeight: '700' }}>{o.label}</Body>
            <Muted>
              {who && o.workerName ? `${o.workerName} · ` : ''}
              {formatDate(o.dueDate)}
            </Muted>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Body style={{ fontWeight: '700' }}>{formatQ(o.amount)}</Body>
            <Muted style={{ color: o.daysUntil <= 14 ? colors.brand : colors.muted, fontWeight: o.daysUntil <= 14 ? '700' : '400' }}>
              {when(o.daysUntil)}
            </Muted>
          </View>
        </View>
      ))}
    </Card>
  );
}
