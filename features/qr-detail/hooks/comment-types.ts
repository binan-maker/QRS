export interface CommentItem {
  id: string;
  text: string;
  createdAt: string;
  likeCount: number;
  dislikeCount: number;
  userLike: "like" | "dislike" | null;
  user: { displayName: string };
  parentId?: string | null;
  userId?: string;
  isDeleted?: boolean;
  isHidden?: boolean;
  reportCount?: number;
  userUsername?: string;
  userPhotoURL?: string;
}

export const COMMENTS_PER_PAGE = 20;
export const REPLIES_PER_PAGE = 10;
