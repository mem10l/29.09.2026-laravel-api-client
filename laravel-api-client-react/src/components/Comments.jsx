import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useApp } from '../AppContext.jsx';

export default function Comments({ postId }) {
  const { user, notify } = useApp();
  const [comments, setComments] = useState(null); // null = not loaded yet
  const [text, setText] = useState('');

  useEffect(() => {
    let cancelled = false;
    api(`/posts/${postId}/comments`)
      .then((data) => { if (!cancelled) setComments(data); })
      .catch((error) => notify(error.message, true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  async function onSubmit(event) {
    event.preventDefault();
    if (!text.trim()) return;
    try {
      const comment = await api(`/posts/${postId}/comments`, { method: 'POST', body: { content: text } });
      setComments((prev) => [...(prev || []), comment]);
      setText('');
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function onDelete(commentId) {
    try {
      await api(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      notify('Comment deleted.');
    } catch (error) {
      notify(error.message, true);
    }
  }

  if (comments === null) return <div className="comments">Loading…</div>;

  return (
    <div className="comments">
      <ul className="comment-list">
        {comments.map((comment) => (
          <li className="comment" key={comment.id}>
            <p>{comment.content}</p>
            <span className="meta">{user && comment.user_id === user.id ? 'You' : `User #${comment.user_id}`}</span>
            {user && comment.user_id === user.id && (
              <button type="button" className="link-btn" onClick={() => onDelete(comment.id)}>Delete</button>
            )}
          </li>
        ))}
      </ul>

      {comments.length === 0 && <p className="muted">No comments yet.</p>}

      {user ? (
        <form className="comment-form" onSubmit={onSubmit}>
          <input
            name="content"
            placeholder="Write a comment"
            required
            aria-label="Comment"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button type="submit" className="btn primary">Post comment</button>
        </form>
      ) : (
        <p className="muted">Log in to write a comment.</p>
      )}
    </div>
  );
}
