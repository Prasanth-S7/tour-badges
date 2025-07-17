import { BadgeIssuanceResult } from "../types/types";
import { User } from "../types/types";
import { HolopinSuccessResponse } from "../types/types";
import { Bindings } from "../types/types";

export const issueBadge = async (email: string, name: string, env: Bindings): Promise<BadgeIssuanceResult> => {
	try {

		if (!email || !name) {
			return {
				success: false,
				error: 'Email and name are required',
				statusCode: 400
			};
		}

		const userResult = await env.DB
			.prepare('SELECT * FROM users WHERE email = ? LIMIT 1')
			.bind(email)
			.all<User>();
		
		if (userResult.results.length === 0) {
			console.warn(`User not found in database: ${email}`);
			return {
				success: false,
				error: `User not found in database: ${email}`,
				statusCode: 404
			};
		}
		
		const user = userResult.results[0] as User;

		if (user.badge_status && user.badge_status === 'issued') {
			console.info(`User ${email} already has badge status: ${user.badge_status}`);
			return {
				success: false,
				error: 'User already has a badge',
				statusCode: 409
			};
		}

		const holopinResponse = await fetch(
			`https://www.holopin.io/api/sticker/share?id=${env.HOLOPIN_STICKER_ID}&apiKey=${env.HOLOPIN_API_KEY}`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);

		if (!holopinResponse.ok) {
			const errorText = await holopinResponse.text();
			return {
				success: false,
				error: `Holopin API error: ${holopinResponse.status}`,
				statusCode: holopinResponse.status
			};
		}

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