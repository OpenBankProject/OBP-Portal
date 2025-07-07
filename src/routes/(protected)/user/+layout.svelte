<script lang="ts">
	import { Navigation } from '@skeletonlabs/skeleton-svelte';
	import { FileKey, Waypoints, SettingsIcon, MenuIcon} from '@lucide/svelte'
    

    let { children } = $props();

	let isExpanded = $state(true);

    // What items should be on the user menu
    let userMenuItems = $state([
        { label: 'Manage Consents', href: '?/consents', iconComponent: FileKey},
        { label: 'Manage Consumers', href: '?/consumers', iconComponent: Waypoints },
        { label: 'Account Settings', href: '?/account', iconComponent: SettingsIcon },
    ]);

    // State
    let currentTab = $state('consents');

	function toggleExpand() {
		isExpanded = !isExpanded;
	}
</script>

<div class="grid h-[760px] w-full grid-cols-[auto_1fr] ">
	<!-- Component -->
	<Navigation.Rail value={currentTab} onValueChange={(newTab) => (currentTab = newTab)} expanded={isExpanded}>
		{#snippet header()}
			<Navigation.Tile labelExpanded="Menu" onclick={toggleExpand} title="Toggle Menu Width" active="none"
				><MenuIcon /></Navigation.Tile
			>
		{/snippet}
		{#snippet tiles()}
            {#each userMenuItems as item}
                <Navigation.Tile
                    id={item.label.toLowerCase().replace(/\s+/g, '-')}
                    labelExpanded={item.label}
                    href={item.href}
                    title={item.label}
					active="preset-filled-primary-50-950 border border-solid-secondary-500"
                    ><svelte:component this={item.iconComponent} /></Navigation.Tile
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
	<!-- Content -->
	<div class="flex items-center justify-center">
        {@render children()}
	</div>
</div>
