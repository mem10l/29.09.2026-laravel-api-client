import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithApp } from '../test/utils';
import NewPostForm from './NewPostForm';

describe('NewPostForm', () => {
  it('publishes a post, clears the form and calls onCreated', async () => {
    const onCreated = vi.fn();
    const { calls } = mockFetch({ 'POST /posts': { status: 201, body: { id: 10 } } });
    const u = userEvent.setup();
    renderWithApp(<NewPostForm onCreated={onCreated} />, { user: { id: 1, name: 'Ana' } });

    await u.type(screen.getByLabelText('Title'), 'My first post');
    await u.type(screen.getByLabelText('Body'), 'Hello world');
    await u.click(screen.getByRole('button', { name: 'Publish post' }));

    expect(await screen.findByText('Post published.')).toBeInTheDocument();
    expect(calls[0].body).toEqual({ title: 'My first post', body: 'Hello world' });
    expect(onCreated).toHaveBeenCalledTimes(1);

    // Regression for the "event.currentTarget is null" crash: the reset()
    // call after the await must still find the form.
    expect(screen.getByRole('status')).toHaveAttribute('data-error', 'false');
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Body')).toHaveValue('');
  });

  it('shows the server error and keeps what the user typed', async () => {
    const onCreated = vi.fn();
    mockFetch({
      'POST /posts': { status: 422, body: { message: 'Invalid.', errors: { title: ['The title has already been taken.'] } } },
    });
    const u = userEvent.setup();
    renderWithApp(<NewPostForm onCreated={onCreated} />, { user: { id: 1, name: 'Ana' } });

    await u.type(screen.getByLabelText('Title'), 'Duplicate');
    await u.type(screen.getByLabelText('Body'), 'Text');
    await u.click(screen.getByRole('button', { name: 'Publish post' }));

    const notice = await screen.findByText('The title has already been taken.');
    expect(notice).toHaveAttribute('data-error', 'true');
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Title')).toHaveValue('Duplicate');
  });
});
