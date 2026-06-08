// ─── Avatar color palette ─────────────────────────────────────────────────────
// Background / foreground pairs used when generating UI Avatars URLs.

const PALETTE: { bg: string; fg: string }[] = [
  { bg: '208AEF', fg: 'ffffff' }, // primary blue
  { bg: '4292C6', fg: 'ffffff' }, // wave blue
  { bg: '5BA3D0', fg: 'ffffff' }, // muted blue
  { bg: '3D7FCC', fg: 'ffffff' }, // deep blue
  { bg: '6C8EBF', fg: 'ffffff' }, // slate blue
  { bg: '7B68EE', fg: 'ffffff' }, // medium slate purple
  { bg: '5E81AC', fg: 'ffffff' }, // nordic blue
  { bg: '88C0D0', fg: '2E3440' }, // frost
  { bg: 'A3BE8C', fg: '2E3440' }, // sage green
  { bg: 'EBCB8B', fg: '2E3440' }, // warm sand
  { bg: 'D08770', fg: 'ffffff' }, // terracotta
  { bg: 'BF616A', fg: 'ffffff' }, // muted red
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
