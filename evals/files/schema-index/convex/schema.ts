import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    channelId: v.id("channels"),
    authorId: v.string(),
    sentAt: v.number(),
    body: v.string(),
  }).index("by_sent_at_and_channel", ["sentAt", "channelId"]),
  channels: defineTable({ name: v.string() }),
});
