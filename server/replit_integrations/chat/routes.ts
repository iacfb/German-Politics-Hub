import type { express, request, response } from "express";
import groq from "groq-sdk";
import { chatstorage } from "./storage";

function getgroqclient() {
  const apikey = process.env.GROQ_API_KEY;
  if (!apikey) {
    throw new Error("GROQ_API_KEY is not set");
  }
  return new groq({ apiKey: apikey });
}

export function registerchatroutes(app: express): void {

  // get all conversations
  app.get("/api/conversations", async (req: request, res: response) => {
    try {
      const conversations = await chatstorage.getallconversations();
      res.json(conversations);
    } catch (error) {
      console.error("error fetching conversations:", error);
      res.status(500).json({ error: "failed to fetch conversations" });
    }
  });

  // get single conversation with messages
  app.get("/api/conversations/:id", async (req: request, res: response) => {
    try {
      const id = parseint(req.params.id);
      const conversation = await chatstorage.getconversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "conversation not found" });
      }
      const messages = await chatstorage.getmessagesbyconversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("error fetching conversation:", error);
      res.status(500).json({ error: "failed to fetch conversation" });
    }
  });

  // create new conversation
  app.post("/api/conversations", async (req: request, res: response) => {
    try {
      const { title, systemprompt } = req.body;
      const userid = `guest_${req.ip}`;

      const conversation = await chatstorage.createconversation(
        title || "neue politische diskussion",
        userid,
        systemprompt
      );

      res.status(201).json(conversation);
    } catch (error) {
      console.error("error creating conversation:", error);
      res.status(500).json({ error: "failed to create conversation" });
    }
  });

  // delete conversation
  app.delete("/api/conversations/:id", async (req: request, res: response) => {
    try {
      const id = parseint(req.params.id);
      await chatstorage.deleteconversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("error deleting conversation:", error);
      res.status(500).json({ error: "failed to delete conversation" });
    }
  });

  // send message + stream ai response
  app.post("/api/conversations/:id/messages", async (req: request, res: response) => {
    try {
      const conversationid = parseint(req.params.id);
      const { content } = req.body;

      const conversation = await chatstorage.getconversation(conversationid);
      if (!conversation) {
        return res.status(404).json({ error: "conversation not found" });
      }

      // save user message
      await chatstorage.createmessage(conversationid, "user", content);

      // build message history
      const messages = await chatstorage.getmessagesbyconversation(conversationid);

      const chatmessages: any[] = [];

      if (conversation.systemprompt) {
        chatmessages.push({
          role: "system",
          content: String(conversation.systemprompt)
        });
      }

      chatmessages.push(
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: String(m.content),
        }))
      );

      // sse headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // groq streaming
      const groqclient = getgroqclient();

      const stream = await groqclient.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: chatmessages,
        stream: true
      });

      let fullresponse = "";

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta?.content || "";
        if (delta) {
          fullresponse += delta;
          res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
        }
      }

      // save assistant message
      await chatstorage.createmessage(conversationid, "assistant", fullresponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

    } catch (error) {
      console.error("error sending message:", error);

      if (!res.headersSent) {
        return res.status(500).json({ error: "failed to send message" });
      }

      try {
        res.write(`data: ${JSON.stringify({ error: "failed to send message" })}\n\n`);
        res.end();
      } catch (_) {}
    }
  });
}
