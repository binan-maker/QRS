export function getNotifIcon(type: string): string {
  if (type === "new_comment") return "chatbubble";
  if (type === "mention") return "at";
  return "warning";
}
