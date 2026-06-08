const PALETTE: { bg: string; fg: string }[] = [
  { bg: '208AEF', fg: 'ffffff' },
  { bg: '4292C6', fg: 'ffffff' },
  { bg: '5BA3D0', fg: 'ffffff' },
  { bg: '3D7FCC', fg: 'ffffff' },
  { bg: '6C8EBF', fg: 'ffffff' },
  { bg: '7B68EE', fg: 'ffffff' },
  { bg: '5E81AC', fg: 'ffffff' },
  { bg: '88C0D0', fg: '2E3440' },
  { bg: 'A3BE8C', fg: '2E3440' },
  { bg: 'EBCB8B', fg: '2E3440' },
  { bg: 'D08770', fg: 'ffffff' },
  { bg: 'BF616A', fg: 'ffffff' },
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function generateAvatarUrl(name: string | null): string {
  const label = name?.trim() || '?';
  const { bg, fg } = PALETTE[hashName(label) % PALETTE.length];
  return (
    `https://ui-avatars.com/api/` +
    `?name=${encodeURIComponent(label)}` +
    `&background=${bg}` +
    `&color=${fg}` +
    `&size=256` +
    `&bold=true`
  );
}
