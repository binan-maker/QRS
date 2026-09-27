export function redirectSystemPath({
  path,
  initial,
}: { path: string; initial: boolean }) {
  const withoutQuery = path.split("?")[0].replace(/\/+$/, "");
  const match = withoutQuery.match(/(?:https?:\/\/[^/]+)?\/qr\/([0-9a-zA-Z]+)$/);
  if (match) return `/qr/${match[1]}`;

  return '/';
}
