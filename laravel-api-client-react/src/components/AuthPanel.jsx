import React, { useState } from 'react';
import { api, errorText } from '../api.js';
import { useApp } from '../AppContext.jsx';

export default function AuthPanel({ onAuthed }) {
  const { login, notify, guard } = useApp();
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  const onLogin = guard(async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const data = await api('/login', {
      method: 'POST',
      body: { email: form.get('email'), password: form.get('password') },
    });
    // The API answers 200 with {errors: ...} and no token when the password is wrong.
    if (!data.token) throw new Error(errorText(200, data));

    login(data);
    event.target.reset();
    onAuthed();
    notify(`Welcome back, ${data.user.name}.`);
  });

  const onRegister = guard(async (event) => {
    event.preventDefault();
    const form = new FormData(event.target);
    const data = await api('/register', {
      method: 'POST',
      body: {
        name: form.get('name'),
        email: form.get('email'),
        password: form.get('password'),
        password_confirmation: form.get('password_confirmation'),
      },
    });
    login(data);
    event.target.reset();
    onAuthed();
    notify(`Account created. You are logged in as ${data.user.name}.`);
  });

  return (
    <section className="panel">
      <div className="tabs" role="tablist">
        <button
          type="button"
          className={`tab ${tab === 'login' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={tab === 'login'}
          onClick={() => setTab('login')}
        >
          Log in
        </button>
        <button
          type="button"
          className={`tab ${tab === 'register' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={tab === 'register'}
          onClick={() => setTab('register')}
        >
          Register
        </button>
      </div>

      {tab === 'login' ? (
        <form className="form" onSubmit={onLogin}>
          <label>
            Email
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" name="password" required autoComplete="current-password" />
          </label>
          <button type="submit" className="btn primary">Log in</button>
        </form>
      ) : (
        <form className="form" onSubmit={onRegister}>
          <label>
            Name
            <input type="text" name="name" required maxLength={255} autoComplete="name" />
          </label>
          <label>
            Email
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" name="password" required autoComplete="new-password" />
          </label>
          <label>
            Repeat password
            <input type="password" name="password_confirmation" required autoComplete="new-password" />
          </label>
          <button type="submit" className="btn primary">Create account</button>
        </form>
      )}
    </section>
  );
}
