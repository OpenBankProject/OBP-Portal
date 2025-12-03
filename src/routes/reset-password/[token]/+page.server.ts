import { createLogger } from '$lib/utils/logger';
const logger = createLogger('PasswordResetServer');
import { type Actions, redirect, error } from "@sveltejs/kit";
import { obp_requests } from "$lib/obp/requests";
import type { OBPPasswordResetRequestBody } from "$lib/obp/types";
import { OBPRequestError } from "$lib/obp/errors";
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
    const { token } = params;
    
    logger.debug("Password reset page loaded with token:", token);
    
    return {
        token
    };
};

export const actions = {
    default: async ({ request, params }) => {
        const { token } = params;
        const formData = await request.formData();
        
        logger.debug("Password reset form submitted for token:", token);

        const newPassword = formData.get('new_password') as string;
        const confirmPassword = formData.get('confirm_password') as string;

        // Validate passwords match
        if (newPassword !== confirmPassword) {
            return {
                error: 'Passwords do not match',
                success: false
            };
        }

        // Validate password policy (minimum 10 characters with complexity)
        if (newPassword.length < 10) {
            return {
                error: 'Password must be at least 10 characters long',
                success: false
            };
        }

        const hasUpperCase = /[A-Z]/.test(newPassword);
        const hasLowerCase = /[a-z]/.test(newPassword);
        const hasNumbers = /\d/.test(newPassword);
        const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChars) {
            return {
                error: 'Password must contain uppercase, lowercase, number, and special character',
                success: false
            };
        }

        // Build request body for OBP API
        const requestBody: OBPPasswordResetRequestBody = {
            token: token!,
            new_password: newPassword
        };

        try {
            const response = await obp_requests.post(
                `/obp/v6.0.0/users/password-reset/complete`, 
                requestBody
            );

            logger.info("Password reset successful for token:", token);

            // Redirect to login page with success message
            throw redirect(303, '/login?reset=success');

        } catch (err) {
            if (err instanceof Response && err.status === 303) {
                // Re-throw the redirect
                throw err;
            }

            if (err instanceof OBPRequestError) {
                logger.error("OBP API error during password reset:", err.message);
                return {
                    error: err.message,
                    success: false
                };
            }

            logger.error("Error resetting password:", err);
            return {
                error: `Failed to reset password: ${err instanceof Error ? err.message : 'Unknown error'}`,
                success: false
            };
        }
    }
} satisfies Actions;