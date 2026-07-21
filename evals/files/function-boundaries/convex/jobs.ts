import { action, query } from "./_generated/server";
import { v } from "convex/values";

export const run = action({
  args: { jobId: v.id("jobs") },
  handler: async (ctx, args) => {
    const response = await fetch("https://api.example.test/work");
    await ctx.db.patch(args.jobId, { result: await response.text() });
  },
});

export const currentTime = query({
  args: {},
  handler: async () => ({ now: Date.now() }),
});
