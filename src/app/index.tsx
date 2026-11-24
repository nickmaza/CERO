import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth';

/** Entry point: sends each person to their own home screen. */
export default function Index() {
  const { session, profile } = useAuth();
  if (!session) return <Redirect href="/bienvenida" />;
  return <Redirect href={profile?.role === 'worker' ? '/mis-pagos' : '/inicio'} />;
}
