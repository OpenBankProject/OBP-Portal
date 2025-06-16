import type { RequestEvent } from "@sveltejs/kit";
import { env } from "$env/dynamic/private";

export async function load(event: RequestEvent) {
    const { session } = event.locals;

    let data = {}

    // If API_EXPLORER_URL is defined, include it in the data object to display the header link
    if (env.API_EXPLORER_URL) {
        data = {
            apiExplorerUrl: env.API_EXPLORER_URL,
        }
    }

    // Get information about the user from the session if they are logged in
    // This will be used to display the user information in the header
    if (session.data.user) {
        const sessionData = {
            userId: session.data.user.user_id,
            email: session.data.user.email,
            username: session.data.user.username,
        }

        data = {...sessionData, ...data}
    }

    return data
}