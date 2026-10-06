import React from 'react';
import { api } from '../api.js';
import { useApp } from '../AppContext.jsx';
import { useTheme } from '../useTheme.js';

export default function TopBar({ onLoggedOut }) {
  const { user, logout, notify } = useApp();
  const [theme, toggleTheme] = useTheme();

  async function onLogout() {
    try {
      await api('/logout', { method: 'POST' });
    } catch {
      // Token was already invalid: nothing to revoke, just clear it locally.
    }
    logout();
    onLoggedOut();
    notify('You are logged out.');
  }

  return (
    <header className="topbar">
      <h1>Posts</h1>
      <div className="session">
        {user && (
          <>
            <span>{user.name}</span>
            <button type="button" className="btn" onClick={onLogout}>Log out</button>
          </>
        )}
        <button
          type="button"
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
