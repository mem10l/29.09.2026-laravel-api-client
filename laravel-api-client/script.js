'use strict';

const API = 'http://127.0.0.1:8000/api';           // php artisan serve
const QUOTE_URL = 'https://api.kanye.rest';
const CAT_URL = 'https://catfact.ninja/fact';
const STATUS = { 1: 'public', 2: 'private' };      // ids from the post_statuses migration

/* ---------- helpers ---------- */

const $ = (selector) => document.querySelector(selector);

// el('div', {class: 'x', onclick: fn}, 'text', child) -- text is never parsed as HTML
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

const btn = (label, onclick, cls = '') => el('button', { type: 'button', class: `btn ${cls}`, onclick }, label);
const formData = (form) => Object.fromEntries(new FormData(form));

let noticeTimer;
function notify(message, isError = false) {
  const box = $('#notice');
  box.textContent = message;
  box.className = isError ? 'notice error' : 'notice';
  box.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { box.hidden = true; }, 5000);
}

// Wraps an event handler so errors show up in the notice box.
const guard = (fn) => async (event) => {
  try { await fn(event); } catch (error) { notify(error.message, true); }
};

/* ---------- loading indicators ---------- */

let pending = 0;   // progress bar stays visible while any Laravel request runs
const busy = (delta) => { pending += delta; $('#progress').hidden = pending === 0; };
const spin = (box, label = 'Loading…') => box.replaceChildren(el('span', { class: 'spinner' }), label);

/* ---------- session (token + user survive a reload) ---------- */

let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');

function setSession(data) {
  token = data ? data.token : null;
  user = data ? data.user : null;
  if (data) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  renderSession();
}

function renderSession() {
  const loggedIn = Boolean(token && user);
  $('#auth-panel').hidden = loggedIn;
  $('#new-post-panel').hidden = !loggedIn;
  $('#session').hidden = !loggedIn;
  if (loggedIn) $('#session-name').textContent = user.name;
}

function showTab(login) {
  $('#login-form').hidden = !login;
  $('#register-form').hidden = login;
  $('#tab-login').classList.toggle('is-active', login);
  $('#tab-register').classList.toggle('is-active', !login);
}

/* ---------- Laravel API (fetch + async/await) ---------- */

const errorText = (status, data) =>
  data?.errors ? Object.values(data.errors).flat().join(' ')
    : data?.message || `Request failed (HTTP ${status}).`;

async function api(path, method = 'GET', body) {
  busy(1);
  try {
    const response = await fetch(API + path, {
      method,
      headers: {
        Accept: 'application/json', // makes Laravel answer with JSON, never HTML redirects
        ...(body && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: body && JSON.stringify(body),
    }).catch(() => { throw new Error('Cannot reach the API. Is "php artisan serve" running?'); });

    const data = response.status === 204 ? null : await response.json().catch(() => null);
    if (!response.ok) throw new Error(errorText(response.status, data));
    return data;
  } finally {
    busy(-1);
  }
}

/* ---------- login / register / logout ---------- */

function authHandler(path, welcome) {
  return guard(async (event) => {
    event.preventDefault();
    const data = await api(path, 'POST', formData(event.target));
    // Login answers 200 with {errors: ...} and no token when the password is wrong.
    if (!data.token) throw new Error(errorText(200, data));
    setSession(data);
    event.target.reset();
    await loadPosts(); // reload so edit/delete buttons appear on your own posts
    notify(welcome(data.user));
  });
}

async function logout() {
  await api('/logout', 'POST').catch(() => {}); // token may already be invalid
  setSession(null);
  await loadPosts();
  notify('You are logged out.');
}

/* ---------- posts ---------- */

async function loadPosts() {
  const list = $('#posts');
  spin(list, 'Loading posts…');
  try {
    const posts = await api('/posts');
    list.replaceChildren(...posts.sort((a, b) => b.id - a.id).map(postCard));
    if (!posts.length) list.append(el('p', { class: 'muted' }, 'No posts yet. Log in and write the first one.'));
  } catch (error) {
    list.replaceChildren(el('p', { class: 'muted' }, 'Could not load posts.'));
    throw error;
  }
}

function postCard(post) {
  const mine = user && post.user_id === user.id;
  const status = STATUS[post.post_status_id] || 'public';
  const date = post.created_at
    ? new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  const card = el('article', { class: 'post' });
  const replace = (updated, message) => { card.replaceWith(postCard(updated)); notify(message); };

  const view = el('div', {},
    el('div', { class: 'post-head' },
      el('h3', {}, post.title),
      el('span', { class: `badge ${status}` }, status)),
    el('p', { class: 'post-body' }, post.body),
    el('p', { class: 'meta' }, `${mine ? 'You' : 'User #' + post.user_id}, ${date}`));

  const edit = el('form', { class: 'form', hidden: '' },
    el('input', { name: 'title', value: post.title, required: '', maxlength: '255' }),
    el('textarea', { name: 'body', rows: '4', required: '' }, post.body),
    el('div', { class: 'row' },
      el('button', { type: 'submit', class: 'btn primary' }, 'Save changes'),
      btn('Cancel', () => { edit.hidden = true; view.hidden = false; })));
  edit.onsubmit = guard(async (event) => {
    event.preventDefault();
    replace(await api(`/posts/${post.id}`, 'PUT', formData(edit)), 'Post updated.');
  });

  // comments load the first time the panel is opened
  const comments = el('div', { class: 'comments', hidden: '' });
  let loaded = false;
  const actions = el('div', { class: 'row actions' },
    btn('Comments', guard(async () => {
      comments.hidden = !comments.hidden;
      if (comments.hidden || loaded) return;
      spin(comments, 'Loading comments…');
      try {
        await buildComments(post.id, comments);
        loaded = true;
      } catch (error) {
        comments.replaceChildren(el('p', { class: 'muted' }, 'Could not load comments.'));
        throw error;
      }
    })));

  if (mine) {
    const next = post.post_status_id === 1 ? 2 : 1;
    actions.append(
      btn('Edit', () => { view.hidden = true; edit.hidden = false; }),
      btn(next === 2 ? 'Make private' : 'Make public', guard(async () =>
        replace(await api(`/posts/${post.id}/status`, 'PATCH', { post_status_id: next }),
          `Post is now ${STATUS[next]}.`))),
      btn('Delete', guard(async () => {
        if (!confirm(`Delete "${post.title}"?`)) return;
        await api(`/posts/${post.id}`, 'DELETE');
        card.remove();
        notify('Post deleted.');
      }), 'danger'));
  }

  card.append(view, edit, actions, comments);
  return card;
}

/* ---------- comments (/posts/{post}/comments) ---------- */

async function buildComments(postId, box) {
  const list = el('ul', { class: 'comment-list' });
  const empty = el('p', { class: 'muted' }, 'No comments yet.');
  const sync = () => { empty.hidden = list.children.length > 0; };

  (await api(`/posts/${postId}/comments`)).forEach((c) => list.append(commentItem(postId, c, sync)));
  sync();
  box.replaceChildren(list, empty);

  if (!user) {
    box.append(el('p', { class: 'muted' }, 'Log in to write a comment.'));
    return;
  }

  const form = el('form', { class: 'comment-form' },
    el('input', { name: 'content', placeholder: 'Write a comment', required: '' }),
    el('button', { type: 'submit', class: 'btn primary' }, 'Post comment'));
  form.onsubmit = guard(async (event) => {
    event.preventDefault();
    list.append(commentItem(postId, await api(`/posts/${postId}/comments`, 'POST', formData(form)), sync));
    form.reset();
    sync();
  });
  box.append(form);
}

function commentItem(postId, comment, onRemove) {
  const mine = user && comment.user_id === user.id;
  const item = el('li', { class: 'comment' },
    el('p', {}, comment.content),
    el('span', { class: 'meta' }, mine ? 'You' : `User #${comment.user_id}`));

  if (mine) {
    item.append(el('button', {
      type: 'button',
      class: 'link-btn',
      onclick: guard(async () => {
        await api(`/posts/${postId}/comments/${comment.id}`, 'DELETE');
        item.remove();
        onRemove();
        notify('Comment deleted.');
      }),
    }, 'Delete'));
  }
  return item;
}

/* ---------- random quote (kanye.rest): the SAME task with two methods ----------
   Plain requests on purpose: the Laravel token must not be sent to a third party. */

const renderQuote = (quote, method) => $('#quote-text').replaceChildren(
  el('p', { class: 'quote-text' }, `\u201C${quote}\u201D`),
  el('span', { class: 'meta' }, `Loaded with ${method}`));

const quoteFailed = () => { $('#quote-text').textContent = 'Could not load a quote. Try again.'; };

// Method 1: fetch + async/await
async function loadQuote() {
  spin($('#quote-text'));
  try {
    const response = await fetch(QUOTE_URL);
    if (!response.ok) throw new Error();
    renderQuote((await response.json()).quote, 'fetch (async/await)');
  } catch {
    quoteFailed();
  }
}

// Method 2: XMLHttpRequest
function loadQuoteXHR() {
  spin($('#quote-text'));
  const xhr = new XMLHttpRequest();
  xhr.open('GET', QUOTE_URL);
  xhr.timeout = 10000;
  xhr.onload = () => {
    if (xhr.status !== 200) return quoteFailed();
    try { renderQuote(JSON.parse(xhr.responseText).quote, 'XMLHttpRequest'); } catch { quoteFailed(); }
  };
  xhr.onerror = xhr.ontimeout = quoteFailed;
  xhr.send();
}

/* ---------- cat fact (catfact.ninja), shows a query parameter: /fact?max_length=60 ---------- */

async function loadCatFact(maxLength) {
  const box = $('#cat-text');
  spin(box);
  try {
    const url = maxLength ? `${CAT_URL}?max_length=${encodeURIComponent(maxLength)}` : CAT_URL;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (response.status === 404) {
      box.textContent = 'No fact that short. Try a larger number.';
      return;
    }
    if (!response.ok) throw new Error();
    box.textContent = (await response.json()).fact;
  } catch {
    box.textContent = 'Could not load a cat fact. Try again.';
  }
}

/* ---------- start-up ---------- */

$('#tab-login').onclick = () => showTab(true);
$('#tab-register').onclick = () => showTab(false);
$('#login-form').onsubmit = authHandler('/login', (u) => `Welcome back, ${u.name}.`);
$('#register-form').onsubmit = authHandler('/register', (u) => `Account created. You are logged in as ${u.name}.`);
$('#post-form').onsubmit = guard(async (event) => {
  event.preventDefault();
  await api('/posts', 'POST', formData(event.target));
  event.target.reset();
  await loadPosts();
  notify('Post published.');
});
$('#logout-btn').onclick = guard(logout);
$('#refresh-btn').onclick = guard(loadPosts);
$('#quote-btn').onclick = loadQuote;
$('#quote-xhr-btn').onclick = loadQuoteXHR;
$('#cat-form').onsubmit = (event) => {
  event.preventDefault();
  loadCatFact(new FormData(event.target).get('max_length'));
};

(async function init() {
  loadQuote(); // independent of Laravel, so they start first
  loadCatFact();
  if (token) {
    try {
      user = await api('/user'); // is the saved token still valid?
      localStorage.setItem('user', JSON.stringify(user));
    } catch {
      setSession(null);
    }
  }
  renderSession();
  try { await loadPosts(); } catch (error) { notify(error.message, true); }
})();