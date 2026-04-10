<script lang="ts">
	import { generateIdenticon } from '$lib/avatar/generate';

	interface Props {
		seed: string;
		size?: number;
		gridSize?: number;
		title?: string;
	}

	let { seed, size = 40, gridSize = 5, title }: Props = $props();

	const identicon = $derived(generateIdenticon(seed, gridSize));
	const cellSize = $derived(size / gridSize);
	const radius = $derived(size * 0.15);
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 {size} {size}"
	role="img"
	aria-label={title ?? `Avatar for ${seed}`}
	data-testid="avatar"
	data-seed={seed}
>
	<rect width={size} height={size} rx={radius} ry={radius} fill={identicon.background} />
	{#each identicon.grid as row, y}
		{#each row as filled, x}
			{#if filled}
				<rect
					x={x * cellSize}
					y={y * cellSize}
					width={cellSize}
					height={cellSize}
					fill={identicon.color}
				/>
			{/if}
		{/each}
	{/each}
</svg>
