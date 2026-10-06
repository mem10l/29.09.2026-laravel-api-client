import React, { useEffect, useState } from 'react';
import { CAT_URL } from '../api.js';

export default function CatFactWidget() {
  const [fact, setFact] = useState('Loading…');
  const [maxLength, setMaxLength] = useState('');

  async function load(length) {
    setFact('Loading…');
    const params = new URLSearchParams();
    if (length) params.set('max_length', length);
    const query = params.toString();

    try {
      const response = await fetch(query ? `${CAT_URL}?${query}` : CAT_URL, {
        headers: { Accept: 'application/json' },
      });
      if (response.status === 404) {
        setFact('No fact that short. Try a larger number.');
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setFact(data.fact);
    } catch {
      setFact('Could not load a cat fact. Try again.');
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="panel">
      <h2>Cat fact</h2>
      <form
        className="form"
        onSubmit={(event) => { event.preventDefault(); load(maxLength); }}
      >
        <label>
          Max length (characters)
          <input
            type="number"
            min={1}
            max={500}
            placeholder="any length"
            value={maxLength}
            onChange={(event) => setMaxLength(event.target.value)}
          />
        </label>
        <button type="submit" className="btn">Get a cat fact</button>
      </form>
      <blockquote className="quote">{fact}</blockquote>
    </section>
  );
}
