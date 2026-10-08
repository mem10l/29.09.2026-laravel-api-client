import React, { forwardRef } from 'react';
import { usePosts } from '../hooks/usePosts.js';
import PostCard from './PostCard.jsx';

// forwardRef lets the parent (App) call reload() after login/logout/create,
// the same way the old script called loadPosts() again.
const PostFeed = forwardRef(function PostFeed(_props, ref) {
  const { posts, reload, update, remove } = usePosts(ref);

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
          <PostCard key={post.id} post={post} onUpdated={update} onDeleted={remove} />
        ))}
      </div>
    </section>
  );
});

export default PostFeed;
