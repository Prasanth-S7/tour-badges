declare module "cloudflare:test" {
    interface ProvidedEnv {
        DB: D1Database;
    }
}

declare global {
    interface ExecutionContext {
        waitUntil(promise: Promise<any>): void;
        passThroughOnException(): void;
    }
}