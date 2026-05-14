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
  fecha_inicio: string;
  fecha_fin: string;
}

export default function PublicarPage() {
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

      const { data: tematicaData, error: tematicaError } = await supabase
        .from('tematicas_feed360')
        .select('*')
        .eq('id', tematicaId)
        .eq('estado', 'abierta')
        .maybeSingle();

      if (tematicaError) {
        console.error('Error cargando temática:', tematicaError);
      }

      if (!tematicaData) {
        toast.error('Esta temática no está disponible');
        router.push('/perfil/feed360');
        return;
      }

      setTematica(tematicaData);

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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Publicar en {tematica?.titulo}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          {tematica?.descripcion && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{tematica.descripcion}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Imagen</label>
            <Feed360ImageUpload
              value={imagenUrl}
              onChange={setImagenUrl}
              className="w-full max-w-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Texto (opcional)
            </label>
            <Textarea
              placeholder="Escribe algo sobre esta publicación..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {texto.length}/500
            </p>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !imagenUrl}>
              {submitting ? (
                'Publicando...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Publicar
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
