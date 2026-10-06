import React, { useState } from 'react';
import { api, STATUS, formatDate } from '../api.js';
import { useApp } from '../AppContext.jsx';
import Comments from './Comments.jsx';

export default function PostCard({ post, onUpdated, onDeleted }) {
  const { user, notify } = useApp();
  const mine = Boolean(user) && post.user_id === user.id;
  const statusName = STATUS[post.post_status_id] || 'public';

  const [editing, setEditing] = useState(false);
  const [showComments, setShowComments] = useState(false);

  async function onSaveEdit(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      const updated = await api(`/posts/${post.id}`, {
        method: 'PUT',
        body: { title: form.get('title'), body: form.get('body') },
      });
      onUpdated(updated);
      setEditing(false);
      notify('Post updated.');
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function onToggleStatus() {
    const nextStatusId = post.post_status_id === 1 ? 2 : 1;
    try {
      const updated = await api(`/posts/${post.id}/status`, {
        method: 'PATCH',
        body: { post_status_id: nextStatusId },
      });
      onUpdated(updated);
      notify(`Post is now ${STATUS[nextStatusId]}.`);
    } catch (error) {
      notify(error.message, true);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete "${post.title}"?`)) return;
    try {
      await api(`/posts/${post.id}`, { method: 'DELETE' });
      onDeleted(post.id);
      notify('Post deleted.');
    } catch (error) {
      notify(error.message, true);
    }
  }

  return (
    <article className="post">
      {editing ? (
        <form className="form edit-form" onSubmit={onSaveEdit}>
          <input name="title" defaultValue={post.title} required maxLength={255} aria-label="Title" />
          <textarea name="body" rows={4} defaultValue={post.body} required aria-label="Body" />
          <div className="row">
            <button type="submit" className="btn primary">Save changes</button>
            <button type="button" className="btn" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="post-view">
          <div className="post-head">
            <h3>{post.title}</h3>
            <span className={`badge ${statusName}`}>{statusName}</span>
          </div>
          <p className="post-body">{post.body}</p>
          <p className="meta">{mine ? 'You' : `User #${post.user_id}`}, {formatDate(post.created_at)}</p>
        </div>
      )}

      <div className="row actions">
        <button type="button" className="btn" onClick={() => setShowComments((v) => !v)}>Comments</button>
        {mine && !editing && (
          <>
            <button type="button" className="btn" onClick={() => setEditing(true)}>Edit</button>
            <button type="button" className="btn" onClick={onToggleStatus}>
              {post.post_status_id === 1 ? 'Make private' : 'Make public'}
            </button>
            <button type="button" className="btn danger" onClick={onDelete}>Delete</button>
          </>
        )}
      </div>

      {showComments && <Comments postId={post.id} />}
    </article>
  );
}
