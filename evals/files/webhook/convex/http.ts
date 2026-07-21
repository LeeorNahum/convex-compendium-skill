import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { httpRouter } from "convex/server";

const http = httpRouter();

http.route({
  path: "/events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await request.json();
    await ctx.runMutation(api.events.apply, event);
    return new Response("ok");
  }),
});

export default http;
