import { api } from "../../../convex/_generated/api";
import { action, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return ctx.runQuery(api.messages.listForUser, {
      userId: identity?.subject ?? "",
    });
  },
});

export const notify = action({
  args: {},
  handler: async () => {
    await fetch(process.env.NOTIFY_URL!);
  },
});
