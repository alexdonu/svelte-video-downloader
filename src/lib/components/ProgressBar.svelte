<script lang="ts">
  import { progressStore } from "$lib/stores/downloads";
</script>

{#if $progressStore?.show}
  <div class="mb-8">
    <h3
      class="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2"
    >
      📊 Download Progress
    </h3>

    <!-- Progress Bar Container -->
    <div class="bg-gray-200 rounded-full h-5 mb-4 overflow-hidden">
      <div
        class="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all duration-500 ease-out"
        style="width: {$progressStore.progress || 0}%"
      ></div>
    </div>

    <!-- Progress Info -->
    <div class="flex justify-between text-sm text-gray-600">
      <span>{($progressStore.progress || 0).toFixed(1)}%</span>
      <span>{$progressStore.speed || ""}</span>
      <span>{$progressStore.eta ? `ETA: ${$progressStore.eta}` : ""}</span>
    </div>
  </div>
{/if}
