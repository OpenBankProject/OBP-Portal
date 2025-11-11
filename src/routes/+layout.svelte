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
		...(data.externalLinks.SUBSCRIPTIONS_URL
			? [{ href: data.externalLinks.SUBSCRIPTIONS_URL, label: 'Subscriptions', iconComponent: Star }]
			: []),
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
		<Navigation layout="sidebar" class="preset-filled-primary-50-950 grid grid-rows-[auto_1fr_auto] gap-4 h-full">
			<Navigation.Header class="p-4">
				<a href="/" class="flex w-full items-center">
					<img class="block w-full" src={logoUrl} alt="Logo" />
				</a>
			</Navigation.Header>
			
			<Navigation.Content class="">
				<!-- Main Menu Group -->
				<Navigation.Group>
					<Navigation.Menu class="flex flex-col gap-2 px-2">
						{#each menuItems as item}
							{@const Icon = item.iconComponent}
							<a 
								href={item.href} 
								class="btn hover:preset-tonal justify-start px-2 w-full gap-3"
								class:preset-filled-primary-50-950={page.url.pathname === item.href}
								class:border={page.url.pathname === item.href}
								class:border-solid-secondary-500={page.url.pathname === item.href}
								title={item.label}
								aria-label={item.label}
							>
								<Icon class="size-5" />
								<span>{item.label}</span>
							</a>
						{/each}
					</Navigation.Menu>
				</Navigation.Group>

				{#if isAuthenticated}
					<!-- My Account Group -->
					<Navigation.Group>
						<button
							type="button"
							class="hover:bg-surface-100-800 flex w-full items-center justify-between rounded-md p-3 text-left transition-colors mx-2"
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
							<Navigation.Menu class="flex flex-col gap-1 px-2 ml-4 mt-1">
								{#each myAccountItems as subItem}
									{@const Icon = subItem.iconComponent}
									<a 
										href={subItem.href}
										class="btn hover:preset-tonal justify-start px-2 w-full gap-3 text-sm pl-6"
										class:preset-filled-secondary-50-950={page.url.pathname === subItem.href}
										class:border-l-2={page.url.pathname === subItem.href}
										class:border-primary-500={page.url.pathname === subItem.href}
										title={subItem.label}
										aria-label={subItem.label}
										target={subItem.external ? '_blank' : undefined}
										rel={subItem.external ? 'noopener noreferrer' : undefined}
									>
										<Icon class="size-4" />
										<span>{subItem.label}</span>
									</a>
								{/each}
							</Navigation.Menu>
						{/if}
					</Navigation.Group>
				{/if}
			</Navigation.Content>

			<Navigation.Footer class="p-4">
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
			</Navigation.Footer>
		</Navigation>
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
