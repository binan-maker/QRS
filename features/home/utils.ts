export function getFirstName(name: string): string {
  return name ? name.trim().split(/\s+/)[0] : "";
}

export function makeResponsiveFont(width: number) {
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  return (size: number) => Math.round(size * s);
}
