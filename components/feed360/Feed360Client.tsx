'use client';

import { useState, useEffect, useRef } from 'react';
import { Plus, Search, ChevronRight, Heart, MessageCircle } from 'lucide-react';
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
  imagen_url: string;
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
  showTopRanking?: boolean;
}

const PAGE_SIZE = 20;

export function Feed360Client({
  usuarioId,
  tematicaActiva,
  publishBasePath = '/feed360',
  showTopRanking = false,
}: Feed360ClientProps) {
  const [allTematicas, setAllTematicas] = useState<Tematica[]>([]);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [topPublicaciones, setTopPublicaciones] = useState<Publicacion[]>([]);
  const [selectedTematica, setSelectedTematica] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingTop, setLoadingTop] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [hasPublished, setHasPublished] = useState(false);
  const [showAllTematicas, setShowAllTematicas] = useState(false);
  const [selectedTopPublicacion, setSelectedTopPublicacion] = useState<Publicacion | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createSupabaseClient> | null>(null);
  const subscriptionRef = useRef<ReturnType<ReturnType<typeof createSupabaseClient>['subscribe']> | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabaseRef.current = createSupabaseClient();
    fetchTematicas();
    fetchPublicaciones({ reset: true });

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!loadMoreRef.current || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting) {
          fetchPublicaciones({ reset: false });
        }
      },
      { rootMargin: '250px 0px' }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, offset, selectedTematica, search]);

  useEffect(() => {
    if (!showTopRanking) return;
    fetchTopPublicaciones();
  }, [showTopRanking, selectedTematica, allTematicas]);

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

  const fetchPublicaciones = async ({
    reset = false,
    tematicaId,
  }: {
    reset?: boolean;
    tematicaId?: string | null;
  } = {}) => {
    const currentOffset = reset ? 0 : offset;
    const tematicaToUse = tematicaId !== undefined ? tematicaId : selectedTematica;

    if (reset) {
      setLoading(true);
      setHasMore(true);
    } else {
      if (loadingMore || loading || !hasMore) return;
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      if (tematicaToUse) params.set('tematica_id', tematicaToUse);
      if (search) params.set('search', search);
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', String(currentOffset));

      const res = await fetch(`/api/feed360/publicaciones?${params}`);
      if (res.ok) {
        const data = await res.json();
        const publicacionesNuevas = Array.isArray(data) ? data : [];

        setPublicaciones((prev) => {
          if (reset) return publicacionesNuevas;

          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = publicacionesNuevas.filter((p: Publicacion) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });

        const loadedCount = publicacionesNuevas.length;
        setHasMore(loadedCount === PAGE_SIZE);
        setOffset(currentOffset + loadedCount);
      }
    } catch (error) {
      console.error('Error fetching publicaciones:', error);
    } finally {
      if (reset) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
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

  const fetchTopPublicaciones = async () => {
    const tematicaId = selectedTematica || tematicaActiva?.id || allTematicas[0]?.id;

    if (!tematicaId) {
      setTopPublicaciones([]);
      setLoadingTop(false);
      return;
    }

    setLoadingTop(true);
    try {
      const params = new URLSearchParams();
      params.set('tematica_id', tematicaId);
      params.set('sort', 'likes_desc');
      params.set('limit', '5');
      params.set('offset', '0');

      const res = await fetch(`/api/feed360/publicaciones?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTopPublicaciones(Array.isArray(data) ? data.slice(0, 5) : []);
      }
    } catch (error) {
      console.error('Error loading top publicaciones:', error);
    } finally {
      setLoadingTop(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchPublicaciones({ reset: true });
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

    if (!showTopRanking) return;

    setTopPublicaciones((prev) => {
      const updated = prev.map((p) =>
        p.id === publicacionId
          ? {
            ...p,
            likes_count:
              typeof likesCount === 'number'
                ? likesCount
                : p.likes_count + (liked ? 1 : -1),
          }
          : p
      );

      return [...updated]
        .sort((a, b) => b.likes_count - a.likes_count)
        .slice(0, 5);
    });
  };

  const visibleTematicas = allTematicas.slice(0, 5);
  const selectedTematicaData = selectedTematica
    ? allTematicas.find((t) => t.id === selectedTematica) || null
    : null;
  const tematicaVigente = tematicaActiva || allTematicas[0] || null;
  const tematicaTopActiva = selectedTematica
    ? allTematicas.find((t) => t.id === selectedTematica) || null
    : tematicaVigente;

  return (
    <div className="min-h-screen,radial-gradient(circle_at_74%_36%,rgba(234,215,168,0.55)_0_8%,transparent_8.2%),linear-gradient(120deg,#fafafa,#ededeb)]">
      <div className={cn(
        'grid grid-cols-1 gap-6 lg:gap-8',
        showTopRanking
          ? 'lg:grid-cols-[280px_minmax(0,740px)_360px]'
          : 'lg:grid-cols-[280px_minmax(0,720px)]'
      )}>
        <aside className="bg-white/85 border border-white/80 rounded-[10px] p-5 md:p-6 sticky top-6 h-fit shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="font-black text-[22px] tracking-[-0.03em] mb-4">Feed360</div>
          {tematicaVigente?.imagen_url && (
            <div className="mb-4 rounded-xl overflow-hidden border border-neutral-200 bg-white">
              <div className="relative aspect-[16/9]">
                <img
                  src={tematicaVigente.imagen_url}
                  alt={tematicaVigente.titulo}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-white/80">Tematica vigente</p>
                  <p className="text-sm font-semibold leading-tight">{tematicaVigente.titulo}</p>
                </div>
              </div>
            </div>
          )}
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
                    setOffset(0);
                    fetchPublicaciones({ reset: true, tematicaId: null });
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
                    setOffset(0);
                    fetchPublicaciones({ reset: true, tematicaId: tematica.id });
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
                    setOffset(0);
                    fetchPublicaciones({ reset: true, tematicaId: null });
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
                      setOffset(0);
                      fetchPublicaciones({ reset: true, tematicaId: tematica.id });
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
            {selectedTematicaData?.imagen_url && (
              <div className="relative aspect-[3/1] w-full rounded-t-[10px] overflow-hidden">
                <img
                  src={selectedTematicaData.imagen_url}
                  alt={selectedTematicaData.titulo}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-0 left-0 p-4 text-white">
                  <h2 className="text-xl font-bold">
                    {selectedTematicaData.titulo}
                  </h2>
                  {selectedTematicaData.descripcion && (
                    <p className="text-sm text-white/80 mt-1">
                      {selectedTematicaData.descripcion}
                    </p>
                  )}
                </div>
              </div>
            )}

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
                {loadingMore && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Cargando más publicaciones...
                  </div>
                )}
                {hasMore && <div ref={loadMoreRef} className="h-1" />}
              </div>
            )}
          </div>
        </main>

        {showTopRanking && (
          <aside className="hidden lg:block">
            <div className="sticky top-6 bg-white/85 border border-white/80 rounded-[10px] p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-[20px] tracking-[-0.02em]">Top 5</h3>
                <span className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">Más likes</span>
              </div>
              <p className="text-xs text-neutral-500 mb-4">
                {tematicaTopActiva ? `Temática: ${tematicaTopActiva.titulo}` : 'Sin temática activa'}
              </p>

              {loadingTop ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-neutral-100 animate-pulse" />
                  ))}
                </div>
              ) : topPublicaciones.length === 0 ? (
                <div className="text-sm text-neutral-500 py-8 text-center">
                  No hay publicaciones para esta temática.
                </div>
              ) : (
                <div className="space-y-3 pr-1">
                  {topPublicaciones.slice(0, 5).map((publicacion, index) => (
                    <button
                      key={publicacion.id}
                      type="button"
                      onClick={() => setSelectedTopPublicacion(publicacion)}
                      className="w-full rounded-xl border border-neutral-200 bg-white p-3 flex items-center gap-3 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <div className="w-7 text-center text-base font-bold text-neutral-700">{index + 1}</div>
                      <div className="h-16 w-16 rounded-md overflow-hidden bg-neutral-100 shrink-0">
                        <img
                          src={publicacion.imagen_url}
                          alt="Miniatura publicación"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-neutral-800 truncate">
                          {publicacion.usuario?.colaborador || 'Usuario'}
                        </p>
                        <p className="text-[13px] text-neutral-500 truncate">
                          {publicacion.texto || 'Publicación sin texto'}
                        </p>
                        <div className="mt-1 flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-rose-500 font-semibold">
                            <Heart className="h-3.5 w-3.5 fill-current" />
                            {publicacion.likes_count}
                          </span>
                          <span className="flex items-center gap-1 text-sky-600 font-semibold">
                            <MessageCircle className="h-3.5 w-3.5" />
                            {publicacion.comentarios_count || 0}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {showTopRanking && (
        <Dialog
          open={!!selectedTopPublicacion}
          onOpenChange={(open) => {
            if (!open) setSelectedTopPublicacion(null);
          }}
        >
          <DialogContent className="max-w-[860px] max-h-[90vh] overflow-y-auto p-0 border-0 bg-transparent shadow-none">
            {selectedTopPublicacion && (
              <div className="rounded-[10px] bg-white border border-white/80 shadow-[0_18px_45px_rgba(0,0,0,0.18)] overflow-hidden">
                <Feed360Card
                  publicacion={selectedTopPublicacion}
                  usuarioId={usuarioId}
                  onLikeUpdate={handleLikeUpdate}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
