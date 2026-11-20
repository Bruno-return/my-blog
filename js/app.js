// 블로그 앱: 글 목록을 불러오고, 해시 주소(#/...)에 따라 화면을 그립니다.
//   #/              글 목록
//   #/post/{slug}   글 상세
//   #/tag/{tag}     태그별 글 목록

import { parseFrontMatter, markdownToHtml, escapeHtml } from './markdown.js';

const SITE_TITLE = 'My Blog';
const app = document.getElementById('app');
const postsBase = new URL('posts/', document.baseURI);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const bodies = new Map(); // slug → 마크다운 본문
let postsPromise = null;
let renderCount = 0;

// ===== 데이터 =====

async function fetchText(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.text();
}

function loadPosts() {
  if (!postsPromise) {
    postsPromise = fetchPosts().catch((err) => {
      postsPromise = null; // 실패하면 다음에 다시 시도
      throw err;
    });
  }
  return postsPromise;
}

async function fetchPosts() {
  const files = JSON.parse(await fetchText(new URL('index.json', postsBase)));
  if (!Array.isArray(files)) {
    throw new Error('posts/index.json은 파일 이름 배열이어야 합니다. 예: ["hello-world.md"]');
  }

  const posts = await Promise.all(
    files.map(async (file, order) => {
      try {
        const text = await fetchText(new URL(file, postsBase));
        const { meta, body } = parseFrontMatter(text);
        if (String(meta.draft).toLowerCase() === 'true') return null;
        const post = { ...toPost(file, meta, body), order };
        bodies.set(post.slug, body);
        return post;
      } catch (err) {
        console.warn(`글을 불러오지 못했습니다: ${file}`, err);
        return null;
      }
    }),
  );

  // 날짜가 같으면 index.json에서 뒤에 있는(나중에 추가한) 글이 먼저 옵니다.
  return posts.filter(Boolean).sort((a, b) => b.time - a.time || b.order - a.order);
}

function toPost(file, meta, body) {
  const slug = file.replace(/^.*\//, '').replace(/\.md$/i, '');
  const date = parseDate(meta.date);
  let tags = [];
  if (Array.isArray(meta.tags)) tags = meta.tags;
  else if (meta.tags) tags = String(meta.tags).split(',').map((t) => t.trim()).filter(Boolean);

  return {
    slug,
    title: meta.title || slug,
    date: meta.date || '',
    time: date ? date.getTime() : 0,
    dateLabel: date ? formatDate(date) : '',
    tags,
    description: meta.description || excerpt(body),
  };
}

// '2026-11-16'을 시간대 영향 없이 그 날짜로 읽습니다.
function parseDate(value) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(value || ''));
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateFormat = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

function formatDate(date) {
  return dateFormat.format(date);
}

// description이 없으면 본문 첫 문단으로 요약을 만듭니다.
function excerpt(body, max = 120) {
  const para = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^(#|```|~~~|>|\||[-*+] |\d+\. |!\[|---)/.test(p));
  if (!para) return '';
  const text = para
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

// ===== 라우팅 =====

function safeDecode(part) {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}

function parseRoute() {
  const path = location.hash.replace(/^#/, '');
  if (!path || path === '/') return { name: 'home' };
  if (!path.startsWith('/')) return { name: 'notfound' };
  const parts = path.split('/').filter(Boolean).map(safeDecode);
  if (parts[0] === 'post' && parts[1] && parts.length === 2) return { name: 'post', slug: parts[1] };
  if (parts[0] === 'tag' && parts[1] && parts.length === 2) return { name: 'tag', tag: parts[1] };
  return { name: 'notfound' };
}

const postHref = (slug) => `#/post/${encodeURIComponent(slug)}`;
const tagHref = (tag) => `#/tag/${encodeURIComponent(tag)}`;

async function render() {
  const id = ++renderCount;
  const route = parseRoute();

  try {
    const posts = await loadPosts();
    if (id !== renderCount) return; // 그 사이 다른 페이지로 이동함

    if (route.name === 'home') renderHome(posts);
    else if (route.name === 'post') renderPost(posts, route.slug);
    else if (route.name === 'tag') renderTag(posts, route.tag);
    else renderNotFound();
  } catch (err) {
    if (id !== renderCount) return;
    console.error(err);
    renderError(err);
  }

  window.scrollTo(0, 0);
  if (id > 1) app.focus({ preventScroll: true }); // 화면 낭독기가 새 내용을 읽도록
}

function setTitle(title) {
  document.title = title ? `${title} · ${SITE_TITLE}` : SITE_TITLE;
}

// ===== 화면 조각 =====

function tagsHtml(tags) {
  if (!tags.length) return '';
  const items = tags
    .map((t) => `<li><a class="tag" href="${escapeHtml(tagHref(t))}">#${escapeHtml(t)}</a></li>`)
    .join('');
  return `<ul class="tag-list" aria-label="태그">${items}</ul>`;
}

function metaHtml(post) {
  const time = post.dateLabel
    ? `<time datetime="${escapeHtml(post.date)}">${escapeHtml(post.dateLabel)}</time>`
    : '';
  return `<div class="post-meta">${time}${tagsHtml(post.tags)}</div>`;
}

function postListHtml(posts) {
  const items = posts
    .map(
      (post) => `
      <li class="post-item">
        <article>
          <h2 class="post-item-title"><a href="${escapeHtml(postHref(post.slug))}">${escapeHtml(post.title)}</a></h2>
          ${metaHtml(post)}
          ${post.description ? `<p class="post-item-desc">${escapeHtml(post.description)}</p>` : ''}
        </article>
      </li>`,
    )
    .join('');
  return `<ul class="post-list">${items}</ul>`;
}

// ===== 페이지 =====

function renderHome(posts) {
  setTitle('');
  if (!posts.length) {
    app.innerHTML = `
      <div class="notice">
        <h1>아직 글이 없어요</h1>
        <p><code>posts/</code> 폴더에 마크다운 글을 추가하고 <code>posts/index.json</code>에 파일 이름을 등록해 주세요.</p>
      </div>`;
    return;
  }
  app.innerHTML = `
    <h1 class="page-heading">최근 글</h1>
    <p class="page-sub">글 ${posts.length}개</p>
    ${postListHtml(posts)}`;
}

function renderPost(posts, slug) {
  const index = posts.findIndex((p) => p.slug === slug);
  if (index === -1) {
    renderNotFound();
    return;
  }

  const post = posts[index];
  const newer = posts[index - 1];
  const older = posts[index + 1];
  const content = markdownToHtml(bodies.get(slug) || '', { base: postsBase.href });

  const navLink = (target, label, cls) =>
    target
      ? `<a class="${cls}" href="${escapeHtml(postHref(target.slug))}">
           <span class="label">${label}</span>${escapeHtml(target.title)}
         </a>`
      : '';

  setTitle(post.title);
  app.innerHTML = `
    <article class="post">
      <header class="post-header">
        <h1 class="post-title">${escapeHtml(post.title)}</h1>
        ${metaHtml(post)}
      </header>
      <div class="post-content">${content}</div>
    </article>
    ${
      older || newer
        ? `<nav class="post-nav" aria-label="이전 글과 다음 글">
            ${navLink(older, '← 이전 글', 'prev')}
            ${navLink(newer, '다음 글 →', 'next')}
          </nav>`
        : ''
    }
    <a class="back-link" href="#/">← 목록으로</a>`;
}

function renderTag(posts, tag) {
  const tagged = posts.filter((p) => p.tags.includes(tag));
  if (!tagged.length) {
    renderNotFound(`'#${tag}' 태그가 붙은 글이 없어요.`);
    return;
  }
  setTitle(`#${tag}`);
  app.innerHTML = `
    <h1 class="page-heading">#${escapeHtml(tag)}</h1>
    <p class="page-sub">글 ${tagged.length}개 · <a href="#/">전체 글 보기</a></p>
    ${postListHtml(tagged)}`;
}

function renderNotFound(message = '주소가 바뀌었거나 삭제된 글일 수 있어요.') {
  setTitle('페이지를 찾을 수 없어요');
  app.innerHTML = `
    <div class="notice">
      <h1>페이지를 찾을 수 없어요</h1>
      <p>${escapeHtml(message)}</p>
      <p><a href="#/">← 목록으로 돌아가기</a></p>
    </div>`;
}

function renderError(err) {
  setTitle('오류');
  app.innerHTML = `
    <div class="notice">
      <h1>글을 불러오지 못했어요</h1>
      <p>${escapeHtml(err.message || String(err))}</p>
      <p><button class="retry-button" type="button">다시 시도</button></p>
    </div>`;
  app.querySelector('.retry-button').addEventListener('click', render);
}

// ===== 페이지 안 앵커 링크 =====
// 본문의 [목차](#제목) 같은 링크가 해시 라우팅과 부딪히지 않도록 직접 스크롤합니다.

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (href.startsWith('#/')) return; // 라우팅 링크는 그대로

  event.preventDefault();
  const target = document.getElementById(safeDecode(href.slice(1)));
  if (!target) return;
  target.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
  if (target === app) app.focus({ preventScroll: true });
});

// ===== 시작 =====

document.getElementById('year').textContent = String(new Date().getFullYear());
window.addEventListener('hashchange', render);
render();
