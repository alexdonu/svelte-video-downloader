<script lang="ts">
  import { videoInfoStore } from "$lib/stores/downloads";

  function formatDuration(seconds: number): string {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
</script>

{#if $videoInfoStore}
  <div class="mb-8 bg-gray-50 rounded-xl p-6">
    <h3
      class="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2"
    >
      📹 Video Information
    </h3>

    <div class="space-y-3">
      <div class="flex justify-between items-start">
        <span class="font-medium text-gray-600">Title:</span>
        <span class="text-gray-800 text-right max-w-md">
          {$videoInfoStore.title || "Unknown"}
        </span>
      </div>

      <div class="flex justify-between">
        <span class="font-medium text-gray-600">Duration:</span>
        <span class="text-gray-800">
          {formatDuration($videoInfoStore.duration)}
        </span>
      </div>

      <div class="flex justify-between">
        <span class="font-medium text-gray-600">Uploader:</span>
        <span class="text-gray-800">
          {$videoInfoStore.uploader || "Unknown"}
        </span>
      </div>

      <div class="flex justify-between">
        <span class="font-medium text-gray-600">Formats:</span>
        <span class="text-gray-800">
          {$videoInfoStore.formats} available
        </span>
      </div>
    </div>
  </div>
{/if}
