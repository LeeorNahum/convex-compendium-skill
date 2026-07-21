import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updatePresence = mutation({
  args: {
    roomId: v.id("rooms"),
    userId: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    await ctx.db.patch(args.roomId, {
      presence: {
        ...room?.presence,
        [args.userId]: { state: args.state, updatedAt: Date.now() },
      },
    });
  },
});

export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => ctx.db.get(args.roomId),
});
