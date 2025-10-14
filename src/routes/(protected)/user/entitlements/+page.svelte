<script lang="ts">
	import { type SessionData } from 'svelte-kit-sessions';
	import { obp_requests } from '$lib/obp/requests.js';

	const { data } = $props();
	const userEntitlements = data.userEntitlements;
	const allEntitlements = data.allAvailableEntitlements;
	const allBanks = data.allBanks;

	const canCreateEntitlements = $derived.by(() => {
		return userEntitlements.some((entitlement) =>
			['CanCreateEntitlementAtAnyBank', 'CanCreateEntitlementAtOneBank'].includes(
				entitlement.role_name
			)
		);
	});

	let selectedEntitlement = $state({ role: '', requires_bank_id: false });
	let selectedBank = $state({ bank_id: '', name: '' });

	console.log('User Entitlements:', userEntitlements);
	console.log('All Entitlements:', allEntitlements);
	console.log('Can Create Entitlements:', canCreateEntitlements);
</script>

<h2 class="mb-4 text-xl font-semibold">Your Entitlements</h2>

{#if userEntitlements.length > 0}
	<div class="table-container">
		<!-- Native Table Element -->
		<table class="table-hover table">
			<thead>
				<tr>
					<th>Name</th>
					<th>ID</th>
					<th>Bank ID</th>
				</tr>
			</thead>
			<tbody>
				{#each userEntitlements as row, i}
					<tr>
						<td>{row.role_name}</td>
						<td>{row.entitlement_id}</td>
						<td>{row.bank_id}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

{#if canCreateEntitlements}
	<h2 class="mt-8 mb-4 text-xl font-semibold">Add New Entitlement</h2>
	<form method="POST" action="?/create" class="mx-auto w-full max-w-md space-y-4">
		<label class="label">
			<span class="label-text">Select Entitlement</span>
			<select class="select" bind:value={selectedEntitlement}>
				<option value="" disabled>Select an entitlement</option>
				{#each allEntitlements as ent: {ent}}
					<option value={ent}>{ent.role}</option>
				{/each}
			</select>
		</label>

		{#if selectedEntitlement.requires_bank_id}
			<label class="label">
				<span class="label-text">Select Bank</span>
				<select class="select" bind:value={selectedBank}>
					<option value="" disabled>Select a bank</option>
					{#each allBanks as bank}
						<option value={bank}>{bank.name} ({bank.bank_id})</option>
					{/each}
				</select>
			</label>
		{/if}
        <button class="btn preset-outlined-tertiary-500">Add Entitlement</button>
	</form>
{:else if !canCreateEntitlements}
	<h2 class="mt-8 mb-4 text-xl font-semibold">Request Entitlement</h2>
{/if}
