<script lang="ts">
	import '../app.css';
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
	import { page } from '$app/state';
	import { myAccountItems } from '$lib/config/navigation';
	import Toast from '$lib/components/Toast.svelte';

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
	import type { RootLayoutData } from './+layout.server';

	let { data, children } = $props();
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

	// Some items in the menu are rendered conditionally based on the presence of URLs set in the environment variables.
	// This is to ensure no broken links
	let menuItems = $state([
		...(data.externalLinks.API_EXPLORER_URL
			? [
					{
						href: data.externalLinks.API_EXPLORER_URL,
						label: 'API Explorer',
						iconComponent: Compass
					}
				]
			: []), // unpacks a conditional list so we can add menu items where we want
		{
			label: 'Get API Key',
			href: '/consumers/register',
			iconComponent: KeyRound
		},
		// ...(data.SUBSCRIPTIONS_URL
		// 	? [{ href: data.SUBSCRIPTIONS_URL, label: 'Subscriptions', iconComponent: Star }]
		// 	: []),
		//{ label: 'Onboarding', href: '/intro', iconComponent: UserPlus },
		//{ label: 'Consent Simulator', href: '/hola', iconComponent: ShieldUser },
		//{ label: 'FAQs', href: '/faq', iconComponent: MessageCircleQuestion },
		...(data.externalLinks.API_MANAGER_URL
			? [
					{
						href: data.externalLinks.API_MANAGER_URL,
						label: 'API Manager',
						iconComponent: SquareTerminal
					}
				]
			: [])
	]);

	let footerLinks = $state([
		//{ href: '/privacy', label: 'Privacy Policy' },
		{
			href: 'https://github.com/OpenBankProject',
			label: 'GitHub'
		}
	]); //{ href: '/terms', label: 'Terms of Service' },

	//{ href: '/support', label: 'Support' },
	//{ href: '/sitemap', label: 'Sitemap' }
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

<div
	class="divide-surface-100-900 grid h-screen w-full grid-cols-[auto_1fr] divide-x divide-solid overflow-hidden"
>
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
							<div class="ml-4 mt-1 space-y-1">
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
					<LightSwitch bind:mode={displayMode} />
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
		class="bg-conic-250 dark:from-primary-950 dark:via-secondary-500/70 dark:to-primary-950 h-full from-30% via-40% to-50%"
	>
		<div class="flex flex-col backdrop-blur-2xl" style="height: calc(100vh - 80px);">
			<div
				class="flex items-center justify-end bg-opacity-0 p-4"
				style="height: 80px; flex-shrink: 0;"
			>
				{#if isAuthenticated}
					<span class="hover:text-tertiary-400 mx-4"><a href="/user">{data.username}</a></span>
					<button type="button" class="btn preset-outlined-primary-500"
						><a href="/logout">Logout</a></button
					>
				{:else}
					<span class="hover:text-tertiary-400 mx-4"><a href="/register">Register</a> </span>
					<button type="button" class="btn preset-filled-surface-950-50"
						><a href="/login">Login</a></button
					>
				{/if}
			</div>

			<main class="flex flex-col overflow-auto" style="height: calc(100vh - 80px);">
				{@render children()}
			</main>
		</div>
	</div>
</div>

<!-- Global Toast Component -->
<Toast />
