import { router, useLocalSearchParams } from 'expo-router';

import { useToast } from '@/components/Toast';
import { Banner, Loading, Screen } from '@/components/ui';
import { WorkerForm } from '@/components/WorkerForm';
import type { Employment } from '@/lib/database.types';
import { friendlyError, supabase } from '@/lib/supabase';
import { unwrap, useQuery } from '@/lib/useQuery';

export default function EditWorker() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { data, error, loading } = useQuery(
    async () => unwrap<Employment>(await supabase.from('employments').select('*').eq('id', id).single()),
    [id],
  );

  if (loading && !data) return <Loading />;
  if (!data) return <Screen>{error ? <Banner tone="danger">{error}</Banner> : null}</Screen>;

  return (
    <Screen narrow>
      <WorkerForm
        initial={data}
        submitLabel="Guardar cambios"
        onSubmit={async (values) => {
          const { error: err } = await supabase.from('employments').update(values).eq('id', id);
          if (err) return friendlyError(err);
          toast('Cambios guardados');
          router.back();
          return null;
        }}
      />
    </Screen>
  );
}
