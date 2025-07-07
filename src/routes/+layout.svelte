<script lang="ts">
	import '../app.css';
	// SkeletonUI Components
	import { AppBar, Accordion } from '@skeletonlabs/skeleton-svelte';
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
	// Lucide Icons
	import {
		Menu,
		X,
		Compass,
		KeyRound,
		Star,
		SquareTerminal,
		UserPlus,
		MessageCircleQuestion
	} from '@lucide/svelte';
	import { env } from '$env/dynamic/public';

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
		isAuthenticated = true;
	} else {
		isAuthenticated = false;
	}

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	// Some items in the menu are rendered conditionally based on the presence of URLs set in the environment variables.
	// This is to ensure no broken links
	let menuItems = $state([
		...(data.API_EXPLORER_URL
			? [{ href: data.API_EXPLORER_URL, label: 'API Explorer', iconComponent: Compass }]
			: []), // unpacks a conditional list so we can add menu items where we want
		{ label: 'Get API Key', href: '/consumers/register', iconComponent: KeyRound },
		...(data.SUBSCRIPTIONS_URL
			? [{ href: data.SUBSCRIPTIONS_URL, label: 'Subscriptions', iconComponent: Star }]
			: []),
		{ label: 'Onboarding', href: '/intro', iconComponent: UserPlus },
		{ label: 'Consent Simulator', href: '/support', iconComponent: Compass },
		{ label: 'FAQs', href: '/support', iconComponent: MessageCircleQuestion },
		...(data.API_MANAGER_URL
			? [{ href: data.API_MANAGER_URL, label: 'API Manager', iconComponent: SquareTerminal }]
			: [])
	]);

	const headerLinks = $state([
		{ href: '/', label: 'Home' },
		{ href: '/consumers/register', label: 'Get API Key' },
		{ href: '/intro', label: 'Getting Started' },
		{ href: '/support', label: 'Support' }
	]);

	let currentTab = $state('home');

	// Default logo URL, can be overridden by PUBLIC_LOGO_URL in .env
	const defaultLogoUrl = '/logo2x-1.png';

	const logoUrl = $state(env.PUBLIC_LOGO_URL || defaultLogoUrl);
</script>

<div class="grid h-screen w-full divide-x divide-solid divide-surface-100-900 grid-cols-[auto_1fr]">
	<div class="h-full">
		<Navigation.Rail
			value={currentTab}
			onValueChange={(newTab) => (currentTab = newTab)}
			expanded={true}
			background="preset-filled-primary-50-950"
			tilesJustify="justify-start"
			tilesClasses="pt-10"
			headerClasses="px-4 pb-4 pt-2"
		>
			{#snippet header()}
				<a href="/" class="flex items-center space-x-3 rtl:space-x-reverse">
					<img class="block w-full md:object-contain" src={logoUrl} alt="Logo" />
				</a>
			{/snippet}
			{#snippet tiles()}
				{#each menuItems as item}
					<Navigation.Tile
						id={item.label.toLowerCase().replace(/\s+/g, '-')}
						labelExpanded={item.label}
						href={item.href}
						title={item.label}
						active="preset-filled-primary-50-950 border border-solid-secondary-500"
						><item.iconComponent /></Navigation.Tile
					>
				{/each}
				<!-- <Navigation.Tile id="consents" labelExpanded="Manage Consents" href="?/consents">
			<IconFolder />
		</Navigation.Tile>
		<Navigation.Tile labelExpanded="Browse Images" href="?/account">
			<IconImage />
		</Navigation.Tile>
		<Navigation.Tile labelExpanded="Browse Music" href="#/music">
			<IconMusic />
		</Navigation.Tile>
		<Navigation.Tile labelExpanded="Browse Videos" href="#/videos">
			<IconVideo />
		</Navigation.Tile>
		<Navigation.Tile labelExpanded="Browse Games" href="/games">
			<IconGames />
		</Navigation.Tile> -->
			{/snippet}
			<!-- {#snippet footer()}
		<Navigation.Tile labelExpanded="Settings" href="/settings" title="Settings"
			><IconSettings /></Navigation.Tile
		>
	{/snippet} -->
		</Navigation.Rail>

		
	</div>
	<div class="flex items-center justify-center bg-primary-50-950">
		{@render children()}
	</div>
</div>

<!-- <AppBar leadClasses="hidden sm:block">
	{#snippet lead()}
		<a href="/" class="flex items-center space-x-3 rtl:space-x-reverse">
			<img class="block h-10 w-auto md:object-contain" src={logoUrl} alt="Logo" />
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
			<span class="hover:text-tertiary-400 mx-10 my-auto text-white"
				><a href="/user">{data.email}</a></span
			>
			<button type="button" class="btn preset-outlined-primary-500"
				><a href="/logout">Logout</a></button
			>
		{:else}
			<span class="hover:text-tertiary-400 my-auto ml-2 font-bold text-white"
				><a href="/register">Sign Up</a></span
			>
			<button type="button" class="btn preset-filled-primary-500"
				><a href="/login/obp">Log on</a></button
			>
		{/if}
	{/snippet}
</AppBar>

{#if isMobileMenuOpen}
	<div
		class="bg-primary-500/95 fixed top-16 right-0 left-0 z-50 flex flex-col space-y-2 p-4 shadow-lg transition-all duration-200 ease-in-out sm:hidden"
	>
		{#each headerLinks as link}
			<a href={link.href} class="btn variant-filled-primary w-full py-3 text-center">{link.label}</a
			>
		{/each}
	</div>
{/if} -->
