import { View } from "react-native";
import MessagesModal from "@/features/qr-detail/components/modals/MessagesModal";
import CommentReportModal from "@/features/qr-detail/components/modals/CommentReportModal";
import OwnerInfoSheet from "@/features/qr-detail/components/sheets/OwnerInfoSheet";
import CommentMenuSheet from "@/features/qr-detail/components/sheets/CommentMenuSheet";
import OverflowSheet from "@/features/qr-detail/components/sheets/OverflowSheet";

interface Props {
  ownerSheetOpen: boolean;
  onCloseOwnerSheet: () => void;
  ownerInfo: any;

  q: any;

  overflowOpen: boolean;
  onCloseOverflow: () => void;
  isFavorite: boolean;
  hasOwner: boolean;
  onFavorite: () => void;
  onReportPress: () => void;

  user: any;
  isQrOwner: boolean;

}

export function QrBottomSheets({
  ownerSheetOpen,
  onCloseOwnerSheet,
  ownerInfo,
  q,
  overflowOpen,
  onCloseOverflow,
  isFavorite,
  hasOwner,
  onFavorite,
  onReportPress,
  user,
  isQrOwner,
}: Props) {
  return (
    <View>
      <OwnerInfoSheet
        visible={ownerSheetOpen}
        onClose={onCloseOwnerSheet}
        ownerInfo={ownerInfo as any}
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
        hasOwner={hasOwner}
        onFavorite={onFavorite}
        onReport={onReportPress}
      />

      <CommentReportModal
        commentId={q.commentReportModal}
        onReport={q.handleCommentReport}
        onClose={() => q.setCommentReportModal(null)}
      />

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
