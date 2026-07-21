import { query } from "./_generated/server";
import { v } from "convex/values";

export const listForChannel = query({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages").collect();
    return messages
      .filter((message) => message.channelId === args.channelId)
      .sort((left, right) => right.sentAt - left.sentAt);
  },
});
