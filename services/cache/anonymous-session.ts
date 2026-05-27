const _store = new Map<string, { content: string; contentType: string }>();

export function setAnonymousQrContent(
  qrId: string,
  content: string,
  contentType: string
): void {
  _store.set(qrId, { content, contentType });
}

export function getAnonymousQrContent(
  qrId: string
): { content: string; contentType: string } | null {
  return _store.get(qrId) ?? null;
}

export function clearAnonymousQrContent(qrId: string): void {
  _store.delete(qrId);
}

export function clearAllAnonymousSessions(): void {
  _store.clear();
}
