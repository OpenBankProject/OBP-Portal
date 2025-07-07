<script lang="ts">
	import LegalDocumentModal from '$lib/components/LegalDocumentModal.svelte';
	import type { PageProps } from './$types';
	import { Eye, EyeOff } from '@lucide/svelte';

	let { form }: PageProps = $props();

	let password = $state('');
	let repeatPassword = $state('');
	let termsAccepted = $state(false);
	let privacyAccepted = $state(false);
	let showPassword = $state(false);
	let passwordVisibilityType = $derived.by(() => (showPassword ? 'text' : 'password'));

	function checkPasswordAgainstPolicy(password: string): boolean {
		// Check if password meets policy: either strong (10+ chars with mixed case, numbers, special chars) or long (16-512 chars)
		if (password.length > 16 && password.length <= 512) {
			return true;
		}

		if (password.length >= 10) {
			const hasUpperCase = /[A-Z]/.test(password);
			const hasLowerCase = /[a-z]/.test(password);
			const hasNumbers = /\d/.test(password);
			const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

			return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars;
		}

		return false;
	}

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}

	function checkPasswordsMatching() {
		if (password !== repeatPassword) {
			return false;
		}
		return true;
	}

	let isPasswordValid = $derived(checkPasswordAgainstPolicy(password));
	let arePasswordsMatching = $derived(checkPasswordsMatching());

	function handleSubmit(event: Event) {
		if (!termsAccepted || !privacyAccepted) {
			event.preventDefault();
			alert('Please accept both the Terms of Service and Privacy Policy to continue.');
			return;
		}

		if (!arePasswordsMatching) {
			event.preventDefault();
			return;
		}

		if (!isPasswordValid) {
			event.preventDefault();
			return;
		}
	}

	function handleTermsAccept() {
		termsAccepted = true;
	}

	function handlePrivacyAccept() {
		privacyAccepted = true;
	}

	let canSubmit = $derived(
		termsAccepted && privacyAccepted && password === repeatPassword && password.length > 0
	);
</script>

<div
	class="card preset-filled-surface-100-900 border-surface-200-800 divide-surface-200-800 mx-auto my-10 flex max-w-md flex-col divide-y border-[1px] shadow-lg sm:max-w-2xl lg:max-w-3xl"
>
	<header class="py-4">
		<h1 class="h4 text-center">Register for the Open Bank Project</h1>
	</header>
	<article class="space-y-4 p-4">
		<form class="mx-auto w-full max-w-md space-y-6" method="POST">
			<!-- --- -->
			<label class="label">
				<span class="label-text">First Name</span>
				<input type="text" class="input" name="first_name" placeholder="Alfred" required />
			</label>
			<!-- --- -->
			<label class="label">
				<span class="label-text">Last Name</span>
				<input type="text" class="input" name="last_name" placeholder="Prufrock" required />
			</label>

			<label class="label">
				<span class="label-text">Email Address</span>
				<input
					type="email"
					class="input"
					name="email"
					placeholder="alfred.j.prufrock@example.com"
					required
				/>
			</label>
			<!-- --- -->
			<label class="label">
				<span class="label-text">Username</span>
				<input type="text" class="input" name="username" placeholder="coffeespoon123" required />
			</label>

			<label class="label">
				<span class="label-text text-left">Password</span>
				<div class="relative">
					<input
						type={passwordVisibilityType}
						class="input pr-10"
						name="password"
						bind:value={password}
						placeholder="Enter Password"
						required
					/>
					<button
						type="button"
						class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700"
						onclick={togglePasswordVisibility}
					>
						{#if showPassword}
							<EyeOff class="h-5 w-5" />
						{:else}
							<Eye class="h-5 w-5" />
						{/if}
					</button>
				</div>

				{#if password.length > 0 && !isPasswordValid}
					<p class="text-error-500 text-xs">
						Password must be at least 10 characters long with mixed case, numbers, and special
						characters, or between 16 and 512 characters long.
					</p>
				{/if}

				{#if password.length > 0 && repeatPassword.length > 0 && !arePasswordsMatching}
					<p class="text-error-500 text-xs">Passwords do not match!</p>
				{/if}
			</label>

			<label class="label">
				<span class="label-text text-left">Confirm Password</span>
				<div class="relative">
					<input
						type={passwordVisibilityType}
						class="input pr-10"
						name="repeat_password"
						bind:value={repeatPassword}
						placeholder="Confirm Password"
						required
					/>
					<button
						type="button"
						class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700"
						onclick={togglePasswordVisibility}
					>
						{#if showPassword}
							<EyeOff class="h-5 w-5" />
						{:else}
							<Eye class="h-5 w-5" />
						{/if}
					</button>
				</div>
			</label>

			<hr class="hr" />

			<div class="space-y-4">
				<p class="text-secondary-800-200 text-center text-sm">
					By registering, you must read and accept our legal documents:
				</p>

				<div class="space-y-3">
					<div
						class="flex items-center justify-between rounded-lg border p-3 {termsAccepted
							? 'border-green-200 bg-green-50'
							: 'border-gray-200 bg-gray-50'}"
					>
						<div class="flex items-center space-x-3">
							{#if termsAccepted}
								<svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									></path>
								</svg>
							{:else}
								<svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
										clip-rule="evenodd"
									></path>
								</svg>
							{/if}
							<span
								class="text-sm font-medium {termsAccepted ? 'text-green-700' : 'text-gray-700'}"
							>
								Terms of Service {termsAccepted ? '(Accepted)' : ''}
							</span>
						</div>
						<LegalDocumentModal
							title="Terms of Service"
							documentName="obp_terms_and_conditions"
							triggerText="Read & Accept"
							onAccept={handleTermsAccept}
							accepted={termsAccepted}
						/>
					</div>

					<div
						class="flex items-center justify-between rounded-lg border p-3 {privacyAccepted
							? 'border-green-200 bg-green-50'
							: 'border-gray-200 bg-gray-50'}"
					>
						<div class="flex items-center space-x-3">
							{#if privacyAccepted}
								<svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									></path>
								</svg>
							{:else}
								<svg class="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
										clip-rule="evenodd"
									></path>
								</svg>
							{/if}
							<span
								class="text-sm font-medium {privacyAccepted ? 'text-green-700' : 'text-gray-700'}"
							>
								Privacy Policy {privacyAccepted ? '(Accepted)' : ''}
							</span>
						</div>
						<LegalDocumentModal
							title="Privacy Policy"
							documentName="privacy_policy"
							triggerText="Read & Accept"
							onAccept={handlePrivacyAccept}
							accepted={privacyAccepted}
						/>
					</div>
				</div>
			</div>
			<hr class="hr" />
			{#if form?.error}
				<div class="text-error-500 text-center">
					<p>{form?.error}</p>
				</div>
			{/if}
			<button
				type="submit"
				disabled={!canSubmit}
				class="btn preset-filled-primary-500 mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
				aria-label="submit"
			>
				{#if !termsAccepted || !privacyAccepted}
					Please Accept Legal Documents
				{:else if password !== repeatPassword}
					Passwords Must Match
				{:else}
					Submit Registration
				{/if}
			</button>
		</form>
	</article>
</div>
