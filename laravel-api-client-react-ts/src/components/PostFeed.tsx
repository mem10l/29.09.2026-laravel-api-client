import { forwardRef } from 'react';
import { usePosts, type PostFeedHandle } from '../hooks/usePosts';
import PostCard from './PostCard';

// forwardRef<HandleType, PropsType> — the handle type is what the parent's
// ref gets (just { reload }, from usePosts), the props type is normal
// props. This component takes no props, hence `object` (an empty object
// type, not a keyed record — that's what makes it compatible with `ref`).
const PostFeed = forwardRef<PostFeedHandle, object>(function PostFeed(_props, ref) {
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
