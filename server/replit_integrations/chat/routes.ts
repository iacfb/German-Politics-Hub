import type { Express, Request, Response } from "express";
import Groq from "groq-sdk";
import { chatStorage } from "./storage";

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return new Groq({ apiKey });
}

export function registerChatRoutes(app: Express): void {

  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title, systemPrompt } = req.body;
      const userId = `guest_${req.ip}`;

      const conversation = await chatStorage.createConversation(
        title || "Neue politische Diskussion",
        userId,
        systemPrompt
      );

      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      const conversation = await chatStorage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      await chatStorage.createMessage(conversationId, "user", content);

      const messages = await chatStorage.getMessagesByConversation(conversationId);

      const chatMessages: any[] = [];

      if (conversation.systemPrompt) {
        chatMessages.push({
          role: "system",
          content: String(conversation.systemPrompt)
        });
      }

      chatMessages.push(
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: String(m.content),
        }))
      );

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const groq = getGroqClient();

      const stream = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: chatMessages,
        stream: true
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

    } catch (error) {
      console.error("Error sending message:", error);

      if (!res.headersSent) {
        return res.status(500).json({ error: "Failed to send message" });
      }

      try {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } catch (_) {}
    }
  });
}
