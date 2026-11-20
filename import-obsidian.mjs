// Obsidian 보관함의 '40 블로그' 폴더에서 draft가 체크되지 않은 글을 블로그로 가져옵니다. (의존성 없음)
//
// 사용법
//   node import-obsidian.mjs              실제로 가져오기
//   node import-obsidian.mjs --dry-run    무엇을 가져올지 보기만 하기 (아무 파일도 바꾸지 않음)
//   node import-obsidian.mjs [--dry-run] [원본 폴더] [--blog=블로그 폴더]
//
// 하는 일
//   1. 원본 폴더의 .md 노트 중 draft가 true가 아닌 노트를 고릅니다.
//   2. Obsidian 문법을 블로그 마크다운으로 바꿔 posts/{slug}.md로 저장하고, 첨부 이미지는 assets/로 복사합니다.
//   3. posts/index.json 맨 뒤에 등록합니다.
//   4. 모두 성공하면 원본 노트의 draft를 true(체크)로 바꿉니다.

import { readdir, readFile, writeFile, copyFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, basename, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const blogArg = args.find((a) => a.startsWith('--blog='));
const blogRoot = resolve(blogArg ? blogArg.slice('--blog='.length) : dirname(fileURLToPath(import.meta.url)));
const sourceDir = resolve(
  args.find((a) => !a.startsWith('--')) ||
    join(process.env.USERPROFILE || process.env.HOME || '', 'OneDrive', '문서', 'Obsidian Vault', '40 블로그'),
);
const vaultRoot = dirname(sourceDir);
const postsDir = join(blogRoot, 'posts');
const assetsDir = join(blogRoot, 'assets');
const indexPath = join(postsDir, 'index.json');

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp']);

// ===== front matter (Obsidian이 쓰는 YAML의 간단한 부분만) =====

function splitFrontMatter(text) {
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const m = /^---[ \t]*\n(?:([\s\S]*?)\n)?---[ \t]*(?:\n|$)/.exec(src);
  if (!m) return { meta: {}, body: src };
  return { meta: parseYaml(m[1] || ''), body: src.slice(m[0].length) };
}

function unquote(v) {
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v.at(-1) === v[0]) return v.slice(1, -1);
  return v;
}

function parseYaml(block) {
  const meta = {};
  let listKey = null;
  for (const line of block.split('\n')) {
    const item = /^\s+-\s*(.*)$/.exec(line);
    if (item && listKey) {
      const v = unquote(item[1].trim());
      if (v) meta[listKey].push(v);
      continue;
    }
    const kv = /^([^\s:#][^:]*?)\s*:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const key = kv[1].trim();
    const value = kv[2].trim();
    listKey = null;
    if (value === '') {
      meta[key] = []; // 빈 값이거나, 다음 줄부터 "- 항목" 목록
      listKey = key;
    } else if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value.slice(1, -1).split(',').map((s) => unquote(s.trim())).filter(Boolean);
    } else {
      meta[key] = unquote(value);
    }
  }
  return meta;
}

const str = (v) => (Array.isArray(v) ? v.join(' ') : String(v ?? '')).trim();
const list = (v) => (Array.isArray(v) ? v : str(v) ? str(v).split(',') : []).map((s) => s.trim()).filter(Boolean);

// ===== 값 정리 =====

function toSlug(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\\/:*?"<>|#%&{}^~[\]`'.,()!@$=+;]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanTag(tag) {
  return tag.replace(/^#/, '').replace(/[[\],]/g, '').trim();
}

function cleanLine(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function pickDate(meta, mtime) {
  for (const key of ['날짜', 'date', '작성일']) {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(str(meta[key]));
    if (m) return m[1];
  }
  const d = mtime;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ===== 첨부 파일 찾기 =====

let fileIndex = null;

async function walk(dir, out) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue; // .obsidian, .trash 등
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else if (!out.has(entry.name.toLowerCase())) out.set(entry.name.toLowerCase(), full);
  }
  return out;
}

async function findAttachment(name, noteDir) {
  const direct = [join(noteDir, name), join(vaultRoot, name)].find((p) => existsSync(p));
  if (direct) return direct;
  fileIndex ??= await walk(vaultRoot, new Map());
  return fileIndex.get(basename(name).toLowerCase()) || null;
}

// ===== 본문 변환 =====

async function convertBody(body, note, ctx) {
  // 코드 블록 안은 건드리지 않습니다.
  const parts = body.split(/(^(?:```|~~~)[^\n]*\n[\s\S]*?^(?:```|~~~)[ \t]*$)/m);
  for (let i = 0; i < parts.length; i += 2) {
    parts[i] = await convertText(parts[i], note, ctx);
  }
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

async function copyImage(src, note, ctx) {
  const name = basename(src).replace(/\s+/g, '-');
  const target = join(assetsDir, name);
  ctx.assets.push({ from: src, to: target });
  note.assetNames.push(name);
  return `../assets/${name}`;
}

async function replaceAsync(text, re, fn) {
  const jobs = [];
  text.replace(re, (...m) => {
    jobs.push(fn(...m));
    return '';
  });
  const results = await Promise.all(jobs);
  let k = 0;
  return text.replace(re, () => results[k++]);
}

async function convertText(text, note, ctx) {
  let s = text;

  // 주석 지우기: %% Obsidian 주석 %%, <!-- HTML 주석 -->
  s = s.replace(/%%[\s\S]*?%%/g, '');
  s = s.replace(/<!--[\s\S]*?-->[ \t]*\n?/g, '');

  // ![[첨부]] → 이미지면 assets로 복사, 아니면 이름만 글자로
  s = await replaceAsync(s, /!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, async (whole, target, alias) => {
    const name = target.trim();
    const ext = extname(name).toLowerCase();
    if (!IMAGE_EXT.has(ext)) return alias || name;
    const src = await findAttachment(name, note.dir);
    if (!src) {
      note.warnings.push(`이미지를 찾지 못함: ${name}`);
      return '';
    }
    const alt = alias && !/^\d+(x\d+)?$/.test(alias) ? alias : basename(name, ext);
    return `![${alt}](${await copyImage(src, note, ctx)})`;
  });

  // ![설명](로컬/경로.png) → assets로 복사
  s = await replaceAsync(s, /!\[([^\]]*)\]\((?!https?:|data:|\.\.\/assets\/)([^)\s]+)\)/g, async (whole, alt, path) => {
    const src = await findAttachment(decodeURIComponent(path), note.dir);
    if (!src) {
      note.warnings.push(`이미지를 찾지 못함: ${path}`);
      return '';
    }
    return `![${alt}](${await copyImage(src, note, ctx)})`;
  });

  // [[노트|별칭]] → 블로그에 있는 글이면 링크, 아니면 글자만
  s = s.replace(/\[\[([^\]|#]*)(#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (whole, target, heading, alias) => {
    const label = (alias || target || (heading || '').slice(1)).trim();
    const slug = ctx.slugByTitle.get(target.trim());
    if (slug && (ctx.batchSlugs.has(slug) || existsSync(join(postsDir, `${slug}.md`)))) {
      return `[${label}](${slug}.md)`;
    }
    return label;
  });

  // 콜아웃: > [!note] 제목 → > **제목**
  s = s.replace(/^(\s*>\s*)\[!(\w+)\][+-]?[ \t]*(.*)$/gm, (_, quote, type, title) => `${quote}**${title.trim() || type}**`);

  // 하이라이트 ==글자== → 굵게
  s = s.replace(/==(?=\S)([^=\n]*?\S)==/g, '**$1**');

  return s;
}

// ===== draft 체크 =====

function markDraft(raw) {
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const fm = /^(﻿?---[ \t]*\r?\n)([\s\S]*?)(\r?\n---[ \t]*(?:\r?\n|$))/.exec(raw);
  if (!fm) return `---${eol}draft: true${eol}---${eol}${raw}`;
  let inner = fm[2];
  if (/^draft[ \t]*:.*$/m.test(inner)) inner = inner.replace(/^draft[ \t]*:.*$/m, 'draft: true');
  else inner = `${inner}${inner ? eol : ''}draft: true`;
  return fm[1] + inner + fm[3] + raw.slice(fm[0].length);
}

// ===== 실행 =====

async function main() {
  if (!existsSync(sourceDir)) throw new Error(`원본 폴더가 없습니다: ${sourceDir}`);
  if (!existsSync(indexPath)) throw new Error(`블로그 posts/index.json이 없습니다: ${indexPath}`);

  const index = JSON.parse(await readFile(indexPath, 'utf8'));
  if (!Array.isArray(index)) throw new Error('posts/index.json은 파일 이름 배열이어야 합니다.');

  // 1) 노트 읽기
  const notes = [];
  for (const entry of await readdir(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile() || extname(entry.name).toLowerCase() !== '.md') continue;
    const path = join(sourceDir, entry.name);
    const raw = await readFile(path, 'utf8');
    const { meta, body } = splitFrontMatter(raw);
    const title = str(meta.title) || basename(entry.name, '.md');
    notes.push({
      path,
      dir: sourceDir,
      raw,
      meta,
      body,
      title,
      slug: toSlug(str(meta.slug)) || toSlug(title),
      draft: str(meta.draft).toLowerCase() === 'true',
      mtime: (await stat(path)).mtime,
      warnings: [],
      assetNames: [],
    });
  }

  const ctx = {
    slugByTitle: new Map(notes.map((n) => [basename(n.path, '.md'), n.slug])),
    batchSlugs: new Set(),
    assets: [],
  };

  // 2) 올릴 글 고르기
  const todo = [];
  const skipped = [];
  for (const note of notes.filter((n) => !n.draft)) {
    const file = `${note.slug}.md`;
    const target = join(postsDir, file);
    if (!note.slug) {
      skipped.push(`${note.title}: slug를 만들 수 없음 (slug 속성을 영문으로 채워 주세요)`);
    } else if (ctx.batchSlugs.has(note.slug)) {
      skipped.push(`${note.title}: 같은 slug(${note.slug})를 쓰는 다른 노트가 있음`);
    } else if (existsSync(target) && !/^source:\s*obsidian\s*$/m.test(await readFile(target, 'utf8'))) {
      skipped.push(`${note.title}: posts/${file}이 이미 있고 Obsidian에서 온 글이 아님 (slug를 바꿔 주세요)`);
    } else if (!note.body.replace(/<!--[\s\S]*?-->|%%[\s\S]*?%%|^#+\s*$/gm, '').trim()) {
      skipped.push(`${note.title}: 본문이 비어 있음`);
    } else {
      ctx.batchSlugs.add(note.slug);
      todo.push({ note, file, target, updating: existsSync(target) });
    }
  }

  // 3) 변환
  for (const job of todo) {
    const { note } = job;
    // 보관함 tags(상태/·분야/)는 블로그에 쓰지 않고, 블로그태그만 씁니다.
    const tags = list(note.meta['블로그태그']).map(cleanTag).filter(Boolean);
    const description = cleanLine(str(note.meta['요약'] ?? note.meta.description));
    const fm = [
      '---',
      `title: ${cleanLine(note.title)}`,
      `date: ${pickDate(note.meta, note.mtime)}`,
      `tags: [${tags.join(', ')}]`,
      ...(description ? [`description: ${description}`] : []),
      'source: obsidian',
      '---',
      '',
    ].join('\n');
    job.content = fm + (await convertBody(note.body, note, ctx));
  }

  // 결과 미리 보여주기
  console.log(`원본: ${sourceDir}`);
  console.log(`블로그: ${blogRoot}`);
  console.log(`노트 ${notes.length}개 중 draft 체크된 노트 ${notes.filter((n) => n.draft).length}개는 건너뜀\n`);
  for (const job of todo) {
    console.log(`${job.updating ? '갱신' : '추가'}: ${job.note.title} → posts/${job.file}`);
    for (const a of job.note.assetNames) console.log(`  이미지: assets/${a}`);
    for (const w of job.note.warnings) console.log(`  경고: ${w}`);
  }
  for (const s of skipped) console.log(`건너뜀: ${s}`);
  if (!todo.length) console.log('올릴 글이 없습니다.');

  if (dryRun || !todo.length) {
    if (dryRun) console.log('\n(--dry-run: 아무 파일도 바꾸지 않았습니다)');
    return skipped.length ? 1 : 0;
  }

  // 4) 쓰기: 글 → 이미지 → index.json → 원본 draft 체크 순서
  for (const job of todo) await writeFile(job.target, job.content, 'utf8');
  if (ctx.assets.length) await mkdir(assetsDir, { recursive: true });
  for (const a of ctx.assets) await copyFile(a.from, a.to);

  const added = todo.map((j) => j.file).filter((f) => !index.includes(f));
  if (added.length) await writeFile(indexPath, `${JSON.stringify([...index, ...added], null, 2)}\n`, 'utf8');

  for (const job of todo) await writeFile(job.note.path, markDraft(job.note.raw), 'utf8');

  console.log(`\n완료: 글 ${todo.length}개를 올리고 원본 노트의 draft를 체크했습니다.`);
  return skipped.length ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`오류: ${err.message}`);
    process.exit(2);
  },
);
