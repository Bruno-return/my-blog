// 마크다운 → HTML 변환기 (외부 라이브러리 없이 직접 구현)
//
// 공개 함수
//   parseFrontMatter(text)          → { meta, body }
//   markdownToHtml(text, options)   → HTML 문자열
//     options.base: 상대 경로(./, ../)를 풀 때 기준이 되는 URL (예: posts/ 폴더 주소)
//   escapeHtml(text)                → HTML 이스케이프된 문자열
//
// 보안: 모든 텍스트는 HTML 이스케이프한 뒤 변환하므로, 본문에 쓴 HTML 태그는 실행되지 않고 글자로 보입니다.
// javascript:, vbscript:, data: 링크는 '#'으로 바뀝니다.

const PH = '\u0001'; // 인라인 처리 중 임시 자리표시자 구분 문자
const BR = `${PH}br${PH}`; // 강제 줄바꿈 자리표시자

const RE = {
  fence: /^( {0,3})(`{3,}|~{3,})[ \t]*([^`\s]*)[^`]*$/,
  heading: /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/,
  hr: /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/,
  quote: /^ {0,3}>/,
  item: /^( *)([-*+]|\d{1,9}[.)])(?:[ \t]+(.*))?$/,
  tableSep: /^ *\|? *:?-+:? *(?:\| *:?-+:? *)*\|? *$/,
  task: /^\[([ xX])\][ \t]+/,
};

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const UNESCAPES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

function unescapeHtml(text) {
  return text.replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => UNESCAPES[e]);
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, '');
}

function normalize(text) {
  return String(text)
    .replace(/^﻿/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\u0001/g, '');
}

// ===== Front matter =====

export function parseFrontMatter(text) {
  const src = normalize(text);
  const match = /^---[ \t]*\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n|$)/.exec(src);
  if (!match) return { meta: {}, body: src };

  const meta = {};
  for (const line of (match[1] || '').split('\n')) {
    const kv = /^([A-Za-z_][\w-]*)[ \t]*:[ \t]*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = parseValue(kv[2].trim());
  }
  return { meta, body: src.slice(match[0].length) };
}

function parseValue(value) {
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((v) => unquote(v.trim()))
      .filter(Boolean);
  }
  return unquote(value);
}

function unquote(value) {
  const first = value[0];
  if (value.length >= 2 && (first === '"' || first === "'") && value.at(-1) === first) {
    return value.slice(1, -1);
  }
  return value;
}

// ===== 블록 파싱 =====

export function markdownToHtml(text, options = {}) {
  const ctx = { slugs: new Map(), base: options.base || null };
  const lines = normalize(text)
    .split('\n')
    .map((line) => line.replace(/^\t+/, (tabs) => '    '.repeat(tabs.length)));
  return parseBlocks(lines, ctx, false);
}

function indentOf(line) {
  return line.match(/^ */)[0].length;
}

function isOrderedMarker(marker) {
  return /\d/.test(marker);
}

function isTableStart(lines, i) {
  const next = lines[i + 1];
  return (
    lines[i].includes('|') &&
    next !== undefined &&
    next.includes('|') &&
    next.includes('-') &&
    RE.tableSep.test(next)
  );
}

// 문단을 끊고 새 블록을 시작하는 줄인지
function startsBlock(lines, i) {
  const line = lines[i];
  if (RE.fence.test(line) || RE.heading.test(line) || RE.hr.test(line) || RE.quote.test(line)) {
    return true;
  }
  const item = RE.item.exec(line);
  if (item && item[3]) return true;
  return isTableStart(lines, i);
}

// tight=true이면 문단을 <p>로 감싸지 않습니다 (촘촘한 목록 항목용).
function parseBlocks(lines, ctx, tight) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    let m;

    if (!line.trim()) {
      i++;
      continue;
    }

    // 코드 블록
    if ((m = RE.fence.exec(line))) {
      const indent = m[1].length;
      const fence = m[2];
      const lang = m[3].replace(/[^\w+#.-]/g, '');
      const close = new RegExp(`^ {0,3}${fence[0] === '`' ? '`' : '~'}{${fence.length},}[ \\t]*$`);
      const code = [];
      i++;
      while (i < lines.length && !close.test(lines[i])) {
        code.push(lines[i].replace(new RegExp(`^ {0,${indent}}`), ''));
        i++;
      }
      i++; // 닫는 펜스 건너뛰기 (없으면 문서 끝까지)
      const cls = lang ? ` class="language-${escapeHtml(lang)}"` : '';
      out.push(`<pre><code${cls}>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    // 제목
    if ((m = RE.heading.exec(line))) {
      const level = m[1].length;
      const inner = inline(m[2] || '', ctx);
      const id = uniqueSlug(unescapeHtml(stripTags(inner)), ctx);
      out.push(`<h${level} id="${escapeHtml(id)}">${inner}</h${level}>`);
      i++;
      continue;
    }

    // 수평선
    if (RE.hr.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // 인용문
    if (RE.quote.test(line)) {
      const inner = [];
      while (i < lines.length && RE.quote.test(lines[i])) {
        inner.push(lines[i].replace(/^ {0,3}> ?/, ''));
        i++;
      }
      out.push(`<blockquote>\n${parseBlocks(inner, ctx, false)}\n</blockquote>`);
      continue;
    }

    // 표
    if (isTableStart(lines, i)) {
      const result = parseTable(lines, i, ctx);
      out.push(result.html);
      i = result.next;
      continue;
    }

    // 목록
    if (RE.item.test(line)) {
      const result = parseList(lines, i, ctx);
      out.push(result.html);
      i = result.next;
      continue;
    }

    // 문단
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) {
      buf.push(lines[i]);
      i++;
    }
    const text = buf
      .map((l, k) => {
        const hard = k < buf.length - 1 && /( {2,}|\\)$/.test(l);
        let t = l.trim();
        if (hard && t.endsWith('\\')) t = t.slice(0, -1);
        return t + (hard ? BR : '');
      })
      .join('\n');
    const html = inline(text, ctx);
    out.push(tight ? html : `<p>${html}</p>`);
  }

  return out.join('\n');
}

function splitRow(row) {
  let s = row.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
  return s.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function parseTable(lines, i, ctx) {
  const header = splitRow(lines[i]);
  const aligns = splitRow(lines[i + 1]).map((c) => {
    const left = c.startsWith(':');
    const right = c.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    if (left) return 'left';
    return '';
  });
  const cell = (tag, text, col) => {
    const align = aligns[col] ? ` style="text-align:${aligns[col]}"` : '';
    return `<${tag}${align}>${inline(text || '', ctx)}</${tag}>`;
  };

  const head = header.map((h, col) => cell('th', h, col)).join('');
  const rows = [];
  i += 2;
  while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
    const cells = splitRow(lines[i]);
    rows.push(`<tr>${header.map((_, col) => cell('td', cells[col], col)).join('')}</tr>`);
    i++;
  }

  const body = rows.length ? `\n<tbody>\n${rows.join('\n')}\n</tbody>` : '';
  return {
    html: `<div class="table-wrap">\n<table>\n<thead>\n<tr>${head}</tr>\n</thead>${body}\n</table>\n</div>`,
    next: i,
  };
}

function parseList(lines, i, ctx) {
  const first = RE.item.exec(lines[i]);
  const ordered = isOrderedMarker(first[2]);
  const start = ordered ? parseInt(first[2], 10) : 1;
  const items = [];
  let cur = null;
  let loose = false;

  const newItem = (line, m) => {
    const ind = m[1].length;
    const marker = m[2];
    const spaces = line.slice(ind + marker.length).match(/^[ \t]*/)[0].length;
    const contentIndent = ind + marker.length + (spaces >= 1 && spaces <= 4 ? spaces : 1);
    return { contentIndent, lines: [m[3] || ''] };
  };

  while (i < lines.length) {
    const line = lines[i];

    // 빈 줄: 다음 내용이 이 목록에 이어지는지 미리 확인
    if (!line.trim()) {
      let j = i + 1;
      while (j < lines.length && !lines[j].trim()) j++;
      if (j >= lines.length) break;
      const nm = RE.item.exec(lines[j]);
      const sibling = nm && !RE.hr.test(lines[j]) && isOrderedMarker(nm[2]) === ordered &&
        nm[1].length < cur.contentIndent;
      if (!sibling && indentOf(lines[j]) < cur.contentIndent) break;
      cur.lines.push('');
      i++;
      continue;
    }

    const m = RE.item.exec(line);
    const ind = indentOf(line);

    // 같은 수준의 새 항목
    if (m && !RE.hr.test(line) && (!cur || ind < cur.contentIndent)) {
      if (cur && isOrderedMarker(m[2]) !== ordered) break;
      if (cur && cur.lines.at(-1) === '') loose = true;
      cur = newItem(line, m);
      items.push(cur);
      i++;
      continue;
    }

    // 항목 안쪽으로 들여쓴 내용 (중첩 목록, 이어지는 문단 등)
    if (ind >= cur.contentIndent) {
      cur.lines.push(line.slice(cur.contentIndent));
      i++;
      continue;
    }

    // 들여쓰기 없이 바로 이어지는 문단 줄
    if (cur.lines.at(-1) !== '' && !startsBlock(lines, i)) {
      cur.lines.push(line.trim());
      i++;
      continue;
    }

    break;
  }

  // 항목 안에 빈 줄로 나뉜 블록이 있으면 느슨한 목록(<p> 사용)
  for (const item of items) {
    while (item.lines.length && item.lines.at(-1) === '') item.lines.pop();
    if (item.lines.includes('')) loose = true;
  }

  const lis = items.map((item) => {
    let checkbox = '';
    const task = RE.task.exec(item.lines[0]);
    if (task) {
      item.lines[0] = item.lines[0].slice(task[0].length);
      const checked = task[1] !== ' ' ? ' checked' : '';
      checkbox = `<input type="checkbox" disabled${checked}> `;
    }
    const cls = task ? ' class="task-item"' : '';
    return `<li${cls}>${checkbox}${parseBlocks(item.lines, ctx, !loose)}</li>`;
  });

  const open = ordered ? `<ol${start !== 1 ? ` start="${start}"` : ''}>` : '<ul>';
  const close = ordered ? '</ol>' : '</ul>';
  const cls = items.some((item, k) => lis[k].startsWith('<li class="task-item"'))
    ? open.replace('>', ' class="task-list">')
    : open;
  return { html: `${cls}\n${lis.join('\n')}\n${close}`, next: i };
}

// ===== 인라인 파싱 =====

// 링크 주소(괄호 한 단계까지 허용) + 선택적인 "제목"
const LINK_DEST = String.raw`\s*((?:[^\s()]|\([^\s()]*\))+)(?:\s+&quot;(.*?)&quot;)?\s*`;

function inline(src, ctx) {
  const store = [];
  const hold = (html) => `${PH}${store.push(html) - 1}${PH}`;
  const restore = (s) => {
    for (let n = 0; n < 5 && s.includes(PH); n++) {
      s = s.replace(/\u0001(\d+)\u0001/g, (_, k) => store[k]);
    }
    return s;
  };

  let s = src;

  // 1) 인라인 코드: 안쪽은 아무 변환도 하지 않음
  s = s.replace(/(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g, (_, ticks, code) => {
    const content = code.replace(/\n/g, ' ').replace(/^ (.*) $/, '$1');
    return hold(`<code>${escapeHtml(content)}</code>`);
  });

  // 2) 백슬래시 이스케이프
  s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|~<>])/g, (_, c) => hold(escapeHtml(c)));

  // 3) 나머지 텍스트 HTML 이스케이프
  s = escapeHtml(s);

  // 4) 자동 링크 <https://...>
  s = s.replace(/&lt;(https?:\/\/[^\s<>]+?)&gt;/gi, (_, url) => hold(`${linkOpen(url, '', ctx)}${url}</a>`));

  // 5) 이미지
  s = s.replace(
    new RegExp(`!\\[([^\\]]*)\\]\\(${LINK_DEST}\\)`, 'g'),
    (_, alt, url, title) => {
      const altText = escapeHtml(unescapeHtml(stripTags(restore(alt))));
      const titleAttr = title ? ` title="${title}"` : '';
      return hold(`<img src="${safeUrl(url, ctx)}" alt="${altText}"${titleAttr} loading="lazy">`);
    },
  );

  // 6) 링크 (링크 텍스트 안의 강조는 아래에서 계속 처리)
  s = s.replace(
    new RegExp(`\\[([^\\]]+)\\]\\(${LINK_DEST}\\)`, 'g'),
    (_, text, url, title) => hold(linkOpen(url, title, ctx)) + text + hold('</a>'),
  );

  // 7) 강조
  s = s.replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<![\p{L}\p{N}_])__(?=\S)([\s\S]*?\S)__(?![\p{L}\p{N}_])/gu, '<strong>$1</strong>');
  s = s.replace(/\*(?=\S)([^*]*?\S)\*/g, '<em>$1</em>');
  s = s.replace(/(?<![\p{L}\p{N}_])_(?=\S)([^_]*?\S)_(?![\p{L}\p{N}_])/gu, '<em>$1</em>');
  s = s.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');

  // 8) 자리표시자 복원
  s = restore(s);
  return s.replace(/\u0001br\u0001\n?/g, '<br>\n');
}

// escapedUrl은 이미 HTML 이스케이프된 상태로 들어옵니다.
function resolveUrl(escapedUrl, ctx) {
  let url = unescapeHtml(escapedUrl).trim();
  const scheme = url.replace(/[\u0000- ]/g, '').toLowerCase();
  if (/^(javascript|vbscript|data):/.test(scheme)) return '#';

  // 다른 글로 가는 링크: other-post.md → #/post/other-post
  const md = /^(?:\.\/)?([^/\s#?]+)\.md(?:#.*)?$/i.exec(url);
  if (md) return `#/post/${encodeURIComponent(md[1])}`;

  if (ctx.base && /^\.{1,2}\//.test(url)) {
    try {
      url = new URL(url, ctx.base).href;
    } catch {
      // 잘못된 주소는 그대로 둡니다.
    }
  }
  return url;
}

function safeUrl(escapedUrl, ctx) {
  return escapeHtml(resolveUrl(escapedUrl, ctx));
}

function linkOpen(escapedUrl, title, ctx) {
  const url = resolveUrl(escapedUrl, ctx);
  const titleAttr = title ? ` title="${title}"` : '';
  let external = false;
  if (/^https?:\/\//i.test(url)) {
    external = typeof location === 'undefined' || !url.startsWith(location.origin);
  }
  const target = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  return `<a href="${escapeHtml(url)}"${titleAttr}${target}>`;
}

// ===== 제목 id =====

function slugify(text) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .replace(/\s+/g, '-') || 'section'
  );
}

function uniqueSlug(text, ctx) {
  const base = slugify(text);
  const count = ctx.slugs.get(base) || 0;
  ctx.slugs.set(base, count + 1);
  return count ? `${base}-${count}` : base;
}
