// 다크 모드 토글
// 1) 저장된 선택이 있으면 그것을 쓰고, 2) 없으면 시스템 설정을 따릅니다.
// 첫 테마 결정은 index.html <head>의 인라인 스크립트가 이미 해 두었습니다.

const STORAGE_KEY = 'theme';
const root = document.documentElement;
const button = document.querySelector('.theme-toggle');
const media = window.matchMedia('(prefers-color-scheme: dark)');

function getSaved() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function save(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // 저장이 막혀 있어도(시크릿 모드 등) 이번 방문에서는 동작합니다.
  }
}

function apply(theme) {
  root.setAttribute('data-theme', theme);
  if (button) {
    const next = theme === 'dark' ? '라이트' : '다크';
    button.setAttribute('aria-label', `${next} 모드로 전환`);
    button.setAttribute('title', `${next} 모드로 전환`);
  }
}

apply(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

button?.addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  apply(next);
  save(next);
});

// 사용자가 직접 고른 적이 없으면 시스템 설정 변화를 따라갑니다.
media.addEventListener('change', (event) => {
  if (!getSaved()) {
    apply(event.matches ? 'dark' : 'light');
  }
});
