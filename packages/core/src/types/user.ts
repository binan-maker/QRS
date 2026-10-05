export interface UserStats {
  scanCount: number;
  commentCount: number;
  totalLikesReceived: number;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  username?: string;
  photoURL?: string | null;
  scanCount?: number;
}
