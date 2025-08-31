<script lang="ts">
	let { data } = $props();

	function formatDate(dateString: string) {
		const date = new Date(dateString);
		const day = date.getDate().toString().padStart(2, '0');
		const monthNames = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec'
		];
		const month = monthNames[date.getMonth()];
		const year = date.getFullYear();
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${day}/${month}/${year} ${hours}:${minutes}`;
	}

	function getCreatedDate(consent: any): string {
		// Only use explicit created_date field
		if (consent.created_date) {
			return formatDate(consent.created_date);
		}
		
		// If not present, show None
		return 'None';
	}

	function formatRoles(entitlements: any[]): string {
		if (!entitlements || entitlements.length === 0) {
			return 'None';
		}
		
		// Extract role names from entitlements
		const roles = entitlements.map((entitlement) => {
			if (typeof entitlement === 'string') {
				return entitlement;
			} else if (entitlement.role_name) {
				return entitlement.role_name;
			} else if (entitlement.name) {
				return entitlement.name;
			} else {
				return JSON.stringify(entitlement);
			}
		});
		
		return roles.join(', ');
	}

	function formatViews(views: any[]): string {
		if (!views || views.length === 0) {
			return 'None';
		}
		
		// Extract view information
		const viewNames = views.map((view) => {
			if (typeof view === 'string') {
				return view;
			} else if (view.view_id) {
				return view.view_id;
			} else if (view.id) {
				return view.id;
			} else if (view.name) {
				return view.name;
			} else {
				return JSON.stringify(view);
			}
		});
		
		return viewNames.join(', ');
	}
</script>

<h1 class="text-gray-900 dark:text-gray-100">This is the consents page</h1>

<p class="text-gray-700 dark:text-gray-300">Here you can manage your consents.</p>

<ul class="list-none pl-5">
	{#each data.consents as consent (consent.consent_id)}
		<li>
			<div
				class="mx-auto my-5 max-w-screen-xl rounded-lg bg-gray-100 p-6 shadow-md dark:bg-gray-800"
			>
				<div class="mb-4">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{consent.consent_id}
					</h2>
					<div class="mt-2 space-y-1 text-sm">
						<p class="text-gray-900 dark:text-gray-100">
							<strong>Status:</strong>
							{consent.status}
						</p>
						<p class="text-gray-700 dark:text-gray-300">
							<strong>Created Date:</strong>
							{getCreatedDate(consent)}
						</p>
						<p class="text-gray-700 dark:text-gray-300">
							<strong>Last Action Date:</strong>
							{formatDate(consent.last_action_date)}
						</p>
						{#if consent.last_usage_date}
							<p class="text-gray-700 dark:text-gray-300">
								<strong>Last Usage Date:</strong>
								{formatDate(consent.last_usage_date)}
							</p>
						{/if}
						<p class="text-gray-700 dark:text-gray-300">
							<strong>Everything Access:</strong>
							{consent.everything ? 'Yes' : 'No'}
						</p>
						<p class="text-gray-700 dark:text-gray-300">
							<strong>Roles:</strong>
							{formatRoles(consent.jwt_payload?.entitlements || [])}
						</p>
						<p class="text-gray-700 dark:text-gray-300">
							<strong>Views:</strong>
							{formatViews(consent.jwt_payload?.views || [])}
						</p>
					</div>
				</div>
				<form method="post" action="?/delete">
					<input type="hidden" name="consent_id" value={consent.consent_id} />
					<button type="submit" class="font-medium text-red-500 hover:text-red-700">
						Delete Consent
					</button>
				</form>
			</div>
		</li>
	{/each}
</ul>
