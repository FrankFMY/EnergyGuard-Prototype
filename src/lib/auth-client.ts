import { createAuthClient } from 'better-auth/svelte';

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_AUTH_URL || 'http://localhost:5173'
});

export const { signIn, signUp, signOut, useSession } = authClient;
