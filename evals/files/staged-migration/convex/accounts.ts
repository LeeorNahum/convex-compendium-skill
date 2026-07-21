import { mutation } from "./_generated/server";

export const backfillHandles = mutation({
  args: {},
  handler: async (ctx) => {
    const accounts = await ctx.db.query("accounts").collect();
    for (const account of accounts) {
      await ctx.db.patch(account._id, {
        handle: account.email.split("@")[0],
      });
    }
  },
});
