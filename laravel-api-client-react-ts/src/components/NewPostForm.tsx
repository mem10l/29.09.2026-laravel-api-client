import { type FormEvent } from 'react';
import { api } from '../api';
import { useApp } from '../AppContext';

interface Props {
  onCreated: () => void;
}

export default function NewPostForm({ onCreated }: Props) {
  const { notify, guard } = useApp();

  const onSubmit = guard(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Save the element before the first `await` — see the note in
    // AuthPanel.tsx; event.currentTarget would be null by the time we try
    // to call .reset() on it below, after api() resolves.
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    await api('/posts', {
      method: 'POST',
      body: { title: form.get('title'), body: form.get('body') },
    });
    formEl.reset();
    onCreated();
    notify('Post published.');
  });

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
