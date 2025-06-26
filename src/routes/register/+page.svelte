<script lang="ts">
	
</script>

<div
	class="card preset-filled-surface-100-900 border-surface-200-800 divide-surface-200-800 mx-auto my-10 flex max-w-md flex-col divide-y border-[1px] shadow-lg sm:max-w-2xl lg:max-w-3xl"
>
	<header class="py-4">
		<h1 class="h4 text-center">Register for the Open Bank Project</h1>
	</header>
	<article class="space-y-4 p-4">
		<form class="mx-auto w-full max-w-md space-y-6" method="POST">
			<label class="label">
				<span class="label-text">Application Type</span>
				<select class="select" name="app_type" required>
					<option value="public">Public</option>
					<option value="confidential">Confidential</option>
				</select>
			</label>

			<!-- --- -->
			<label class="label">
				<span class="label-text">Application Name</span>
				<input type="text" class="input" name="app_name" placeholder="Enter Application Name" required/>
			</label>
			<!-- --- -->
			<label class="label">
				<span class="label-text">Redirect Url</span>
				<input type="url" class="input" name="redirect_url" placeholder="i.e. http://localhost:8080/callback" />
			</label>
			<!-- this should be automatically filled out if the user is registered -->
			<label class="label">
				<span class="label-text">Developer Email</span>
				<input type="email" class="input" name="developer_email" placeholder="john@example.com" required/>
			</label>
			<!-- --- -->
			<label class="label">
				<span class="label-text">Description</span>
				<textarea class="input" name="description" placeholder="Enter a short description of the application..." required></textarea>
			</label>

            <label class="label">
				<span class="label-text text-left">Company</span>
				<input type="text" class="input" name="company" placeholder="Enter Company Name" required/>
			</label>

            <button type="submit" aria-label="submit" class="btn preset-filled-primary-500 w-full mt-5">Submit</button>
		</form>
	</article>
</div>
