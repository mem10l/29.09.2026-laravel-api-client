import React, { useCallback, useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import { api } from '../api.js';
import { useApp } from '../AppContext.jsx';
import PostCard from './PostCard.jsx';

// forwardRef lets the parent (App) call reload() after login/logout/create,
// the same way the old script called loadPosts() again.
const PostFeed = forwardRef(function PostFeed(_props, ref) {
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

  useImperativeHandle(ref, () => ({ reload }), [reload]);

  useEffect(() => { reload(); }, [reload]);

  function onUpdated(updated) {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }

  function onDeleted(id) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <section className="feed" aria-labelledby="feed-title">
      <div className="feed-head">
        <h2 id="feed-title">All posts</h2>
        <button type="button" className="btn" onClick={reload}>Refresh</button>
      </div>
      <div id="posts" aria-busy={posts === null}>
        {posts === null && <p className="muted">Loading…</p>}
        {posts && posts.length === 0 && <p className="muted">No posts yet. Log in and write the first one.</p>}
        {posts && posts.map((post) => (
          <PostCard key={post.id} post={post} onUpdated={onUpdated} onDeleted={onDeleted} />
        ))}
      </div>
    </section>
  );
});

export default PostFeed;
