import { View } from "react-native";
import { formatCompactNumber } from "@/shared/utils/number-format";
import FollowersModal from "@/features/qr-detail/components/modals/FollowersModal";
import MessagesModal from "@/features/qr-detail/components/modals/MessagesModal";
import CommentReportModal from "@/features/qr-detail/components/modals/CommentReportModal";
import OwnerInfoSheet from "@/features/qr-detail/components/sheets/OwnerInfoSheet";
import CommentMenuSheet from "@/features/qr-detail/components/sheets/CommentMenuSheet";
import OverflowSheet from "@/features/qr-detail/components/sheets/OverflowSheet";

interface CreatorFollowersProps {
  visible: boolean;
  followerCount: number;
  followersList: any[];
  loading: boolean;
  onClose: () => void;
}

interface Props {
  ownerSheetOpen: boolean;
  onCloseOwnerSheet: () => void;
  ownerInfo: any;
  guardLink?: any;

  q: any;

  overflowOpen: boolean;
  onCloseOverflow: () => void;
  isFavorite: boolean;
  isFollowing: boolean;
  followLoading: boolean;
  hasOwner: boolean;
  onFavorite: () => void;
  onWatch: () => void;
  onReportPress: () => void;

  user: any;
  isQrOwner: boolean;

  creatorFollowers?: CreatorFollowersProps;
}

export function QrBottomSheets({
  ownerSheetOpen,
  onCloseOwnerSheet,
  ownerInfo,
  guardLink,
  q,
  overflowOpen,
  onCloseOverflow,
  isFavorite,
  isFollowing,
  followLoading,
  hasOwner,
  onFavorite,
  onWatch,
  onReportPress,
  user,
  isQrOwner,
  creatorFollowers,
}: Props) {
  return (
    <View>
      <OwnerInfoSheet
        visible={ownerSheetOpen}
        onClose={onCloseOwnerSheet}
        ownerInfo={ownerInfo as any}
        guardLink={guardLink ?? null}
      />

      <CommentMenuSheet
        visible={q.commentMenuId !== null}
        isOwner={q.commentMenuOwner}
        onClose={() => q.setCommentMenuId(null)}
        onDelete={() => {
          const cid = q.commentMenuId!;
          q.setCommentMenuId(null);
          q.handleDeleteComment(cid);
        }}
        onReport={() => {
          const cid = q.commentMenuId!;
          q.setCommentMenuId(null);
          q.setCommentReportModal(cid);
        }}
      />

      <OverflowSheet
        visible={overflowOpen}
        onClose={onCloseOverflow}
        isFavorite={isFavorite}
        isFollowing={isFollowing}
        followLoading={followLoading}
        hasOwner={hasOwner}
        onFavorite={onFavorite}
        onWatch={onWatch}
        onReport={onReportPress}
      />

      <CommentReportModal
        commentId={q.commentReportModal}
        onReport={q.handleCommentReport}
        onClose={() => q.setCommentReportModal(null)}
      />

      <FollowersModal
        visible={q.followersModalOpen}
        followCount={q.followCount}
        followers={q.followersList}
        loading={q.followersLoading}
        onClose={() => q.setFollowersModalOpen(false)}
        title="QR Watchers"
        subtitle={`${formatCompactNumber(q.followCount)} ${q.followCount === 1 ? "person is" : "people are"} watching this QR`}
        emptyIcon="notifications-outline"
        emptyText="No watchers yet"
      />

      {creatorFollowers && (
        <FollowersModal
          visible={creatorFollowers.visible}
          followCount={creatorFollowers.followerCount}
          followers={creatorFollowers.followersList}
          loading={creatorFollowers.loading}
          onClose={creatorFollowers.onClose}
          title="Creator Followers"
          subtitle={`${formatCompactNumber(creatorFollowers.followerCount)} ${creatorFollowers.followerCount === 1 ? "person follows" : "people follow"} this creator`}
          emptyIcon="people-outline"
          emptyText="No followers yet"
        />
      )}

      <MessagesModal
        visible={q.messagesModalOpen}
        isQrOwner={isQrOwner}
        ownerInfo={ownerInfo}
        messages={q.messages}
        messageText={q.messageText}
        sendingMessage={q.sendingMessage}
        user={user}
        onChangeText={q.setMessageText}
        onSend={q.handleSendMessage}
        onClose={() => q.setMessagesModalOpen(false)}
      />
    </View>
  );
}
