<script lang="ts">
    import { Navigation } from '@skeletonlabs/skeleton-svelte';

    let { data } = $props();
    let name = data.username || 'Guest';

</script>

<div class="card w-full max-w-lg preset-outlined-tertiary-100-900 p-4 text-center mx-auto my-10 divide-tertiary-50-950 divide-y">
    <header>
        <h1 class="h1 p-2">Chat With Opey</h1>
    </header>
    <article class="space-y-4 p-4 md:h-100 overflow-auto">
        <div>
          <h2 class="h6">Announcements</h2>
          <h3 class="h3">Skeleton is Awesome</h3>
        </div>
    </article>
    <footer>
        <input type="text" placeholder="Type your message here..." class="input w-full" />
        <button class="btn btn-primary w-full mt-2">Send</button>
    </footer>
</div>