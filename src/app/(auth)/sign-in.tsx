import { router } from 'expo-router';
import { useState } from 'react';

import { Banner, Button, FadeIn, Field, Muted, Title } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { friendlyError, supabase } from '@/lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setBusy(false);
    // On success the root layout sees the session and opens the right home screen.
    if (err) setError(friendlyError(err));
  }

  return (
    <AuthShell back>
      <FadeIn style={{ gap: 4 }}>
        <Title>Qué gusto verte</Title>
        <Muted>Entra con tu correo y contraseña.</Muted>
      </FadeIn>
      <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
      <Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" icon="lock-closed-outline" />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button title="Entrar" icon="log-in-outline" onPress={submit} loading={busy} />
      <Button title="Crear una cuenta nueva" variant="ghost" onPress={() => router.replace('/sign-up')} />
    </AuthShell>
  );
}
