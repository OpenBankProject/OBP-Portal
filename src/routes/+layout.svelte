<script lang="ts">
	import '../app.css';
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
	import { page } from '$app/state';

	// Lucide Icons
	import {
		Menu,
		X,
		Compass,
		KeyRound,
		Star,
		SquareTerminal,
		UserPlus,
		MessageCircleQuestion,
		ShieldUser,
		User,
		ChevronDown,
		ChevronRight,
		Settings,
		CreditCard
	} from '@lucide/svelte';
	import { env } from '$env/dynamic/public';
	import LightSwitch from '$lib/components/LightSwitch.svelte';

	interface LayoutData {
		email?: string;
		userId?: string;
		username?: string;
		apiExplorerUrl?: string;
	}

	let { data, children } = $props<{ data: LayoutData }>();
	let isAuthenticated = $state(false);
	let isMobileMenuOpen = $state(false);
	let isMyAccountExpanded = $state(false);

	let displayMode: 'dark' | 'light' = $state('dark');

	if (data.email) {
		isAuthenticated = true;
	} else {
		isAuthenticated = false;
	}

	let isMyAccountActive = $derived(page.url.pathname.startsWith('/user'));
	// Watch for route changes to auto-expand My Account section
	$effect(() => {
		if (isMyAccountActive) {
			isMyAccountExpanded = true;
		}
	});

	function toggleMobileMenu() {
		isMobileMenuOpen = !isMobileMenuOpen;
	}

	function toggleMyAccount() {
		isMyAccountExpanded = !isMyAccountExpanded;
	}

	let myAccountItems = $state([
		{ href: '/user', label: 'Profile', iconComponent: User },
		{ href: '/user/consents', label: 'Consents', iconComponent: ShieldUser },
		{ href: '/user/consumers', label: 'Consumers', iconComponent: KeyRound }
	]);

	// Some items in the menu are rendered conditionally based on the presence of URLs set in the environment variables.
	// This is to ensure no broken links
	let menuItems = $state([
		...(data.API_EXPLORER_URL
			? [{ href: data.API_EXPLORER_URL, label: 'API Explorer', iconComponent: Compass }]
			: []), // unpacks a conditional list so we can add menu items where we want
		{ label: 'Get API Key', href: '/consumers/register', iconComponent: KeyRound },
		// ...(data.SUBSCRIPTIONS_URL
		// 	? [{ href: data.SUBSCRIPTIONS_URL, label: 'Subscriptions', iconComponent: Star }]
		// 	: []),
		//{ label: 'Onboarding', href: '/intro', iconComponent: UserPlus },
		//{ label: 'Consent Simulator', href: '/hola', iconComponent: ShieldUser },
		//{ label: 'FAQs', href: '/faq', iconComponent: MessageCircleQuestion },
		...(data.API_MANAGER_URL
			? [{ href: data.API_MANAGER_URL, label: 'API Manager', iconComponent: SquareTerminal }]
			: [])
	]);

	let footerLinks = $state([
		//{ href: '/privacy', label: 'Privacy Policy' },
		{ href: 'https://github.com/OpenBankProject', label: 'GitHub' }
		//{ href: '/terms', label: 'Terms of Service' },
		//{ href: '/support', label: 'Support' },
		//{ href: '/sitemap', label: 'Sitemap' }
	]);

	let currentTab = $state('home');

	// Default logo URL, can be overridden by PUBLIC_LOGO_URL in .env
	const defaultLogoUrl = '/logo2x-1.png';
	const defaultDarkLogoUrl = '/obp_logo.png';

	let lightLogoUrl = $state(env.PUBLIC_LOGO_URL || defaultLogoUrl);
	if (!env.PUBLIC_DARK_LOGO_URL) {
		// If no dark logo URL is provided, use the same as light logo
		env.PUBLIC_DARK_LOGO_URL = env.PUBLIC_LOGO_URL || defaultLogoUrl;
	}
	let darkLogoUrl = $state(env.PUBLIC_DARK_LOGO_URL || defaultDarkLogoUrl);

	let logoUrl = $derived.by(() => {
		return displayMode === 'dark' ? darkLogoUrl : lightLogoUrl;
	});
</script>

<div class="divide-surface-100-900 grid h-screen w-full grid-cols-[auto_1fr] divide-x divide-solid">
	<div class="h-full">
		<Navigation.Rail
			value={currentTab}
			onValueChange={(newTab) => (currentTab = newTab)}
			expanded={true}
			background="preset-filled-primary-50-950"
			tilesJustify="justify-start"
			tilesClasses="pt-5"
			footerClasses="p-4"
			tilesGap="gap-2"
			headerClasses="p-4"
		>
			{#snippet header()}
				<a href="/" class="flex w-full items-center">
					<img class="block w-full" src={logoUrl} alt="Logo" />
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

				{#if isAuthenticated}
					<!-- My Account Accordion -->
					<div class="w-full">
						<button
							type="button"
							class="hover:bg-surface-100-800 flex w-full items-center justify-between rounded-md p-3 text-left transition-colors"
							class:bg-primary-100-800={isMyAccountActive}
							onclick={toggleMyAccount}
						>
							<div class="flex items-center gap-3">
								<User class="h-5 w-5" />
								<span>My Account</span>
							</div>
							{#if isMyAccountExpanded}
								<ChevronDown class="h-4 w-4" />
							{:else}
								<ChevronRight class="h-4 w-4" />
							{/if}
						</button>

						{#if isMyAccountExpanded}
							<div class="mt-1 ml-4 space-y-1">
								{#each myAccountItems as subItem}
									<Navigation.Tile
										id={subItem.label.toLowerCase().replace(/\s+/g, '-')}
										labelExpanded={subItem.label}
										href={subItem.href}
										title={subItem.label}
										active="preset-filled-secondary-50-950 border-l-2 border-primary-500"
										classes="pl-6 text-sm"
									>
										<subItem.iconComponent class="h-4 w-4" />
									</Navigation.Tile>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/snippet}
			{#snippet footer()}
				<div class="text-surface-800-200 flex flex-wrap items-center gap-3 text-xs">
					{#each footerLinks as link, index}
						<a href={link.href} class="hover:text-tertiary-400 flex items-center gap-2">
							{#if link.label === 'GitHub'}
								<img
									class="h-4"
									alt="github logo"
									src={displayMode === 'dark' ? '/github-mark-white.svg' : '/github-mark.svg'}
								/>
							{/if}
							{link.label}
						</a>
					{/each}
					<span> Open Bank Project © TESOBE 2011-2025 </span>
				</div>
			{/snippet}
		</Navigation.Rail>
	</div>
	<div
		class="dark:from-primary-950 dark:via-secondary-500/70 dark:to-primary-950 flex h-full flex-col bg-conic-250 from-30% via-40% to-50%"
	>
		<div class="flex h-full flex-col backdrop-blur-2xl">
			<div class="bg-opacity-0 flex items-center justify-end p-4">
				<LightSwitch bind:mode={displayMode} />
				{#if isAuthenticated}
					<span class="hover:text-tertiary-400 mx-4"><a href="/user">{data.username}</a></span>
					<button type="button" class="btn preset-outlined-primary-500"
						><a href="/logout">Logout</a></button
					>
				{:else}
					<span class="hover:text-tertiary-400 mx-4"><a href="/register">Register</a> </span>
					<button type="button" class="btn preset-filled-surface-950-50"
						><a href="/login/obp">Login</a></button
					>
				{/if}
			</div>

			{@render children()}
		</div>
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
				><a href="/user">{data.username}</a></span
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
