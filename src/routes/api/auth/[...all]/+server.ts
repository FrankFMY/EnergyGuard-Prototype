import { auth } from '$lib/server/auth.js';
import type { RequestHandler } from './$types.js';
import { toSvelteKitHandler } from 'better-auth/svelte-kit';

export const GET: RequestHandler = toSvelteKitHandler(auth);
export const POST: RequestHandler = toSvelteKitHandler(auth);
