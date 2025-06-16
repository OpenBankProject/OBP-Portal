<script lang="ts">
	const imgSrc =
		'https://images.unsplash.com/photo-1463171515643-952cee54d42a?q=80&w=450&h=190&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
</script>

<div
	class="card preset-filled-surface-100-900 border-surface-200-800 divide-surface-200-800 mx-auto my-10 flex max-w-md flex-col divide-y border-[1px] shadow-lg sm:max-w-2xl lg:max-w-3xl"
>
	<header>
		<h1 class="h4 text-center">Register a consumer</h1>
	</header>
	<article class="space-y-4 p-4">
		<form class="mx-auto w-full max-w-md space-y-4" method="POST">
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

            <button type="submit" aria-label="submit" class="btn preset-outline-primary w-full">Submit</button>
		</form>
	</article>
	<footer class="flex items-center justify-between gap-4 p-4">
		<small class="opacity-60">By Alex</small>
		<small class="opacity-60">On {new Date().toLocaleDateString()}</small>
	</footer>
</div>
