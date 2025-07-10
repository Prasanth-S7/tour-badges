import { Env, ExecutionContext, Hono } from "hono";
import { processPendingUsers } from "./cron/cronJob";
import { auth } from "./routes/auth";
import { Bindings } from "hono/types";
import { user } from "./routes/user"


const app = new Hono<{
  Bindings: Bindings
}>();

app.route('/api/v1/auth', auth);
app.route('/api/v1/user', user);

export default {
  scheduled(
    event: ScheduledEvent,
    env: Bindings,
    ctx: ExecutionContext
  ) {
    const delayedProcessing = async () => {
      await processPendingUsers()
    }
    ctx.waitUntil(delayedProcessing())
  },
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};