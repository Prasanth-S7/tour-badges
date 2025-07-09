import { Env, Hono } from "hono";
import { processPendingUsers } from "./cron/cronJob";
import { Bindings } from "hono/types";
import { auth } from "./routes/auth";

const app = new Hono<{
  Bindings: Bindings
}>();

app.route('/api/v1/auth', auth);

export default {
  fetch: app.fetch,
  scheduled: async (env: Env) => {
    await processPendingUsers(env);
  },
};