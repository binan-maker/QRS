export function getNotifIcon(type: string): string {
  if (type === "new_comment") return "chatbubble";
  if (type === "mention") return "at";
  if (type === "new_follow") return "person-add";
  return "warning";
}
