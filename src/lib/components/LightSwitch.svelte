<script lang="ts">
	import { Switch, Tooltip } from '@skeletonlabs/skeleton-svelte';

	// Icons
	import IconMoon from '@lucide/svelte/icons/moon';
	import IconSun from '@lucide/svelte/icons/sun';

	let checked = $state(false);
    let toolTipString = $derived(checked? 'Toggle Light Mode' : 'Toggle Dark Mode')

	let tooltipOpenState = $state(false);

	$effect(() => {
		const mode = localStorage.getItem('mode') || 'dark';
		checked = mode === 'dark';
	});

	const onCheckedChange = (event: { checked: boolean }) => {
		const mode = event.checked ? 'dark' : 'light';
		document.documentElement.setAttribute('data-mode', mode);
		localStorage.setItem('mode', mode);
		checked = event.checked;
	};
</script>

<svelte:head>
	<script>
		const mode = localStorage.getItem('mode') || 'dark';
		document.documentElement.setAttribute('data-mode', mode);
	</script>
</svelte:head>

<Tooltip contentBase="card preset-filled-surface-50-950 p-2 text-xs" openDelay={100}>
	{#snippet trigger()}
		<Switch {checked} {onCheckedChange}>
			{#snippet inactiveChild()}<IconMoon size="14" />{/snippet}
			{#snippet activeChild()}<IconSun size="14" />{/snippet}
		</Switch>
	{/snippet}
    {#snippet content()}
        {toolTipString}
    {/snippet}
</Tooltip>
