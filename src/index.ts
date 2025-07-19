import { ExecutionContext, Hono } from "hono";
import { processPendingUsers } from "./cron/cronJob";
import { auth } from "./routes/auth";
import { Bindings } from "./types/types";
import { user } from "./routes/user"
import { corsMiddleware } from "./middleware/cors";

const app = new Hono<{
  Bindings: Bindings
}>();

app.use('*', corsMiddleware)
app.route('/api/v1/auth', auth);
app.route('/api/v1/user', user);

export default {
  scheduled(
    event: ScheduledEvent,
    env: Bindings,
    ctx: ExecutionContext
  ) {
    const delayedProcessing = async () => {
      await processPendingUsers(env)
    }
    ctx.waitUntil(delayedProcessing())
  },
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
};