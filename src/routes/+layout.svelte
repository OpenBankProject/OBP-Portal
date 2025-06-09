<script lang="ts">
	import '../app.css';
	// SkeletonUI Components
	import { AppBar, Accordion } from '@skeletonlabs/skeleton-svelte';
	// Lucide Icons
	import { Menu, X } from '@lucide/svelte';

	interface LayoutData {
		email?: string;
		userId?: string;
		username?: string;
		apiExplorerUrl?: string;
	}

	let { data, children } = $props<{ data: LayoutData }>();

	let isAuthenticated = $state(false);
	let isMobileMenuOpen = $state(false);

	if (data.email) {
		isAuthenticated = false;
	} else {
		isAuthenticated = true;
	}

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	const headerLinks = $state([
		{ href: '/', label: 'Home'},
		{ href: '/user/consents', label: 'Consents' },
		{ href: '/user/transactions', label: 'Transactions' },
		{ href: '/user/accounts', label: 'Accounts' },
		{ href: '/user/obp', label: 'OBP' }
	]);

	if (data.apiExplorerUrl) {
		headerLinks.push({ href: data.apiExplorerUrl, label: 'API Explorer' });
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
			{#each headerLinks as link}
				<button type="button" class="btn hover:preset-tonal"
					><a href={link.href}>{link.label}</a></button
				>
			{/each}
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
				><a href="/login/obp">Log on</a></button
			>
		{/if}
	{/snippet}
</AppBar>

{#if isMobileMenuOpen}
	<div
		class="bg-surface-500/95 fixed top-16 right-0 left-0 z-50 flex flex-col space-y-2 p-4 shadow-lg transition-all duration-200 ease-in-out sm:hidden"
	>
		{#each headerLinks as link}
			<a href="{link.href}" class="btn variant-filled-surface w-full py-3 text-center"
				>{link.label}</a
			>
		{/each}
	</div>
{/if}

{@render children()}
