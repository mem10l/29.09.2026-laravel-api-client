import React, { useCallback, useEffect, useState } from 'react';

// Generic "fetch one piece of text from a public API" widget, used for the
// quote, joke and useless-fact boxes. Each is a plain fetch() with no token,
// so the Laravel auth token is never sent to these third-party sites.
function TextApiWidget({ title, url, extractText, buttonLabel }) {
  const [text, setText] = useState('Loading…');

  const load = useCallback(async () => {
    setText('Loading…');
    try {
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setText(extractText(data));
    } catch {
      setText('Could not load this. Try again.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="panel">
      <h2>{title}</h2>
      <blockquote className="quote">{text}</blockquote>
      <button type="button" className="btn" onClick={load}>{buttonLabel}</button>
    </section>
  );
}

export default TextApiWidget;
