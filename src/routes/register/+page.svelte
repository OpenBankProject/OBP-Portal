<script lang="ts">
	let password = $state('');
    let repeatPassword = $state('');

    function validatePasswords() {
        if (password !== repeatPassword) {
            alert('Passwords do not match!');
            return false;
        }
        return true;
    }
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
				<input type="text" class="input" name="first_name" placeholder="Alfred" required/>
			</label>
			<!-- --- -->
			<label class="label">
				<span class="label-text">Last Name</span>
				<input type="text" class="input" name="last_name" placeholder="Prufrock" required/>
			</label>
			<!-- this should be automatically filled out if the user is registered -->
			<label class="label">
				<span class="label-text">Email Address</span>
				<input type="email" class="input" name="developer_email" placeholder="alfred.j.prufrock@example.com" required/>
			</label>
			<!-- --- -->
			<label class="label">
				<span class="label-text">Username</span>
				<input type="text" class="input" name="username" placeholder="coffeespoon123" required/>
			</label>

            <label class="label">
				<span class="label-text text-left">Password</span>
				<input type="password" class="input" name="password" bind:value={password} placeholder="Enter Password" required/>
			</label>

            <label class="label">
				<span class="label-text text-left">Password</span>
				<input type="password" class="input" name="repeat_password" bind:value={repeatPassword} placeholder="Confirm Password" required/>
			</label>

            <hr class="hr" />
            <p class="text-center text-sm text-secondary-800-200">
                By registering, you agree to our <a href="/terms" class="text-primary-500 hover:underline">Terms of Service</a> and <a href="/privacy" class="text-primary-500 hover:underline">Privacy Policy</a>.
            </p>
            <label class="label text-center flex flex-row items-center justify-center">
                <p class="mr-5">I agree to the terms and conditions</p>
                <input type="checkbox" class="checkbox" name="terms" required />
            </label>
            <hr class="hr" />

            <button type="submit" aria-label="submit" class="btn preset-filled-primary-500 w-full mt-5">Submit</button>
		</form>
	</article>
</div>
