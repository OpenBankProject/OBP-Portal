<script lang="ts">
	import { Switch, Tooltip } from '@skeletonlabs/skeleton-svelte';
	import { onMount } from 'svelte';

	// Icons
	import IconMoon from '@lucide/svelte/icons/moon';
	import IconSun from '@lucide/svelte/icons/sun';

	interface LightSwitchProps {
		mode?: 'dark' | 'light';
	}

	let { mode = $bindable('dark') }: LightSwitchProps = $props();

	let checked = $derived(mode === 'dark');
	let toolTipString = $derived(checked ? 'Toggle Light Mode' : 'Toggle Dark Mode');

	onMount(() => {
		const storedMode = localStorage.getItem('mode') || 'dark';
		mode = storedMode as 'dark' | 'light';
		document.documentElement.setAttribute('data-mode', mode);
	});

	const onCheckedChange = (event: { checked: boolean }) => {
		mode = event.checked ? 'dark' : 'light';
		document.documentElement.setAttribute('data-mode', mode);
		localStorage.setItem('mode', mode);
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
