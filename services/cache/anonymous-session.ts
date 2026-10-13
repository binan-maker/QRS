const MAX_ANONYMOUS_ENTRIES = 100;
const _store = new Map<string, { content: string; contentType: string }>();

export function setAnonymousQrContent(
  qrId: string,
  content: string,
  contentType: string
): void {
  // Evict oldest entry if size limit reached
  if (_store.size >= MAX_ANONYMOUS_ENTRIES && !_store.has(qrId)) {
    const oldestKey = _store.keys().next().value;
    if (oldestKey) {
      _store.delete(oldestKey);
    }
  }
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
