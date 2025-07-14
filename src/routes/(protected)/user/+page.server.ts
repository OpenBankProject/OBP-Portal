import type { RequestEvent, Actions } from "@sveltejs/kit";
import { error, redirect } from "@sveltejs/kit";

export function load(event: RequestEvent) {
    // For now throw a 404 as this page is not ready yet
    throw error(503, "Woops! This page is under construction.");
}