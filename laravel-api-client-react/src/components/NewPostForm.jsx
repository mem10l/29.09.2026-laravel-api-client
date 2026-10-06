import React from 'react';
import { api } from '../api.js';
import { useApp } from '../AppContext.jsx';

export default function NewPostForm({ onCreated }) {
  const { notify } = useApp();

  async function onSubmit(event) {
    event.preventDefault();
    const form = new FormData(event.target);
    try {
      await api('/posts', {
        method: 'POST',
        body: { title: form.get('title'), body: form.get('body') },
      });
      event.target.reset();
      onCreated();
      notify('Post published.');
    } catch (error) {
      notify(error.message, true);
    }
  }

  return (
    <section className="panel">
      <h2>New post</h2>
      <form className="form" onSubmit={onSubmit}>
        <label>
          Title
          <input type="text" name="title" required maxLength={255} />
        </label>
        <label>
          Body
          <textarea name="body" rows={5} required />
        </label>
        <button type="submit" className="btn primary">Publish post</button>
      </form>
    </section>
  );
}
