// 기본 팔레트 데이터

export const PALETTE = [
  { name: '검정', hex: '#000000' },
  { name: '진회색', hex: '#5f574f' },
  { name: '연회색', hex: '#c2c3c7' },
  { name: '흰색', hex: '#ffffff' },
  { name: '빨강', hex: '#e53935' },
  { name: '주황', hex: '#fb8c00' },
  { name: '노랑', hex: '#fdd835' },
  { name: '연두', hex: '#9ccc65' },
  { name: '초록', hex: '#2e7d32' },
  { name: '하늘', hex: '#4fc3f7' },
  { name: '파랑', hex: '#1e88e5' },
  { name: '남색', hex: '#283593' },
  { name: '보라', hex: '#8e24aa' },
  { name: '분홍', hex: '#f48fb1' },
  { name: '갈색', hex: '#795548' },
  { name: '살구', hex: '#ffccbc' }
];

export const DEFAULT_COLOR = '#000000';
export const DEFAULT_CUSTOM_COLOR = '#ff6f00';

export function colorName(hex) {
  const found = PALETTE.find((c) => c.hex === hex);
  return found ? found.name : null;
}
