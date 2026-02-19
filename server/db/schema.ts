import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const polls = pgTable("polls", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pollOptions = pgTable("pollOptions", {
  id: serial("id").primaryKey(),
  pollId: integer("pollId").references(() => polls.id).notNull(),
  text: text("text").notNull(),
});

export const pollVotes = pgTable("pollVotes", {
  id: serial("id").primaryKey(),
  pollId: integer("pollId").references(() => polls.id).notNull(),
  optionId: integer("optionId").references(() => pollOptions.id).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const chatMessages = pgTable("chatMessages", {
  id: serial("id").primaryKey(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
