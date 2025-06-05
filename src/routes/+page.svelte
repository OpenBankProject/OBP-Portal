<script lang="ts">
    let { data } = $props();
    let name = data.username || 'Guest';

</script>

<h1>Hi there {name}</h1>