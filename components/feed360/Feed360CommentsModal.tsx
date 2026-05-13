'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createSupabaseClient } from '@/lib/supabase';

interface Comment {
  id: string;
  contenido: string;
  created_at: string;
  usuario?: { id: string; colaborador: string; imagen_perfil: string | null };
}

interface Feed360CommentsModalProps {
  publicacionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialComments?: Comment[];
  totalComments?: number;
  onNewComment?: (comment: Comment) => void;
}

export function Feed360CommentsModal({
  publicacionId,
  open,
  onOpenChange,
  initialComments,
  totalComments,
  onNewComment,
}: Feed360CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const [loading, setLoading] = useState(!initialComments);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(totalComments || 0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const fetchingMoreRef = useRef(false);

  const COMMENTS_PER_PAGE = 20;

  useEffect(() => {
    if (open) {
      if (initialComments && initialComments.length > 0) {
        setComments(initialComments);
        setOffset(initialComments.length);
        setTotal(totalComments || 0);
        setHasMore((totalComments || 0) > initialComments.length);
      } else {
        fetchComments(true);
      }
    }
  }, [open, publicacionId, initialComments, totalComments]);

  const fetchComments = async (reset = false) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
    } else {
      setLoadingMore(true);
    }

    try {
      const currentOffset = reset ? 0 : offset;
      const res = await fetch(
        `/api/feed360/publicaciones/${publicacionId}/comentarios?limit=${COMMENTS_PER_PAGE}&offset=${currentOffset}&include_total=true`
      );
      if (res.ok) {
        const data = await res.json();
        const incomingComments: Comment[] = data.comments || data;
        const totalCount = data.total || 0;

        if (reset) {
          setComments(incomingComments);
          setOffset(incomingComments.length);
          setHasMore(incomingComments.length < totalCount);
        } else {
          setComments((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const uniqueIncoming = incomingComments.filter((c) => !existingIds.has(c.id));
            return [...prev, ...uniqueIncoming];
          });
          setOffset((prev) => prev + incomingComments.length);
          setHasMore(currentOffset + incomingComments.length < totalCount);
        }
        setTotal(totalCount);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      fetchingMoreRef.current = false;
    }
  };

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !fetchingMoreRef.current) {
      fetchingMoreRef.current = true;
      fetchComments(false);
    }
  }, [loadingMore, hasMore]);

  useEffect(() => {
    if (!loadMoreRef.current || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [hasMore, loadMore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const supabase = createSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) throw new Error('No autenticado');

      const res = await fetch(
        `/api/feed360/publicaciones/${publicacionId}/comentarios`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ contenido: newComment }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => {
          const exists = prev.some((c) => c.id === data.id);
          if (exists) return prev;
          return [data, ...prev];
        });
        setTotal((prev) => prev + 1);
        setNewComment('');
        onNewComment?.(data);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>
            Comentarios
            {total > 0 && (
              <span className="text-muted-foreground font-normal ml-2">
                ({total})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 min-h-[200px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : comments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Sin comentarios aún
            </p>
          ) : (
            <>
              <div className="space-y-4 pb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                      {comment.usuario?.imagen_perfil ? (
                        <Image
                          src={comment.usuario.imagen_perfil}
                          alt={comment.usuario.colaborador}
                          width={32}
                          height={32}
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm font-medium bg-neutral-200">
                          {comment.usuario?.colaborador?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="bg-muted rounded-lg p-3">
                        <p className="font-medium text-sm">
                          {comment.usuario?.colaborador}
                        </p>
                        <p className="text-sm mt-1">{comment.contenido}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-1">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {hasMore && (
                <div ref={loadMoreRef} className="py-4 flex justify-center">
                  {loadingMore ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <button
                      onClick={loadMore}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cargar más comentarios
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t">
          <Input
            placeholder="Escribe un comentario..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            size="icon"
            disabled={submitting || !newComment.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
