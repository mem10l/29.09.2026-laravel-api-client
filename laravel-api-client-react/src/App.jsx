import React, { useEffect, useRef } from 'react';
import { AppProvider, useApp } from './AppContext.jsx';
import { api, QUOTE_URL, JOKE_URL, FACT_URL } from './api.js';
import TopBar from './components/TopBar.jsx';
import AuthPanel from './components/AuthPanel.jsx';
import NewPostForm from './components/NewPostForm.jsx';
import PostFeed from './components/PostFeed.jsx';
import CatFactWidget from './components/CatFactWidget.jsx';
import TextApiWidget from './components/TextApiWidget.jsx';

function Shell() {
  const { user, logout, notice } = useApp();
  const feedRef = useRef(null);

  // On first load, if a token is saved, check it's still valid (mirrors the
  // old script's startup check) before deciding what to show.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api('/user').then(
      (freshUser) => localStorage.setItem('user', JSON.stringify(freshUser)),
      () => logout(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <TopBar onLoggedOut={() => feedRef.current?.reload()} />

      {notice && (
        <p className={`notice ${notice.isError ? 'error' : ''}`} role="status">
          {notice.message}
        </p>
      )}

      <main className="layout">
        <aside className="side">
          {user ? (
            <NewPostForm onCreated={() => feedRef.current?.reload()} />
          ) : (
            <AuthPanel onAuthed={() => feedRef.current?.reload()} />
          )}

          <TextApiWidget
            title="Random quote"
            url={QUOTE_URL}
            extractText={(data) => `\u201C${data.quote}\u201D`}
            buttonLabel="New quote"
          />

          <CatFactWidget />

          <TextApiWidget
            title="Dad joke"
            url={JOKE_URL}
            extractText={(data) => data.joke}
            buttonLabel="New joke"
          />

          <TextApiWidget
            title="Useless fact"
            url={FACT_URL}
            extractText={(data) => data.text}
            buttonLabel="New fact"
          />
        </aside>

        <PostFeed ref={feedRef} />
      </main>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
