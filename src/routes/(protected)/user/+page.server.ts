import type { RequestEvent, Actions } from "@sveltejs/kit";
import { redirect } from "@sveltejs/kit";

export function load(event: RequestEvent) {
    throw redirect(307, "/user/consents")
}