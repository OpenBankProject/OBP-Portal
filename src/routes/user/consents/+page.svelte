<script lang="ts">
    let { data } = $props();


</script>

<h1>This is the consents page</h1>

<p>Here you can manage your consents.</p>

<ul class="list-none pl-5">
    {#each data.consents as consent (consent.consent_id)}
        <li>
            <div class="max-w-screen-xl flex flex-wrap justify-between mx-auto p-4 bg-gray-100 rounded-lg shadow-md my-5">   
                <form method="post" action="?/delete">
                    <input type="hidden" name="consent_id" value={consent.consent_id} />
                    <h2>{consent.consent_id}</h2>
                    <p>{consent.status}</p>
                    <button type="submit" class="text-red-500 hover:text-red-700">Delete Consent</button>
                </form>
            </div>
        </li>
    {/each}
</ul>