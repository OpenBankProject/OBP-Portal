import { createLogger } from '$lib/utils/logger';
const logger = createLogger('ForgotPasswordServer');
import { type Actions } from "@sveltejs/kit";
import { obp_requests } from "$lib/obp/requests";
import type { OBPPasswordResetInitiateRequestBody } from "$lib/obp/types";
import { OBPRequestError } from "$lib/obp/errors";

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();
        const email = formData.get('email') as string;
        
        logger.debug("Password reset requested for email:", email);

        // Validate email format
        if (!email || !email.includes('@')) {
            return {
                error: 'Please enter a valid email address',
                success: false
            };
        }

        // Build request body for OBP API
        const requestBody: OBPPasswordResetInitiateRequestBody = {
            email: email
        };

        try {
            // Call OBP API to initiate password reset
            const response = await obp_requests.post(
                `/obp/v6.0.0/users/password-reset`, 
                requestBody
            );

            logger.info("Password reset email sent for:", email);

            // Always return success to prevent email enumeration
            // Don't reveal whether the email exists in the system
            return {
                success: true,
                email: email
            };

        } catch (error) {
            // Log the actual error for debugging
            if (error instanceof OBPRequestError) {
                logger.error("OBP API error during password reset request:", error.message);
            } else {
                logger.error("Error requesting password reset:", error);
            }

            // Still return success to user to prevent email enumeration
            // This is a security best practice - don't reveal if email exists
            return {
                success: true,
                email: email
            };
        }
    }
} satisfies Actions;