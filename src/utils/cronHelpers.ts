import { User } from "../types/types";
import { env } from "cloudflare:workers";

export const getPendingUsers = async(): Promise<User []> => {
    const { results }  = await env.DB
    .prepare('SELECT * FROM users WHERE badge_status = ?')
    .bind('pending')
    .all<User>();
    return results;
}