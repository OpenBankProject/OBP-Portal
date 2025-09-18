<script lang="ts">
	let { data } = $props();

	// Get current UTC time for debugging
	let currentUtcTime = $state('');

	// Update the current time every second
	function updateCurrentTime() {
		currentUtcTime = new Date().toISOString();
	}

	// Initialize and set up interval
	updateCurrentTime();
	if (typeof window !== 'undefined') {
		setInterval(updateCurrentTime, 1000);
	}

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

	function renderConsentCard(consent: any) {
		return consent;
	}

	function formatJwtExpiration(consent: any): string {
		if (consent.jwt_payload?.exp) {
			const expDate = new Date(consent.jwt_payload.exp * 1000);
			return expDate.toISOString();
		}
		return 'Not available';
	}

	function isJwtExpired(consent: any): boolean {
		if (consent.jwt_payload?.exp) {
			const expDate = new Date(consent.jwt_payload.exp * 1000);
			return expDate < new Date();
		}
		return true;
	}

	function isOpeyConsent(consent: any): boolean {
		return consent.consumer_id === data.opeyConsumerId;
	}

	function getJWTStatus(consent: any): {
		status: string;
		message: string;
		class: string;
		expiresAt?: Date;
		opeyStatus?: string;
		opeyMessage?: string;
	} {
		// Check if we have Opey validation results
		if ((consent as any).opey_validation) {
			const opeyValid = (consent as any).opey_validation.valid;
			const opeyError = (consent as any).opey_validation.error;

			if (!opeyValid) {
				return {
					status: 'Rejected by Opey',
					message: `Opey validation failed: ${opeyError}`,
					class: 'bg-red-100 text-red-800',
					opeyStatus: 'rejected',
					opeyMessage: opeyError
				};
			}
		}

		if (!consent.jwt_payload?.exp) {
			return {
				status: 'No JWT',
				message: 'No JWT expiration information available',
				class: 'bg-gray-100 text-gray-800'
			};
		}

		const exp = consent.jwt_payload.exp;
		const now = Math.floor(Date.now() / 1000);
		const expiresAt = new Date(exp * 1000);

		if (exp < now) {
			const expiredAgo = Math.floor((now - exp) / 60); // minutes ago
			return {
				status: 'Expired',
				message: `JWT expired ${expiredAgo} minutes ago`,
				class: 'bg-red-100 text-red-800',
				expiresAt
			};
		}

		const expiresIn = Math.floor((exp - now) / 60); // minutes until expiration
		let status = 'Valid (Local)';
		let message = `JWT valid locally, expires in ${expiresIn} minutes`;
		let cssClass = 'bg-yellow-100 text-yellow-800';

		// If we have positive Opey validation, show it as fully valid
		if ((consent as any).opey_validation && (consent as any).opey_validation.valid) {
			status = 'Valid (Verified)';
			message = `JWT verified with Opey, expires in ${expiresIn} minutes`;
			cssClass = 'bg-green-100 text-green-800';
		}

		return {
			status,
			message,
			class: cssClass,
			expiresAt,
			opeyStatus: (consent as any).opey_validation?.valid ? 'verified' : 'untested',
			opeyMessage: (consent as any).opey_validation
				? 'Tested with Opey service'
				: 'Not tested with Opey'
		};
	}
</script>

<h1 class="text-gray-900 dark:text-gray-100">Consents Management</h1>

<p class="mb-4 text-gray-700 dark:text-gray-300">Here you can manage your consents.</p>

<!-- Current UTC Time for debugging -->
<div
	class="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
>
	<h3 class="mb-2 text-sm font-medium text-blue-900 dark:text-blue-100">Debug Information</h3>
	<p class="text-sm text-blue-800 dark:text-blue-200">
		<strong>Current UTC Time:</strong>
		{currentUtcTime}
	</p>
	<p class="mt-1 text-xs text-blue-600 dark:text-blue-300">
		Use this to compare with consent expiration times to check for timezone offset issues.
		<br />
		<strong>Note:</strong> Opey consents are now validated with the actual Opey service to show real
		usability status.
	</p>
</div>

<!-- Consents for Opey Section -->
<div class="mb-10">
	<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Consents for Opey</h2>
	{#if data.opeyConsents && data.opeyConsents.length > 0}
		<ul class="list-none pl-5">
			{#each data.opeyConsents as consent (consent.consent_id)}
				{@const jwtStatus = getJWTStatus(consent)}
				<li>
					<div
						class="mx-auto my-5 max-w-screen-xl rounded-lg bg-gray-100 p-6 shadow-md dark:bg-gray-800"
					>
						<div class="mb-4">
							<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
								{consent.consent_id}
							</h3>
							<div class="mt-2 space-y-1 text-sm">
								<p class="text-gray-900 dark:text-gray-100">
									<strong>Status:</strong>
									{consent.status}
									{#if isOpeyConsent(consent)}
										<span class="ml-2 rounded bg-blue-100 px-2 py-1 text-xs text-blue-800"
											>OPEY</span
										>
									{/if}
								</p>
								<p class="text-gray-900 dark:text-gray-100">
									<strong>JWT Status:</strong>
									<span class="inline-block rounded px-2 py-1 text-xs {jwtStatus.class}">
										{jwtStatus.status}
									</span>
									<br />
									<span class="text-sm text-gray-600">{jwtStatus.message}</span>
									{#if jwtStatus.expiresAt}
										<br />
										<span class="text-xs text-gray-500"
											>Expires: {jwtStatus.expiresAt.toLocaleString()}</span
										>
									{/if}
									{#if jwtStatus.opeyStatus === 'rejected'}
										<br />
										<span class="text-xs font-semibold text-red-600">
											⚠️ This consent will not work with Opey chat - anonymous session will be used
											instead
										</span>
									{/if}
									{#if (consent as any).opey_validation}
										<br />
										<span class="text-xs text-gray-500">
											Opey validation: {(consent as any).opey_validation.tested_at
												? new Date((consent as any).opey_validation.tested_at).toLocaleString()
												: 'Unknown time'}
										</span>
									{/if}
								</p>
								<p class="text-gray-700 dark:text-gray-300">
									<strong>Consumer ID:</strong>
									{consent.consumer_id}
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
									<strong>Roles:</strong>
									{formatRoles(consent.jwt_payload?.entitlements || [])}
								</p>
								<p class="text-gray-700 dark:text-gray-300">
									<strong>Views:</strong>
									{formatViews(consent.jwt_payload?.views || [])}
								</p>
								<p class="text-gray-700 dark:text-gray-300">
									<strong>JWT Expires (UTC):</strong>
									<span
										class:text-red-600={isJwtExpired(consent)}
										class:text-green-600={!isJwtExpired(consent)}
									>
										{formatJwtExpiration(consent)}
									</span>
									{#if isJwtExpired(consent)}
										<span class="ml-2 font-medium text-red-600">(EXPIRED)</span>
									{:else}
										<span class="ml-2 font-medium text-green-600">(ACTIVE)</span>
									{/if}
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
	{:else}
		<div class="mx-auto my-5 max-w-screen-xl rounded-lg bg-gray-100 p-6 shadow-md dark:bg-gray-800">
			<p class="text-center text-gray-700 dark:text-gray-300">No Opey consents found.</p>
		</div>
	{/if}
</div>

<!-- Other Consents Section -->
<div>
	<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Other Consents</h2>
	{#if data.otherConsents && data.otherConsents.length > 0}
		<ul class="list-none pl-5">
			{#each data.otherConsents as consent (consent.consent_id)}
				{@const jwtStatus = getJWTStatus(consent)}
				<li>
					<div
						class="mx-auto my-5 max-w-screen-xl rounded-lg bg-gray-100 p-6 shadow-md dark:bg-gray-800"
					>
						<div class="mb-4">
							<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
								{consent.consent_id}
							</h3>
							<div class="mt-2 space-y-1 text-sm">
								<p class="text-gray-900 dark:text-gray-100">
									<strong>Status:</strong>
									{consent.status}
								</p>
								<p class="text-gray-900 dark:text-gray-100">
									<strong>JWT Status:</strong>
									<span class="inline-block rounded px-2 py-1 text-xs {jwtStatus.class}">
										{jwtStatus.status}
									</span>
									<br />
									<span class="text-sm text-gray-600">{jwtStatus.message}</span>
									{#if jwtStatus.expiresAt}
										<br />
										<span class="text-xs text-gray-500"
											>Expires: {jwtStatus.expiresAt.toLocaleString()}</span
										>
									{/if}
								</p>
								<p class="text-gray-700 dark:text-gray-300">
									<strong>Consumer ID:</strong>
									{consent.consumer_id}
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
								<p class="text-gray-700 dark:text-gray-300">
									<strong>JWT Expires (UTC):</strong>
									<span
										class:text-red-600={isJwtExpired(consent)}
										class:text-green-600={!isJwtExpired(consent)}
									>
										{formatJwtExpiration(consent)}
									</span>
									{#if isJwtExpired(consent)}
										<span class="ml-2 font-medium text-red-600">(EXPIRED)</span>
									{:else}
										<span class="ml-2 font-medium text-green-600">(ACTIVE)</span>
									{/if}
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
	{:else}
		<div class="mx-auto my-5 max-w-screen-xl rounded-lg bg-gray-100 p-6 shadow-md dark:bg-gray-800">
			<p class="text-center text-gray-700 dark:text-gray-300">No other consents found.</p>
		</div>
	{/if}
</div>
