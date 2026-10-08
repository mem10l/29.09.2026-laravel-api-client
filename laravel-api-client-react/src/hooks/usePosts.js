import { useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../AppContext.jsx';

// Owns the post list's data and mutations. Exposed to the parent via a ref
// (useImperativeHandle) so other components (TopBar, AuthPanel, NewPostForm)
// can trigger a reload after login/logout/create without lifting all of
// this state up into App.jsx.
export function usePosts(ref) {
  const { notify } = useApp();
  const [posts, setPosts] = useState(null); // null = loading

  const reload = useCallback(async () => {
    try {
      const data = await api('/posts');
      setPosts(data.slice().sort((a, b) => b.id - a.id));
    } catch (error) {
      notify(error.message, true);
    }
  }, [notify]);

  const update = useCallback((updatedPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  }, []);

  const remove = useCallback((id) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  useImperativeHandle(ref, () => ({ reload }), [reload]);
  useEffect(() => { reload(); }, [reload]);

  return { posts, reload, update, remove };
}
