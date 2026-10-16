import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithApp } from '../test/utils';
import type { Post } from '../types';
import PostCard from './PostCard';

const post: Post = {
  id: 5,
  title: 'Hello',
  body: 'World',
  user_id: 1,
  post_status_id: 1,
  created_at: '2026-09-24T10:00:00Z',
};
const owner = { id: 1, name: 'Ana' };
const stranger = { id: 2, name: 'Bruno' };

function setup(user?: typeof owner) {
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();
  renderWithApp(<PostCard post={post} onUpdated={onUpdated} onDeleted={onDeleted} />, { user });
  return { onUpdated, onDeleted };
}

describe('PostCard', () => {
  it('shows the post with its status badge and author', () => {
    setup(stranger);
    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
    expect(screen.getByText('World')).toBeInTheDocument();
    expect(screen.getByText('public')).toBeInTheDocument();
    expect(screen.getByText(/User #1/)).toBeInTheDocument();
  });

  it('hides edit controls from everyone except the owner', () => {
    setup(stranger);
    expect(screen.getByRole('button', { name: 'Comments' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('hides edit controls from logged-out visitors', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('shows edit controls to the owner', () => {
    setup(owner);
    expect(screen.getByText(/You,/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Make private' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('toggles the status between public and private', async () => {
    const { calls } = mockFetch({
      'PATCH /posts/5/status': { body: { ...post, post_status_id: 2 } },
    });
    const u = userEvent.setup();
    const { onUpdated } = setup(owner);

    await u.click(screen.getByRole('button', { name: 'Make private' }));

    expect(await screen.findByText('Post is now private.')).toBeInTheDocument();
    expect(calls[0].body).toEqual({ post_status_id: 2 });
    expect(onUpdated).toHaveBeenCalledWith({ ...post, post_status_id: 2 });
  });

  it('edits the post inline and saves it', async () => {
    const { calls } = mockFetch({
      'PUT /posts/5': { body: { ...post, title: 'Renamed' } },
    });
    const u = userEvent.setup();
    const { onUpdated } = setup(owner);

    await u.click(screen.getByRole('button', { name: 'Edit' }));
    const title = screen.getByLabelText('Title');
    expect(title).toHaveValue('Hello');
    expect(screen.getByLabelText('Body')).toHaveValue('World');

    await u.clear(title);
    await u.type(title, 'Renamed');
    await u.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Post updated.')).toBeInTheDocument();
    expect(calls[0].body).toEqual({ title: 'Renamed', body: 'World' });
    expect(onUpdated).toHaveBeenCalledWith({ ...post, title: 'Renamed' });
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
  });

  it('cancels an edit without calling the API', async () => {
    const { calls } = mockFetch({});
    const u = userEvent.setup();
    setup(owner);

    await u.click(screen.getByRole('button', { name: 'Edit' }));
    await u.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('heading', { name: 'Hello' })).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  it('deletes the post after the user confirms', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockFetch({ 'DELETE /posts/5': { status: 204 } });
    const u = userEvent.setup();
    const { onDeleted } = setup(owner);

    await u.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Post deleted.')).toBeInTheDocument();
    expect(onDeleted).toHaveBeenCalledWith(5);
  });

  it('does nothing when the user declines the delete confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { calls } = mockFetch({});
    const u = userEvent.setup();
    const { onDeleted } = setup(owner);

    await u.click(screen.getByRole('button', { name: 'Delete' }));

    expect(calls).toHaveLength(0);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('loads comments only when the Comments button is clicked', async () => {
    const { calls } = mockFetch({ 'GET /posts/5/comments': { body: [] } });
    const u = userEvent.setup();
    setup(owner);

    expect(calls).toHaveLength(0);
    await u.click(screen.getByRole('button', { name: 'Comments' }));
    expect(await screen.findByText('No comments yet.')).toBeInTheDocument();
    expect(calls).toHaveLength(1);
  });
});
