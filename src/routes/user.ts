import { Hono } from "hono";
import { Bindings, User } from "../types/types";

export const user = new Hono<{
    Bindings: Bindings
}>();

user.post("/claim", async (c) => {
    const authCookie = c.req.header('Cookie');
    if (!authCookie) {
        return c.json({ error: 'Not authenticated' }, 401);
    }

    const cookies = authCookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=');
        acc[key] = value;
        return acc;
    }, {} as { [key: string]: string });

    const userEmail = cookies.user_email;
    if (!userEmail) {
        return c.json({ error: 'User email not found' }, 401);
    }

    const user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
    ).bind(userEmail).first<User>();

    if (!user) {
        return c.json({ error: 'User not found' }, 404);
    }

    if (user.status === 'pending') {
        return c.json({ 
            error: 'Badge already claimed',
            message: 'Your badge is being processed. You will receive an email when it is ready.',
            user: {
                email: user.email,
                name: user.name,
                status: user.status
            }
        }, 400);
    }

    if (user.badge_received === 1) {
        return c.json({ 
            error: 'Badge already received',
            message: 'You have already received your badge.',
            user: {
                email: user.email,
                name: user.name,
                status: user.status
            }
        }, 400);
    }

    await c.env.DB.prepare(
        'UPDATE users SET status = ? WHERE email = ?'
    ).bind('pending', userEmail).run();

    return c.json({ 
        message: 'You will receive an email when your badge is ready',
        user: {
            email: user.email,
            name: user.name,
            status: 'pending'
        }
    });
});