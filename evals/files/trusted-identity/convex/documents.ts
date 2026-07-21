import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const rename = mutation({
  args: {
    documentId: v.id("documents"),
    ownerId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document || document.ownerId !== args.ownerId) {
      throw new Error("Not found");
    }
    await ctx.db.patch(args.documentId, { title: args.title });
  },
});
