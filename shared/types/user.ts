export interface AppUser {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  username?: string | null;
  bio?: string;
  createdAt?: number;
}

export interface UserStats {
  followingCount: number;
  scanCount: number;
  commentCount: number;
  totalLikesReceived: number;
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  username?: string;
  photoURL?: string | null;
  bio?: string;
  scanCount?: number;
  followersCount?: number;
  followingCount?: number;
}
