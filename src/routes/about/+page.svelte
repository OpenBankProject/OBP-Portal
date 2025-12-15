<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';

	let htmlContent = $state('');

	// Default markdown content if environment variable is not set
	const defaultMarkdown = `# About OBP Portal

## What is OBP Portal?

The Open Bank Project (OBP) Portal is a comprehensive developer portal that provides access to banking APIs and tools for building financial applications. It serves as the gateway for developers, fintech companies, and financial institutions to explore, integrate, and leverage open banking capabilities.

## Key Features

- API Explorer for testing and discovering banking APIs
- Consumer management and API key generation
- User account management and authentication
- Comprehensive documentation and guides
- OAuth2 compliance and security features
- Developer tools and resources

## About Open Bank Project

The Open Bank Project is an open source API and App store for banks that empowers financial institutions to securely and rapidly enhance their digital offerings using an ecosystem of 3rd party applications and services. The project provides a RESTful API that allows developers to build financial applications on top of banking data.

## Technology

This portal is built with modern web technologies including SvelteKit, TypeScript, and Skeleton UI. It follows best practices for security, accessibility, and user experience.

## Get Involved

The Open Bank Project is an open source initiative. You can contribute to the project, report issues, or explore the codebase on our [GitHub repository](https://github.com/OpenBankProject).

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

## Contact & Support

For questions, support, or more information about the Open Bank Project, please visit:

- [Official Website](https://www.openbankproject.com)
- [GitHub Organization](https://github.com/OpenBankProject)

---

© TESOBE 2011-2025. All rights reserved.`;

	onMount(async () => {
		// Dynamically import markdown-it to avoid SSR issues
		const MarkdownIt = (await import('markdown-it')).default;
		const md = new MarkdownIt({
			html: true,
			linkify: true,
			typographer: true
		});

		// Get markdown content from environment variable or use default
		const markdownContent = env.PUBLIC_ABOUT_TEXT || defaultMarkdown;

		// Render markdown to HTML
		htmlContent = md.render(markdownContent);
	});
</script>

<svelte:head>
	<title>About - OBP Portal</title>
	<meta name="description" content="About Open Bank Project Portal" />
</svelte:head>

<div class="flex flex-col space-y-6 p-4">
	<div class="mx-auto w-full max-w-4xl">
		{#if htmlContent}
			<div class="prose prose-lg max-w-none dark:prose-invert">
				{@html htmlContent}
			</div>
		{:else}
			<div class="flex items-center justify-center py-8">
				<p class="text-surface-600-400">Loading...</p>
			</div>
		{/if}
	</div>
</div>