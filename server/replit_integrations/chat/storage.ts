import { db } from "../../db";
import { conversations, messages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IChatStorage {
  getConversation(id: number): Promise<typeof conversations.$inferSelect | undefined>;
  getAllConversations(): Promise<(typeof conversations.$inferSelect)[]>;
  createConversation(title: string, userId: string, systemPrompt?: string): Promise<typeof conversations.$inferSelect>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<(typeof messages.$inferSelect)[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<typeof messages.$inferSelect>;
}

export const chatStorage: IChatStorage = {
  async getConversation(id: number) {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  },

  async getAllConversations() {
    return db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.createdat)); // lowercase
  },

  async createConversation(title: string, userId: string, systemPrompt?: string) {
    const [conversation] = await db
      .insert(conversations)
      .values({
        title,
        userid: userId,              // lowercase
        systemprompt: systemPrompt || null // lowercase
      })
      .returning();
    return conversation;
  },

  async deleteConversation(id: number) {
    await db.delete(messages).where(eq(messages.conversationid, id)); // lowercase
    await db.delete(conversations).where(eq(conversations.id, id));
  },

  async getMessagesByConversation(conversationId: number) {
    return db
      .select()
      .from(messages)
      .where(eq(messages.conversationid, conversationId)) // lowercase
      .orderBy(messages.createdat); // lowercase
  },

  async createMessage(conversationId: number, role: string, content: string) {
    const [message] = await db
      .insert(messages)
      .values({
        conversationid: conversationId, // lowercase
        role,
        content
      })
      .returning();
    return message;
  },
};
