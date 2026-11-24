import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Banner, Button, Choice, EmptyState, Field, FadeIn, Muted, Title } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { friendlyError, supabase } from '@/lib/supabase';

type Role = 'employer' | 'worker';

export default function SignUp() {
  const params = useLocalSearchParams<{ role?: string }>();
  const [role, setRole] = useState<Role>(params.role === 'worker' ? 'worker' : 'employer');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit() {
    setError(null);
    if (!fullName.trim()) return setError('Escribe tu nombre.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Escribe un correo válido.');
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { role, full_name: fullName.trim(), phone: phone.trim() || null } },
    });
    setBusy(false);
    if (err) return setError(friendlyError(err));
    // With email confirmation on, there is no session until the link is opened.
    if (!data.session) setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <AuthShell back>
        <EmptyState
          icon="mail-unread-outline"
          title="Revisa tu correo"
          text={`Te enviamos un enlace a ${email.trim().toLowerCase()}. Ábrelo para confirmar tu cuenta y luego inicia sesión.`}
        >
          <Button title="Ir a iniciar sesión" icon="log-in-outline" onPress={() => router.replace('/sign-in')} />
        </EmptyState>
      </AuthShell>
    );
  }

  return (
    <AuthShell back>
      <FadeIn style={{ gap: 4 }}>
        <Title>Te damos la bienvenida</Title>
        <Muted>Solo toma un minuto.</Muted>
      </FadeIn>
      <Choice<Role>
        label="Soy"
        value={role}
        onChange={setRole}
        options={[
          { value: 'employer', label: 'Empleador(a)', icon: 'home' },
          { value: 'worker', label: 'Trabajadora / trabajador', icon: 'sparkles' },
        ]}
      />
      <Field label="Nombre completo" value={fullName} onChangeText={setFullName} autoCapitalize="words" icon="person-outline" />
      <Field label="Teléfono (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="5555 1234" icon="call-outline" />
      <Field label="Correo" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
      <Field
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        icon="lock-closed-outline"
        hint="Mínimo 6 caracteres."
      />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      <Button title="Crear cuenta" icon="arrow-forward" onPress={submit} loading={busy} />
      <Muted style={{ textAlign: 'center' }}>
        {role === 'worker'
          ? 'Después conectarás tu cuenta con el código que te dé tu empleador(a).'
          : 'Después agregarás a tu trabajadora y CERO calculará lo que le corresponde.'}
      </Muted>
    </AuthShell>
  );
}
