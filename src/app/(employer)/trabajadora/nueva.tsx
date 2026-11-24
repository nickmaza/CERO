import { router } from 'expo-router';

import { useToast } from '@/components/Toast';
import { Screen } from '@/components/ui';
import { WorkerForm } from '@/components/WorkerForm';
import { useAuth } from '@/lib/auth';
import { friendlyError, supabase } from '@/lib/supabase';

export default function NewWorker() {
  const { profile } = useAuth();
  const toast = useToast();
  return (
    <Screen narrow>
      <WorkerForm
        submitLabel="Guardar"
        onSubmit={async (values) => {
          const { data, error } = await supabase
            .from('employments')
            .insert({ ...values, employer_id: profile!.id })
            .select('id')
            .single();
          if (error) return friendlyError(error);
          toast(`${values.worker_name.split(' ')[0]} ya está en tu equipo`);
          router.replace({ pathname: '/trabajadora/[id]', params: { id: data.id } });
          return null;
        }}
      />
    </Screen>
  );
}
