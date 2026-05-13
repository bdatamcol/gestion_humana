'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, X, ChevronRight, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Feed360Card } from './Feed360Card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createSupabaseClient } from '@/lib/supabase';

interface Tematica {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

interface Publicacion {
  id: string;
  tematica_id: string;
  imagen_url: string;
  texto: string | null;
  likes_count: number;
  comentarios_count?: number;
  created_at: string;
  tematica?: { id: string; titulo: string };
  usuario?: { id: number; colaborador: string; imagen_perfil: string | null };
  likes?: { usuario_id: number }[];
}

interface Feed360ClientProps {
  usuarioId: number;
  tematicaActiva?: Tematica | null;
  publishBasePath?: string;
}

export function Feed360Client({
  usuarioId,
  tematicaActiva,
  publishBasePath = '/feed360',
}: Feed360ClientProps) {
  const [allTematicas, setAllTematicas] = useState<Tematica[]>([]);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [selectedTematica, setSelectedTematica] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasPublished, setHasPublished] = useState(false);
  const [showAllTematicas, setShowAllTematicas] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createSupabaseClient> | null>(null);
  const subscriptionRef = useRef<ReturnType<ReturnType<typeof createSupabaseClient>['subscribe']> | null>(null);

  useEffect(() => {
    supabaseRef.current = createSupabaseClient();
    fetchTematicas();
    fetchPublicaciones();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabaseRef.current) return;

    subscriptionRef.current = supabaseRef.current
      .channel('feed360:publicaciones')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'publicaciones_feed360',
          filter: selectedTematica ? `tematica_id=eq.${selectedTematica}` : undefined,
        },
        (payload) => {
          const newPub = payload.new as Publicacion;
          setPublicaciones((prev) => {
            const exists = prev.some((p) => p.id === newPub.id);
            if (exists) return prev;
            return [newPub, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'publicaciones_feed360',
        },
        (payload) => {
          const updatedPub = payload.new as Publicacion;
          setPublicaciones((prev) =>
            prev.map((p) =>
              p.id === updatedPub.id
                ? { ...p, ...updatedPub }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [selectedTematica]);

  useEffect(() => {
    if (tematicaActiva && usuarioId) {
      checkIfUserPublished();
    }
  }, [tematicaActiva, usuarioId]);

  const fetchTematicas = async () => {
    try {
      const res = await fetch('/api/feed360/tematicas');
      if (res.ok) {
        const data = await res.json();
        setAllTematicas(data);
      }
    } catch (error) {
      console.error('Error fetching temáticas:', error);
    }
  };

  const fetchPublicaciones = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTematica) params.set('tematica_id', selectedTematica);
      if (search) params.set('search', search);

      const res = await fetch(`/api/feed360/publicaciones?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPublicaciones(data);
      }
    } catch (error) {
      console.error('Error fetching publicaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkIfUserPublished = async () => {
    if (!tematicaActiva) return;
    try {
      const res = await fetch(
        `/api/feed360/publicaciones?tematica_id=${tematicaActiva.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setHasPublished(data.some((p: Publicacion) => p.usuario?.id === usuarioId));
      }
    } catch (error) {
      console.error('Error checking publication:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPublicaciones();
  };

  const handleLikeUpdate = (publicacionId: string, liked: boolean, likesCount?: number) => {
    setPublicaciones((prev) =>
      prev.map((p) =>
        p.id === publicacionId
          ? {
            ...p,
            likes_count:
              typeof likesCount === 'number'
                ? likesCount
                : p.likes_count + (liked ? 1 : -1),
          }
          : p
      )
    );
  };

  const visibleTematicas = allTematicas.slice(0, 5);

  return (
    <div className="min-h-screen,radial-gradient(circle_at_74%_36%,rgba(234,215,168,0.55)_0_8%,transparent_8.2%),linear-gradient(120deg,#fafafa,#ededeb)]">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,720px)] lg:gap-8">
        <aside className="bg-white/85 border border-white/80 rounded-[10px] p-5 md:p-6 sticky top-6 h-fit shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="font-black text-[22px] tracking-[-0.03em] mb-4">Feed360</div>
          <div className="mb-4">
            <h2 className="font-semibold text-xs tracking-[0.12em] text-neutral-500 uppercase mb-3">Temáticas</h2>
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar temática..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-neutral-50 rounded-xl border border-neutral-200 h-10 text-sm w-full"
              />
            </form>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => {
                setSelectedTematica(null);
                fetchPublicaciones();
              }}
              className={cn(
                'w-full text-left px-4 py-3 rounded-xl text-[15px] font-semibold transition-colors flex items-center gap-2',
                !selectedTematica
                  ? 'bg-neutral-950 text-white'
                  : 'hover:bg-neutral-100 text-neutral-700'
              )}
            >
              <span className={cn('h-2.5 w-2.5 rounded-full', !selectedTematica ? 'bg-[#ead7a8]' : 'bg-[#ead7a8]')} />
              Todas
            </button>
            {visibleTematicas.map((tematica) => (
              <button
                key={tematica.id}
                onClick={() => {
                  setSelectedTematica(tematica.id);
                  fetchPublicaciones();
                }}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-xl text-[15px] font-semibold transition-colors flex items-center gap-2',
                  selectedTematica === tematica.id
                    ? 'bg-neutral-950 text-white'
                    : 'hover:bg-neutral-100 text-neutral-700'
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-[#ead7a8]" />
                {tematica.titulo}
              </button>
            ))}
            {allTematicas.length > 5 && (
              <button
                onClick={() => setShowAllTematicas(true)}
                className="w-full text-left px-4 py-3 rounded-lg text-[15px] font-medium text-neutral-500 hover:bg-neutral-50 flex items-center gap-1"
              >
                <ChevronRight className="h-4 w-4" />
                Mostrar todas
              </button>
            )}
          </div>

          <Dialog open={showAllTematicas} onOpenChange={setShowAllTematicas}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Todas las Temáticas</DialogTitle>
              </DialogHeader>
              <div className="max-h-[400px] overflow-y-auto space-y-2 py-2">
                <button
                  onClick={() => {
                    setSelectedTematica(null);
                    setShowAllTematicas(false);
                    fetchPublicaciones();
                  }}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg text-[15px] font-medium transition-colors',
                    !selectedTematica
                      ? 'bg-neutral-950 text-white'
                      : 'hover:bg-neutral-100 text-neutral-700'
                  )}
                >
                  Todas
                </button>
                {allTematicas.map((tematica) => (
                  <button
                    key={tematica.id}
                    onClick={() => {
                      setSelectedTematica(tematica.id);
                      setShowAllTematicas(false);
                      fetchPublicaciones();
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-lg text-[15px] font-medium transition-colors',
                      selectedTematica === tematica.id
                        ? 'bg-neutral-950 text-white'
                        : 'hover:bg-neutral-100 text-neutral-700'
                    )}
                  >
                    {tematica.titulo}
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </aside>

        <main className="flex-1">
          <div className="w-full max-w-[720px] mx-auto space-y-7 bg-white/85 border border-white/80 rounded-[10px]">

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                Cargando publicaciones...
              </div>
            ) : publicaciones.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hay publicaciones aún</p>
                {tematicaActiva && !hasPublished && (
                  <Button className="mt-4 rounded-lg" asChild>
                    <a href={`${publishBasePath}/${tematicaActiva.id}`}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ser el primero en publicar
                    </a>
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-7">
                {publicaciones.map((publicacion) => (
                  <Feed360Card
                    key={publicacion.id}
                    publicacion={publicacion}
                    usuarioId={usuarioId}
                    onLikeUpdate={handleLikeUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
