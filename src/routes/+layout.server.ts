import type { RequestEvent } from "@sveltejs/kit";

export async function load(event: RequestEvent) {
    const { session } = event.locals;
    if (session.data.user) {
        return {
            userId: session.data.user.user_id,
            email: session.data.user.email,
            username: session.data.user.username,
        }
    } else {
        return {}
    }
    
}