import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockFetch, renderWithApp } from '../test/utils';
import Comments from './Comments';

const ana = { id: 1, name: 'Ana' };
const twoComments = [
  { id: 1, content: 'First!', user_id: 1 },
  { id: 2, content: 'Nice post', user_id: 2 },
];

describe('Comments', () => {
  it('lists comments and only offers Delete on your own', async () => {
    mockFetch({ 'GET /posts/5/comments': { body: twoComments } });
    renderWithApp(<Comments postId={5} />, { user: ana });

    expect(await screen.findByText('First!')).toBeInTheDocument();
    expect(screen.getByText('Nice post')).toBeInTheDocument();
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('User #2')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Delete' })).toHaveLength(1);
  });

  it('asks logged-out visitors to log in instead of showing the form', async () => {
    mockFetch({ 'GET /posts/5/comments': { body: [] } });
    renderWithApp(<Comments postId={5} />);

    expect(await screen.findByText('No comments yet.')).toBeInTheDocument();
    expect(screen.getByText('Log in to write a comment.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Write a comment')).not.toBeInTheDocument();
  });

  it('adds a new comment and clears the input', async () => {
    const { calls } = mockFetch({
      'GET /posts/5/comments': { body: [] },
      'POST /posts/5/comments': { status: 201, body: { id: 3, content: 'Hello there', user_id: 1 } },
    });
    const u = userEvent.setup();
    renderWithApp(<Comments postId={5} />, { user: ana });

    await u.type(await screen.findByPlaceholderText('Write a comment'), 'Hello there');
    await u.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(await screen.findByText('Hello there')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ content: 'Hello there' });
    expect(screen.getByPlaceholderText('Write a comment')).toHaveValue('');
    expect(screen.queryByText('No comments yet.')).not.toBeInTheDocument();
  });

  it('deletes one of your own comments', async () => {
    mockFetch({
      'GET /posts/5/comments': { body: twoComments },
      'DELETE /posts/5/comments/1': { status: 204 },
    });
    const u = userEvent.setup();
    renderWithApp(<Comments postId={5} />, { user: ana });

    await u.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Comment deleted.')).toBeInTheDocument();
    expect(screen.queryByText('First!')).not.toBeInTheDocument();
    expect(screen.getByText('Nice post')).toBeInTheDocument();
  });

  it('shows an error notice when loading fails', async () => {
    mockFetch({ 'GET /posts/5/comments': { status: 500, body: { message: 'Server exploded' } } });
    renderWithApp(<Comments postId={5} />, { user: ana });

    const notice = await screen.findByText('Server exploded');
    expect(notice).toHaveAttribute('data-error', 'true');
  });
});
