// Favorites feature has been retired from Supabase.
export async function isUserFavorite(_qrId: string, _userId: string): Promise<boolean> {
  return false;
}

export async function toggleFavorite(
  _qrId: string,
  _userId: string,
  _content: string,
  _contentType: string
): Promise<boolean> {
  return false;
}

export async function getUserFavorites(_userId: string): Promise<any[]> {
  return [];
}
