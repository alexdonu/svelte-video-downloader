<script lang="ts">
  import { onMount } from "svelte";
  import FileItem from "./FileItem.svelte";
  import { downloadsStore } from "$lib/stores/downloads";
  import { loadDownloads } from "$lib/utils/api";

  onMount(() => {
    loadDownloads();

    // Auto-refresh downloads every 30 seconds
    const interval = setInterval(loadDownloads, 30000);

    return () => clearInterval(interval);
  });
</script>

<div class="border-t border-gray-200 pt-8">
  <h3 class="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
    📁 Downloaded Files
  </h3>

  {#if $downloadsStore.length === 0}
    <div class="text-center py-12 text-gray-500">
      <div class="text-5xl mb-4 opacity-50">📂</div>
      <p>No downloads yet</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each $downloadsStore as file (file.name)}
        <FileItem {file} />
      {/each}
    </div>
  {/if}
</div>
