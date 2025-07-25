<script lang="ts">
  import { onMount } from "svelte";
  import { statusStore } from "$lib/stores/downloads";

  let timeoutId: ReturnType<typeof setTimeout>;

  $: if ($statusStore && $statusStore.type === "success") {
    // Auto-hide success messages after 5 seconds
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      statusStore.set(null);
    }, 5000);
  }

  onMount(() => {
    return () => {
      clearTimeout(timeoutId);
    };
  });

  function getStatusClasses(type: string): string {
    const baseClasses = "p-4 rounded-lg mb-6 border";

    switch (type) {
      case "success":
        return `${baseClasses} bg-green-50 text-green-800 border-green-200`;
      case "error":
        return `${baseClasses} bg-red-50 text-red-800 border-red-200`;
      case "info":
        return `${baseClasses} bg-blue-50 text-blue-800 border-blue-200`;
      default:
        return `${baseClasses} bg-gray-50 text-gray-800 border-gray-200`;
    }
  }
</script>

{#if $statusStore}
  <div class={getStatusClasses($statusStore.type)}>
    {$statusStore.message}
  </div>
{/if}
