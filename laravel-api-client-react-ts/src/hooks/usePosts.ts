import { useCallback, useEffect, useImperativeHandle, useState, type Ref } from 'react';
import { api } from '../api';
import { useApp } from '../AppContext';
import type { Post } from '../types';

// What a <PostFeed ref={...}> exposes to its parent. Deliberately narrow:
// just one method, not the component's whole internal state.
export interface PostFeedHandle {
  reload: () => Promise<void>;
}

// Owns the post list's data and mutations. Exposed to the parent via a ref
// (useImperativeHandle) so other components (TopBar, AuthPanel, NewPostForm)
// can trigger a reload after login/logout/create without lifting all of
// this state up into App.tsx.
export function usePosts(ref: Ref<PostFeedHandle>) {
  const { notify } = useApp();
  const [posts, setPosts] = useState<Post[] | null>(null); // null = loading

  const reload = useCallback(async () => {
    try {
      const data = await api<Post[]>('/posts');
      setPosts(data.slice().sort((a, b) => b.id - a.id));
    } catch (error) {
      notify(error instanceof Error ? error.message : String(error), true);
    }
  }, [notify]);

  const update = useCallback((updatedPost: Post) => {
    setPosts((prev) => (prev ? prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)) : prev));
  }, []);

  const remove = useCallback((id: number) => {
    setPosts((prev) => (prev ? prev.filter((p) => p.id !== id) : prev));
  }, []);

  useImperativeHandle(ref, () => ({ reload }), [reload]);
  useEffect(() => { reload(); }, [reload]);

  return { posts, reload, update, remove };
}
