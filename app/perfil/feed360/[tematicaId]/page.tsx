'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Feed360ImageUpload } from '@/components/feed360/Feed360ImageUpload';
import { toast } from 'sonner';

interface Tematica {
  id: string;
  titulo: string;
  descripcion: string | null;
}

export default function PerfilPublicarFeed360Page() {
  const router = useRouter();
  const params = useParams();
  const tematicaId = params.tematicaId as string;

  const [tematica, setTematica] = useState<Tematica | null>(null);
  const [texto, setTexto] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!tematicaId) return;

      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userNomina } = await supabase
        .from('usuario_nomina')
        .select('id')
        .eq('auth_user_id', session.user.id)
        .single();

      if (!userNomina?.id) {
        toast.error('No se encontró el usuario asociado');
        router.push('/perfil/feed360');
        return;
      }

      const tematicaRes = await fetch(`/api/feed360/tematicas/${tematicaId}`);
      const tematicaData = tematicaRes.ok ? await tematicaRes.json() : null;

      if (!tematicaData || tematicaData.estado !== 'abierta') {
        toast.error('Esta temática no está disponible');
        router.push('/perfil/feed360');
        return;
      }

      setTematica(tematicaData);

      const { data: existing, error: existingError } = await supabase
        .from('publicaciones_feed360')
        .select('id')
        .eq('tematica_id', tematicaId)
        .eq('usuario_id', userNomina.id)
        .maybeSingle();

      if (existingError) {
        console.error('Error validando publicación existente:', existingError);
      }

      if (existing) {
        toast.error('Ya has publicado en esta temática');
        router.push('/perfil/feed360');
        return;
      }

      setLoading(false);
    };

    loadData();
  }, [router, tematicaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!imagenUrl) {
      toast.error('Sube una imagen para publicar');
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('No autenticado');
      }

      const res = await fetch('/api/feed360/publicaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tematica_id: tematicaId,
          imagen_url: imagenUrl,
          texto: texto.trim(),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al publicar');
      }

      toast.success('¡Publicación creada!');
      router.push('/perfil/feed360');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Cargando...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/perfil/feed360')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Publicar en {tematica?.titulo}</h1>
      </div>

      {tematica?.descripcion && (
        <div className="bg-muted rounded-lg p-4">
          <p className="text-sm text-muted-foreground">{tematica.descripcion}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-4 md:p-6 rounded-lg border">
        <div>
          <label className="block text-sm font-medium mb-2">Imagen</label>
          <Feed360ImageUpload value={imagenUrl} onChange={setImagenUrl} className="w-full max-w-md" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Texto (opcional)</label>
          <Textarea
            placeholder="Escribe algo sobre esta publicación..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1 text-right">{texto.length}/500</p>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/perfil/feed360')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || !imagenUrl}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? 'Publicando...' : 'Publicar'}
          </Button>
        </div>
      </form>
    </div>
  );
}
