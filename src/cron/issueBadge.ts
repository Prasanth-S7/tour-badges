import { BadgeIssuanceResult } from "../types/types";
import { HolopinSuccessResponse } from "../types/types";
import { Bindings } from "../types/types";
import pRetry from "p-retry";

export const issueBadge = async (email: string, name: string, env: Bindings): Promise<BadgeIssuanceResult> => {
	try {

		if (!email || !name) {
			return {
				success: false,
				error: 'Email and name are required',
				statusCode: 400
			};
		}

		const holopinResponse = await pRetry(async () => {
			const response = await fetch(
				`https://www.holopin.io/api/sticker/share?id=${env.HOLOPIN_STICKER_ID}&apiKey=${env.HOLOPIN_API_KEY}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					}
				}
			);
			
			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
			
			return response;
		}, { retries: 3, minTimeout: 1000, maxTimeout: 8000, onFailedAttempt: (error) => {
			console.log(`Retrying Holopin API call for ${email}, attempt ${error.attemptNumber}: ${error.message}`);
		} });

		const holopinData = await holopinResponse.json() as HolopinSuccessResponse;
		
		if (holopinData.message === 'Coupon created' && holopinData.data?.id) {
			try {
				await env.DB
					.prepare('UPDATE users SET badge_status = ? WHERE email = ?')
					.bind(holopinData.data.id, email)
					.run();
				
			} catch (dbError) {
				console.error(`Database update failed for ${email}:`, dbError);
				return {
					success: false,
					error: 'Badge created but database update failed',
					statusCode: 500
				};
			}
		} else {
			return {
				success: false,
				error: 'Unexpected response from badge service',
				statusCode: 502
			};
		}

		return {
			success: true,
			data: holopinData,
			statusCode: 200
		};

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		return {
			success: false,
			error: errorMessage,
			statusCode: 500
		};
	}
};