'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, MoreHorizontal, Trash2, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Feed360CommentsModal } from './Feed360CommentsModal';
import { createSupabaseClient } from '@/lib/supabase';

interface Comment {
  id: string;
  contenido: string;
  created_at: string;
  usuario?: { id: string; colaborador: string; imagen_perfil: string | null };
}

interface Feed360CardProps {
  publicacion: {
    id: string;
    imagen_url: string;
    texto: string | null;
    likes_count: number;
    comentarios_count?: number;
    created_at: string;
    tematica?: { id: string; titulo: string };
    usuario?: { id: number; colaborador: string; imagen_perfil: string | null } | null;
    likes?: { usuario_id: number }[];
  };
  usuarioId: number;
  onLikeUpdate?: (publicacionId: string, liked: boolean, likesCount?: number) => void;
  onDelete?: (publicacionId: string) => void;
  showActions?: boolean;
}

export function Feed360Card({
  publicacion,
  usuarioId,
  onLikeUpdate,
  onDelete,
  showActions = false,
}: Feed360CardProps) {
  const [liked, setLiked] = useState(
    publicacion.likes?.some((l) => l.usuario_id === usuarioId) || false
  );
  const [likesCount, setLikesCount] = useState(publicacion.likes_count);
  const [comentariosCount, setComentariosCount] = useState(publicacion.comentarios_count || 0);
  const [previewComments, setPreviewComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const subscriptionRef = useRef<ReturnType<typeof createSupabaseClient>['subscribe'] | null>(null);

  useEffect(() => {
    if (comentariosCount > 0) {
      fetchPreviewComments();
    }
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [publicacion.id]);

  useEffect(() => {
    const supabase = createSupabaseClient();
    subscriptionRef.current = supabase
      .channel(`comentarios:${publicacion.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comentarios_feed360',
          filter: `publicacion_id=eq.${publicacion.id}`,
        },
        (payload) => {
          const newComment = payload.new as Comment;
          setComentariosCount((c) => c + 1);
          setPreviewComments((prev) => {
            const exists = prev.some((c) => c.id === newComment.id);
            if (exists) return prev;
            return [newComment, ...prev].slice(0, 3);
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'comentarios_feed360',
          filter: `publicacion_id=eq.${publicacion.id}`,
        },
        (payload) => {
          const deletedComment = payload.old as Comment;
          setComentariosCount((c) => Math.max(0, c - 1));
          setPreviewComments((prev) => prev.filter((c) => c.id !== deletedComment.id));
        }
      )
      .subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, [publicacion.id]);

  const fetchPreviewComments = async () => {
    try {
      const res = await fetch(
        `/api/feed360/publicaciones/${publicacion.id}/comentarios?limit=3&offset=0`
      );
      if (res.ok) {
        const data = await res.json();
        setPreviewComments(Array.isArray(data) ? data : data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching preview comments:', error);
    }
  };

  const handleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikesCount((c) => (newLiked ? c + 1 : c - 1));

    try {
      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) throw new Error();

      const res = await fetch(`/api/feed360/publicaciones/${publicacion.id}/like`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (typeof data.likes_count === 'number') {
        setLikesCount(data.likes_count);
      }
      onLikeUpdate?.(publicacion.id, data.liked, data.likes_count);
    } catch {
      setLiked(!newLiked);
      setLikesCount((c) => (newLiked ? c - 1 : c + 1));
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('¿Eliminar esta publicación?')) return;

    try {
      const supabase = createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`/api/feed360/publicaciones/${publicacion.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        onDelete(publicacion.id);
      }
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  const userAvatarUrl = publicacion.usuario?.imagen_perfil;
  const userInitials = publicacion.usuario?.colaborador?.charAt(0).toUpperCase() || '?';

  return (
    <article className="bg-white/88 border border-white/80 rounded-[22px] overflow-hidden shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
      <div className="px-5 py-4 flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-muted overflow-hidden shrink-0">
          {userAvatarUrl ? (
            <Image
              src={userAvatarUrl}
              alt={publicacion.usuario?.colaborador || 'Usuario'}
              width={44}
              height={44}
              className="object-cover w-full h-full"
              unoptimized={userAvatarUrl.includes('cloudinary') || userAvatarUrl.includes('supabase')}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-base font-semibold bg-neutral-900 text-white">
              {userInitials}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[15px] truncate tracking-tight">
            {publicacion.usuario?.colaborador || 'Usuario desconocido'}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {formatDistanceToNow(new Date(publicacion.created_at), {
              addSuffix: true,
              locale: es,
            })}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {showActions && onDelete && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {publicacion.tematica && (
        <div className="px-5 pb-2">
          <span className="inline-block px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg">
            {publicacion.tematica.titulo}
          </span>
        </div>
      )}

      <div className="relative bg-muted aspect-[16/10]">
        <Image
          src={publicacion.imagen_url}
          alt="Publicación"
          fill
          className="object-cover"
          unoptimized={publicacion.imagen_url.includes('cloudinary')}
        />
      </div>

      <div className="px-5 py-5">
        {publicacion.texto && (
          <p className="text-[12px] leading-[1.45] text-neutral-800 mb-3">
            {publicacion.texto}
          </p>
        )}

        <p className="text-[14px] text-neutral-600 mb-2.5 flex items-center gap-2">
          <span className="font-bold text-neutral-800">{likesCount} like{likesCount !== 1 ? 's' : ''}</span>
          {comentariosCount > 0 && (
            <>
              <span>•</span>
              <span>{comentariosCount} comentario{comentariosCount !== 1 ? 's' : ''}</span>
            </>
          )}
        </p>

        <div className="flex items-center gap-0 mb-4 border-y border-neutral-200 -mx-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn('flex-1 rounded-none h-10 hover:bg-neutral-50 font-semibold text-sm', liked && 'text-red-500')}
          >
            <Heart className={cn('h-5 w-5 mr-1.5', liked && 'fill-current')} />
            <span>Like</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 rounded-none h-10 hover:bg-neutral-50 font-semibold text-sm" onClick={() => setShowComments(true)}>
            <MessageCircle className="h-5 w-5 mr-1.5" />
            <span>Comentar</span>
          </Button>
        </div>

        {previewComments.length > 0 && (
          <div className="space-y-3 mb-3">
            {previewComments.map((comment) => (
              <div key={comment.id} className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-muted overflow-hidden shrink-0">
                  {comment.usuario?.imagen_perfil ? (
                    <Image
                      src={comment.usuario.imagen_perfil}
                      alt={comment.usuario.colaborador}
                      width={24}
                      height={24}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-medium bg-neutral-200">
                      {comment.usuario?.colaborador?.charAt(0).toUpperCase() || '?'}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="inline-block rounded-[14px] bg-neutral-100 px-3 py-2">
                    <p className="text-[13px] font-semibold leading-none mb-1">{comment.usuario?.colaborador}</p>
                    <p className="text-[14px] text-neutral-700">{comment.contenido}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {comentariosCount > 3 && (
          <button
            onClick={() => setShowComments(true)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-2 font-semibold"
          >
            <ChevronDown className="h-4 w-4" />
            Ver los {comentariosCount - 3} comentarios anteriores
          </button>
        )}
      </div>

      <Feed360CommentsModal
        publicacionId={publicacion.id}
        open={showComments}
        onOpenChange={setShowComments}
        initialComments={previewComments}
        totalComments={comentariosCount}
        onNewComment={(comment) => {
          setPreviewComments((prev) => {
            const exists = prev.some((c) => c.id === comment.id);
            if (exists) return prev;
            return [comment, ...prev].slice(0, 3);
          });
        }}
      />
    </article>
  );
}
