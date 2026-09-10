import { getAdminDb } from "../../lib/firebase-admin";

export interface IChatStorage {
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;
  createConversation(title: string): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<ChatMessage[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<ChatMessage>;
}

export interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: string;
}

const conversationRef = (db: FirebaseFirestore.Firestore, id: number) =>
  db.collection("conversations").doc(String(id));

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const snapshot = await conversationRef(getAdminDb()!, id).get();
    return snapshot.exists ? ({ id, ...snapshot.data() } as Conversation) : undefined;
  },

  async getAllConversations() {
    const snapshot = await getAdminDb()!.collection("conversations").orderBy("createdAt", "desc").get();
    return snapshot.docs.map((doc) => ({ id: Number(doc.id), ...doc.data() } as Conversation));
  },

  async createConversation(title: string) {
    const db = getAdminDb()!;
    const id = Date.now();
    const conversation = { id, title, createdAt: new Date().toISOString() };
    await conversationRef(db, id).set(conversation);
    return conversation;
  },

  async deleteConversation(id: number) {
    const db = getAdminDb()!;
    const messages = await db.collection("conversations").doc(String(id)).collection("messages").get();
    const batch = db.batch();
    messages.docs.forEach((message) => batch.delete(message.ref));
    batch.delete(conversationRef(db, id));
    await batch.commit();
  },

  async getMessagesByConversation(conversationId: number) {
    const snapshot = await conversationRef(getAdminDb()!, conversationId)
      .collection("messages").orderBy("createdAt").get();
    return snapshot.docs.map((doc) => ({ id: Number(doc.id), ...doc.data() } as ChatMessage));
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const db = getAdminDb()!;
    const id = Date.now();
    const message = { id, conversationId, role, content, createdAt: new Date().toISOString() };
    await conversationRef(db, conversationId).collection("messages").doc(String(id)).set(message);
    return message;
  },
};
