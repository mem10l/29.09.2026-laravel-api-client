import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api';
import { useApp } from '../AppContext';
import type { Comment } from '../types';

interface Props {
  postId: number;
}

export default function Comments({ postId }: Props) {
  const { user, notify, guard } = useApp();
  const [comments, setComments] = useState<Comment[] | null>(null); // null = not loaded yet
  const [text, setText] = useState('');

  useEffect(() => {
    let cancelled = false;
    api<Comment[]>(`/posts/${postId}/comments`)
      .then((data) => { if (!cancelled) setComments(data); })
      .catch((error) => notify(error instanceof Error ? error.message : String(error), true));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId]);

  const onSubmit = guard(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!text.trim()) return;
    const comment = await api<Comment>(`/posts/${postId}/comments`, { method: 'POST', body: { content: text } });
    setComments((prev) => [...(prev || []), comment]);
    setText('');
  });

  const onDelete = guard(async (commentId: number) => {
    await api(`/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
    setComments((prev) => (prev ? prev.filter((c) => c.id !== commentId) : prev));
    notify('Comment deleted.');
  });

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
