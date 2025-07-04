import { oauthCallback } from "./routes/oauth-callback";
import { createResponseFactory } from "./utils/response";
import { processPendingUsers } from "./cron/cronJob";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const { method } = request;
		const createResponse = createResponseFactory(env);
		
		switch (method) {
			case 'GET':
				const { pathname } = new URL(request.url);
				if (pathname === '/api/v1/oauth/callback') {
					return await oauthCallback(request, env, createResponse);
				}
				
				return createResponse({
					success: true,
					message: 'Server is Healthy!'
				}, 200);
			case 'POST':
				return createResponse({
					success: false,
					error: 'No POST endpoints available. Use OAuth callback for enrollment.'
				}, 404);
			case 'OPTIONS':
				return createResponse(204)
			default:
				return createResponse({
					success: false,
					error: 'Method not allowed'
				}, 405);
		}
	},
	async scheduled(event, env, ctx): Promise<void> {
		console.log('Cron job started');
		await processPendingUsers(env);
	},
} satisfies ExportedHandler<Env>;