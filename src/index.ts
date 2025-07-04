import { userEnroll } from "./routes/user.enroll";
import { oauthCallback } from "./routes/oauth-callback";
import { createResponseFactory } from "./utils/response";
import { processPendingUsers } from "./cron/cronJob";

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const { method } = request;
		const createResponse = createResponseFactory(env);
		const { pathname } = new URL(request.url)
		
		switch (method) {
			case 'GET':
				if (pathname === '/api/v1/oauth/callback') {
					return await oauthCallback(request, env, createResponse);
				}
				
				return createResponse({
					success: true,
					message: 'Server is Healthy!'
				}, 200);
			case 'POST':
				
				if (pathname === '/api/v1/enroll') {
					return await userEnroll(request, env, createResponse);
				} else {
					return createResponse({
						success: false,
						error: 'Endpoint not found'
					}, 404);
				}
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