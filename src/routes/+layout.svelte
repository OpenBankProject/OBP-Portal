<script lang="ts">
	import '../app.css';
	// SkeletonUI Components
	import { AppBar, Accordion } from '@skeletonlabs/skeleton-svelte';
	// Lucide Icons
	import { Menu, X } from '@lucide/svelte';

	let { data, children } = $props();

	let isAuthenticated = $state(false);
	let isMobileMenuOpen = $state(false);

	if (!data.email) {
		isAuthenticated = false;
	} else {
		isAuthenticated = true;
	}

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}
</script>

<AppBar leadClasses="hidden sm:block">
	{#snippet lead()}
		<a href="/" class="flex items-center space-x-3 rtl:space-x-reverse">
			<img
				class="block h-auto w-100 md:object-contain"
				src="/logo2x-1.png"
				alt="Open Bank Project Logo"
			/>
		</a>
	{/snippet}
	{#snippet headline()}{/snippet}
	{#snippet trail()}
		<div class="hidden flex-wrap items-center justify-end space-x-2 sm:flex rtl:space-x-reverse">
			<button type="button" class="btn hover:preset-tonal"
				><a href="/user/consents">Consents</a></button
			>
			<button type="button" class="btn hover:preset-tonal"
				><a href="/user/transactions">Transactions</a></button
			>
			<button type="button" class="btn hover:preset-tonal"
				><a href="/user/accounts">Accounts</a></button
			>
			<button type="button" class="btn hover:preset-tonal"><a href="/user/obp">OBP</a></button>
		</div>

		<button type="button" class="btn-icon btn-lg block sm:hidden" onclick={toggleMobileMenu}>
			{#if isMobileMenuOpen}
				<X />
			{:else}
				<Menu />
			{/if}
		</button>

		<span class="vr"></span>

		{#if isAuthenticated}
			<span class="mx-10 my-auto font-bold text-white">{data.email}</span>
			<button type="button" class="btn preset-outlined-primary-500"
				><a href="/logout">Logout</a></button
			>
		{:else}
			<button type="button" class="btn preset-filled-primary-500"
				><a href="/login/obp">Login</a></button
			>
		{/if}
	{/snippet}
</AppBar>

{#if isMobileMenuOpen}
    <div class="sm:hidden fixed top-16 left-0 right-0 bg-surface-500/95 shadow-lg z-50 p-4 flex flex-col space-y-2 transition-all duration-200 ease-in-out">
        <a href="/user/consents" class="btn variant-filled-surface w-full text-center py-3">Consents</a>
        <a href="/user/transactions" class="btn variant-filled-surface w-full text-center py-3">Transactions</a>
        <a href="/user/accounts" class="btn variant-filled-surface w-full text-center py-3">Accounts</a>
        <a href="/user/obp" class="btn variant-filled-surface w-full text-center py-3">OBP</a>
    </div>
{/if}

{@render children()}
