<script lang="ts">
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
	import { fade } from 'svelte/transition';
	import {
		PanelLeftClose,
		PanelLeftOpen,
		User,
		ChevronDown,
		ChevronRight
	} from '@lucide/svelte';
	import LightSwitch from '$lib/components/LightSwitch.svelte';
	import type { NavigationItem } from '$lib/config/navigation';

	interface FooterLink {
		href: string;
		label: string;
		iconLight?: string;
		iconDark?: string;
	}

	interface NavigationSidebarProps {
		menuItems: NavigationItem[];
		myAccountItems?: NavigationItem[];
		logoUrl: string;
		logoWidth?: string;
		collapsedLogoUrl?: string;
		isAuthenticated?: boolean;
		currentPathname: string;
		displayMode?: 'dark' | 'light';
		footerLinks?: FooterLink[];
		copyrightHolder?: string;
		copyrightStartYear?: number;
		sponsorImageUrl?: string;
		sponsorInfoUrl?: string;
		sponsorNote?: string;
		legacyPortalUrl?: string;
		hideFooterExtras?: boolean;
	}

	let {
		menuItems,
		myAccountItems = [],
		logoUrl,
		logoWidth = '100%',
		collapsedLogoUrl,
		isAuthenticated = false,
		currentPathname,
		displayMode = $bindable('dark'),
		footerLinks = [],
		copyrightHolder,
		copyrightStartYear,
		sponsorImageUrl,
		sponsorInfoUrl,
		sponsorNote,
		legacyPortalUrl,
		hideFooterExtras = false
	}: NavigationSidebarProps = $props();

	let isNavExpanded = $state(true);
	// Separate from isNavExpanded so text can fade out *before* the rail closes,
	// and fade in *after* the rail has opened.
	let textVisible = $state(true);
	let isMyAccountExpanded = $state(false);
	let toggleTimeout: ReturnType<typeof setTimeout> | null = null;

	let isMyAccountActive = $derived(currentPathname.startsWith('/user'));

	$effect(() => {
		if (isMyAccountActive) {
			isMyAccountExpanded = true;
		}
	});

	function toggleMyAccount() {
		isMyAccountExpanded = !isMyAccountExpanded;
	}

	function toggleNav() {
		if (toggleTimeout) clearTimeout(toggleTimeout);

		if (isNavExpanded) {
			// Phase 1: fade out text content (150ms out:fade)
			textVisible = false;
			// Phase 2: close the rail after text has gone
			toggleTimeout = setTimeout(() => {
				isNavExpanded = false;
				toggleTimeout = null;
			}, 180);
		} else {
			// Phase 1: open the rail (Skeleton's wipe animation ~200ms)
			isNavExpanded = true;
			// Phase 2: fade in text once rail is open
			toggleTimeout = setTimeout(() => {
				textVisible = true;
				toggleTimeout = null;
			}, 220);
		}
	}
</script>

<div class="h-full transition-all duration-300">
	<Navigation
		layout={isNavExpanded ? 'sidebar' : 'rail'}
		class="grid h-full grid-rows-[auto_1fr_auto] gap-4 preset-filled-primary-50-950"
	>
		<Navigation.Header class="px-2 py-4">
			{#if isNavExpanded}
				<div class="flex items-center justify-between gap-2">
					<a href="/" class="flex min-w-0 flex-1 items-center justify-center">
						<img class="block" style="width: {logoWidth};" src={logoUrl} alt="Logo" />
					</a>
					<button
						type="button"
						onclick={toggleNav}
						class="btn-icon hover:preset-tonal flex-shrink-0"
						title="Collapse navigation"
						aria-label="Collapse navigation"
					>
						<PanelLeftClose class="size-5" />
					</button>
				</div>
			{:else}
				<button
					type="button"
					onclick={toggleNav}
					class="btn w-full justify-center gap-3 px-2 hover:preset-tonal"
					title="Expand navigation"
					aria-label="Expand navigation"
				>
					<PanelLeftOpen class="size-5" />
				</button>
			{/if}
		</Navigation.Header>

		<Navigation.Content class="">
			<!-- Main Menu Group -->
			<Navigation.Group>
				<Navigation.Menu class="flex flex-col gap-2 px-2 !justify-start">
					{#each menuItems as item}
						{@const Icon = item.iconComponent}
						<a
							href={item.href}
							class="btn w-full gap-3 px-2 hover:preset-tonal"
							class:justify-start={textVisible}
							class:justify-center={!textVisible}
							class:preset-filled-primary-50-950={currentPathname === item.href}
							class:border={currentPathname === item.href}
							class:border-solid-secondary-500={currentPathname === item.href}
							title={item.label}
							aria-label={item.label}
							target={item.external ? '_blank' : undefined}
							rel={item.external ? 'noopener noreferrer' : undefined}
						>
							<Icon class="size-5" />
							{#if textVisible}
								<span out:fade={{ duration: 150 }}>{item.label}</span>
							{/if}
						</a>
					{/each}
				</Navigation.Menu>
			</Navigation.Group>

			{#if isAuthenticated}
				<!-- My Account Group -->
				<Navigation.Group>
					{#if textVisible}
						<button
							type="button"
							class="hover:bg-surface-100-800 mx-2 flex w-full items-center justify-between rounded-md p-3 text-left transition-colors"
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
							<Navigation.Menu class="mt-1 ml-4 flex flex-col gap-1 px-2">
								{#each myAccountItems as subItem}
									{@const Icon = subItem.iconComponent}
									<a
										href={subItem.href}
										class="btn w-full justify-start gap-3 px-2 pl-6 text-sm hover:preset-tonal"
										class:preset-filled-secondary-50-950={currentPathname === subItem.href}
										class:border-l-2={currentPathname === subItem.href}
										class:border-primary-500={currentPathname === subItem.href}
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
					{:else}
						<Navigation.Menu class="flex flex-col gap-2 px-2 !justify-start">
							<a
								href="/user"
								class="btn w-full justify-center gap-3 px-2 hover:preset-tonal"
								class:preset-filled-primary-50-950={isMyAccountActive}
								title="My Account"
								aria-label="My Account"
							>
								<User class="size-5" />
							</a>
						</Navigation.Menu>
					{/if}
				</Navigation.Group>
			{/if}
		</Navigation.Content>

		{#if !isNavExpanded && collapsedLogoUrl}
			<Navigation.Footer class="flex justify-center px-2 py-4">
				<a href="/" title="Home">
					<img src={collapsedLogoUrl} alt="Logo" class="size-7" />
				</a>
			</Navigation.Footer>
		{:else if textVisible}
			<Navigation.Footer class="px-2 py-4">
				<div class="flex flex-wrap items-center gap-3 text-xs text-surface-800-200">
					<LightSwitch bind:mode={displayMode} />
					{#each footerLinks as link}
						<a href={link.href} class="flex items-center gap-2 hover:text-tertiary-400">
							{#if link.iconLight && link.iconDark}
								<img
									class="h-4"
									alt="{link.label} logo"
									src={displayMode === 'dark' ? link.iconDark : link.iconLight}
								/>
							{/if}
							{link.label}
						</a>
					{/each}
					<a href="/about" class="hover:text-tertiary-400">About</a>
					{#if !hideFooterExtras && copyrightHolder && copyrightStartYear}
						<span> © {copyrightHolder} {copyrightStartYear}-{Math.max(new Date().getFullYear(), 2026)} </span>
					{/if}
					{#if sponsorNote}
						<span class="text-surface-800-200">{sponsorNote}</span>
					{/if}
					{#if sponsorImageUrl}
						{#if sponsorInfoUrl}
							<a href={sponsorInfoUrl} target="_blank" rel="noopener noreferrer">
								<img src={sponsorImageUrl} alt="Sponsor" class="h-6" />
							</a>
						{:else}
							<img src={sponsorImageUrl} alt="Sponsor" class="h-6" />
						{/if}
					{/if}
					{#if legacyPortalUrl}
						<!-- Legacy Portal Link -->
						<a
							href={legacyPortalUrl}
							class="w-full justify-start text-xs text-tertiary-700-300 hover:underline"
							aria-label="Switch to Legacy Portal"
						>
							<span>Switch to Legacy Portal</span>
						</a>
					{/if}
				</div>
			</Navigation.Footer>
		{/if}
	</Navigation>
</div>
