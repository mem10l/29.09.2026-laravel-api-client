import { useEffect, useRef } from 'react';
import { AppProvider, useApp } from './AppContext';
import { api, QUOTE_URL, JOKE_URL, FACT_URL } from './api';
import TopBar from './components/TopBar';
import AuthPanel from './components/AuthPanel';
import NewPostForm from './components/NewPostForm';
import PostFeed from './components/PostFeed';
import CatFactWidget from './components/CatFactWidget';
import TextApiWidget from './components/TextApiWidget';
import type { PostFeedHandle } from './hooks/usePosts';
import type { User } from './types';

function Shell() {
  const { user, logout, notice } = useApp();
  const feedRef = useRef<PostFeedHandle>(null);

  // On first load, if a token is saved, check it's still valid (mirrors the
  // old script's startup check) before deciding what to show.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api<User>('/user').then(
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
            extractText={(data) => `\u201C${(data as { quote: string }).quote}\u201D`}
            buttonLabel="New quote"
          />

          <CatFactWidget />

          <TextApiWidget
            title="Dad joke"
            url={JOKE_URL}
            extractText={(data) => (data as { joke: string }).joke}
            buttonLabel="New joke"
          />

          <TextApiWidget
            title="Useless fact"
            url={FACT_URL}
            extractText={(data) => (data as { text: string }).text}
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
