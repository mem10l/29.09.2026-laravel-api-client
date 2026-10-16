import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CAT_URL } from '../api';
import { mockFetch } from '../test/utils';
import CatFactWidget from './CatFactWidget';
import TextApiWidget from './TextApiWidget';

describe('TextApiWidget', () => {
  const url = 'https://example.test/joke';
  const widget = (
    <TextApiWidget
      title="Dad joke"
      url={url}
      extractText={(data) => (data as { joke: string }).joke}
      buttonLabel="New joke"
    />
  );

  it('loads text on mount and again when the button is clicked', async () => {
    let n = 0;
    mockFetch({ [`GET ${url}`]: () => ({ body: { joke: `Joke #${++n}` } }) });
    const u = userEvent.setup();
    render(widget);

    expect(await screen.findByText('Joke #1')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'New joke' }));
    expect(await screen.findByText('Joke #2')).toBeInTheDocument();
  });

  it('shows a fallback message when the request fails', async () => {
    mockFetch({ [`GET ${url}`]: { status: 500, body: {} } });
    render(widget);
    expect(await screen.findByText('Could not load this. Try again.')).toBeInTheDocument();
  });

  it('never sends the Laravel token to a third-party API', async () => {
    localStorage.setItem('token', 'secret-token');
    const { calls } = mockFetch({ [`GET ${url}`]: { body: { joke: 'x' } } });
    render(widget);
    await screen.findByText('x');
    expect(calls[0].headers).not.toHaveProperty('Authorization');
  });
});

describe('CatFactWidget', () => {
  it('loads a fact on mount without a length limit', async () => {
    mockFetch({ [`GET ${CAT_URL}`]: { body: { fact: 'Cats sleep a lot.', length: 17 } } });
    render(<CatFactWidget />);
    expect(await screen.findByText('Cats sleep a lot.')).toBeInTheDocument();
  });

  it('sends the max length as a query parameter', async () => {
    const { calls } = mockFetch({
      [`GET ${CAT_URL}`]: { body: { fact: 'Long fact', length: 9 } },
      [`GET ${CAT_URL}?max_length=20`]: { body: { fact: 'Short fact', length: 10 } },
    });
    const u = userEvent.setup();
    render(<CatFactWidget />);

    await u.type(screen.getByLabelText('Max length (characters)'), '20');
    await u.click(screen.getByRole('button', { name: 'Get a cat fact' }));

    expect(await screen.findByText('Short fact')).toBeInTheDocument();
    expect(calls[calls.length - 1].path).toBe(`${CAT_URL}?max_length=20`);
  });

  it('explains a 404 as "no fact that short"', async () => {
    mockFetch({
      [`GET ${CAT_URL}`]: { body: { fact: 'Any fact', length: 8 } },
      [`GET ${CAT_URL}?max_length=1`]: { status: 404, body: {} },
    });
    const u = userEvent.setup();
    render(<CatFactWidget />);

    await u.type(screen.getByLabelText('Max length (characters)'), '1');
    await u.click(screen.getByRole('button', { name: 'Get a cat fact' }));

    expect(await screen.findByText('No fact that short. Try a larger number.')).toBeInTheDocument();
  });
});
