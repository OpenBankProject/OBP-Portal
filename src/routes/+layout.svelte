<script lang="ts">
	import '../app.css';

	let { data, children } = $props();

	let isAuthenticated = $state(false);

	if (!data.email) {
		isAuthenticated = false;
	} else {
		isAuthenticated = true;
	}
</script>

{#if isAuthenticated}
	<div>
		<p>Welcome {data.email}</p>
	</div>
{:else}
	<div>
		<p>You are not authenticated.</p>
		<p>Please log in to access your account.</p>
		<a href="/login/obp">Login</a>
	</div>
{/if}

{@render children()}
