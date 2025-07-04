import { getAccessToken } from "../utils/cronHelpers";
import { getBadgeClassId } from "../utils/cronHelpers";
import { BadgeIssuanceResult } from "../types/types";

export const issueBadge = async (email: string, name: string, env: Env): Promise<BadgeIssuanceResult> => {
	try {
		// Get access token with error handling
		let accessToken: string;
		try {
			accessToken = await getAccessToken(env);
		} catch (error) {
			return {
				success: false,
				error: `Failed to get access token: ${error instanceof Error ? error.message : 'Unknown error'}`,
				statusCode: 500
			};
		}

		// Get badge class ID with error handling
		let badgeClassId: string;
		try {
			badgeClassId = await getBadgeClassId(accessToken, env);
			if (!badgeClassId) {
				return {
					success: false,
					error: 'No badge class found or failed to retrieve badge class ID',
					statusCode: 404
				};
			}
		} catch (error) {
			return {
				success: false,
				error: `Failed to get badge class ID: ${error instanceof Error ? error.message : 'Unknown error'}`,
				statusCode: 500
			};
		}

		const badgeData = {
			recipient: {
				identity: email,
				hashed: true,
				type: 'email',
				plaintextIdentity: name,
			},
			issuedOn: new Date().toISOString(),
			notify: true,
			extensions: {
				'extensions:recipientProfile': {
					'@context': 'https://openbadgespec.org/extensions/recipientProfile/context.json',
					type: ['Extension', 'extensions:RecipientProfile'],
					name: name,
				},
			},
		};

		// Issue the badge with comprehensive error handling
		const response = await fetch(`${env.BADGR_API}/v2/badgeclasses/${badgeClassId}/assertions`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(badgeData),
		});

		if (!response.ok) {
			let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
			
			try {
				const errorData = await response.json() as any;
				if (errorData?.error) {
					errorMessage = errorData.error;
				} else if (errorData?.message) {
					errorMessage = errorData.message;
				}
			} catch (parseError) {
				// If we can't parse the error response, use the status text
				console.warn('Failed to parse error response:', parseError);
			}

			return {
				success: false,
				error: errorMessage,
				statusCode: response.status
			};
		}

		const data = await response.json();
		console.log(`✅ Successfully issued badge to ${email}`);

		return {
			success: true,
			data: data,
			statusCode: response.status
		};

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		console.error(`❌ Failed to issue badge to ${email}:`, error);
		
		return {
			success: false,
			error: errorMessage,
			statusCode: 500
		};
	}
};