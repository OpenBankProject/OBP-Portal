import type { RequestEvent } from "@sveltejs/kit";

export async function load(event: RequestEvent) {
    const { session } = event.locals;

    const user = session.data.currentUserData;
    if (user && user.user_id) {
        return {
            userId: user?.user_id,
            email: user?.email
        }
    } else {
        return {}
    }
    
}