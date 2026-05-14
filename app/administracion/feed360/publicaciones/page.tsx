'use client';

import { useEffect, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Feed360Card } from '@/components/feed360/Feed360Card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Publicacion {
  id: string;
  texto: string | null;
  imagen_url: string;
  likes_count: number;
  created_at: string;
  tematica?: { id: string; titulo: string };
  usuario?: { id: number; colaborador: string; imagen_perfil: string | null } | null;
  likes?: { usuario_id: number }[];
}

interface Tematica {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  imagen_url: string;
}

export default function Feed360AdminPublicacionesPage() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [allTematicas, setAllTematicas] = useState<Tematica[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTematica, setSelectedTematica] = useState<string | null>(null);
  const [showAllTematicas, setShowAllTematicas] = useState(false);
  const [adminUserId, setAdminUserId] = useState<number>(0);

  useEffect(() => {
    const loadUser = async () => {
      const { createSupabaseClient } = await import('@/lib/supabase');
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('usuario_nomina')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .single();
        if (data?.id) setAdminUserId(data.id);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    fetchTematicas();
    fetchPublicaciones();
  }, []);

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
      const res = await fetch(`/api/feed360/publicaciones?${params}&limit=100`);
      if (res.ok) {
        const data = await res.json();
        setPublicaciones(data);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (publicacionId: string) => {
    setPublicaciones((prev) => prev.filter((p) => p.id !== publicacionId));
    toast.success('Publicación eliminada');
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

  const filteredPublicaciones = publicaciones.filter(
    (p) =>
      p.usuario?.colaborador?.toLowerCase().includes(search.toLowerCase()) ||
      p.tematica?.titulo?.toLowerCase().includes(search.toLowerCase()) ||
      p.texto?.toLowerCase().includes(search.toLowerCase())
  );

  const visibleTematicas = allTematicas.slice(0, 5);
  const tematicaVigente = allTematicas[0] || null;

  return (
    <div className="min-h-screen,transparent_8.2%),radial-gradient(circle_at_74%_36%,rgba(234,215,168,0.55)_0_8%,transparent_8.2%),linear-gradient(120deg,#fafafa,#ededeb)]">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,720px)] lg:gap-8">
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
            <form onSubmit={(e) => { e.preventDefault(); fetchPublicaciones(); }} className="relative">
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
              <span className="h-2.5 w-2.5 rounded-full bg-[#ead7a8]" />
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
              <div className="space-y-7">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white/88 border border-white/80 rounded-[10px] shadow-[0_18px_45px_rgba(0,0,0,0.08)] overflow-hidden">
                    <Skeleton className="w-full max-h-[700px]" />
                    <div className="p-5 space-y-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPublicaciones.length === 0 ? (
              <div className="text-center py-12 rounded-[10px] border border-white/80 bg-white/80">
                <p className="text-muted-foreground">No hay publicaciones</p>
              </div>
            ) : (
              <div className="space-y-7">
                {filteredPublicaciones.map((publicacion) => (
                  <Feed360Card
                    key={publicacion.id}
                    publicacion={publicacion}
                    usuarioId={adminUserId}
                    showActions={true}
                    onDelete={handleDelete}
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
