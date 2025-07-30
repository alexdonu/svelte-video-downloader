<script lang="ts">
  import { onMount } from "svelte";
  import { queueStore, statusStore } from "$lib/stores/downloads";
  import { 
    loadQueueStatus, 
    pauseDownload, 
    resumeDownload, 
    cancelDownload, 
    removeFromQueue,
    removeFromQueueOnly,
    clearCompleted,
    setConcurrentLimit,
    getVideoInfo
  } from "$lib/utils/api";
  import VideoInfoModal from "./VideoInfoModal.svelte";
  import type { QueueItem, VideoInfo } from "$lib/stores/downloads";

  // Modal state
  let showModal = false;
  let modalVideoInfo: VideoInfo | null = null;
  let modalLoading = false;
  let currentModalUrl = "";

  // Store video info for each queue item
  let videoInfoCache: { [downloadId: string]: VideoInfo | null } = {};

  onMount(() => {
    loadQueueStatus();
  });

  function getStatusIcon(status: string): string {
    switch (status) {
      case "queued": return "⏳";
      case "downloading": return "⬇️";
      case "paused": return "⏸️";
      case "completed": return "✅";
      case "failed": return "❌";
      case "cancelled": return "🚫";
      default: return "❓";
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "queued": return "text-yellow-600";
      case "downloading": return "text-blue-600";
      case "paused": return "text-orange-600";
      case "completed": return "text-green-600";
      case "failed": return "text-red-600";
      case "cancelled": return "text-gray-600";
      default: return "text-gray-500";
    }
  }

  function formatDate(date: Date): string {
    return new Date(date).toLocaleTimeString();
  }

  function handlePause(downloadId: string) {
    pauseDownload(downloadId);
  }

  function handleResume(downloadId: string) {
    resumeDownload(downloadId);
  }

  function handleCancel(downloadId: string) {
    cancelDownload(downloadId);
  }

  function handleRemove(downloadId: string) {
    removeFromQueue(downloadId);
  }

  function handleRemoveCompleted(downloadId: string) {
    removeFromQueueOnly(downloadId);
  }

  function handleClearCompleted() {
    clearCompleted();
  }

  let newConcurrentLimit = 3;
  let initialized = false;
  
  // Initialize newConcurrentLimit from queue store only once
  $: if ($queueStore.maxConcurrent && !initialized) {
    newConcurrentLimit = $queueStore.maxConcurrent;
    initialized = true;
  }
  
  function handleSetConcurrentLimit() {
    setConcurrentLimit(newConcurrentLimit);
  }

  // Get video info for a specific queue item
  async function handleGetVideoInfo(item: QueueItem) {
    // Open modal first and set URL
    showModal = true;
    currentModalUrl = item.url;
    
    if (videoInfoCache[item.id]) {
      // Already have info, show it in modal
      modalVideoInfo = videoInfoCache[item.id];
      modalLoading = false;
      return;
    }

    // Show loading state in modal
    modalLoading = true;
    modalVideoInfo = null;

    try {
      const info = await getVideoInfo(item.url);
      videoInfoCache[item.id] = info;
      modalVideoInfo = info;
      modalLoading = false;

      statusStore.set({
        message: "Video information loaded successfully! 📋",
        type: "success",
      });
    } catch (error) {
      modalLoading = false;
      modalVideoInfo = null;
      
      statusStore.set({
        message: `Failed to get video info: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    }
  }

  // Handle modal close
  function handleModalClose() {
    showModal = false;
    modalVideoInfo = null;
    modalLoading = false;
    currentModalUrl = "";
  }
</script>

<div class="border-t border-gray-200 pt-8">
  <div class="flex items-center justify-between mb-6">
    <h3 class="text-xl font-semibold text-gray-800 flex items-center gap-2">
      📋 Download Queue
    </h3>
    
    <div class="flex items-center gap-4">
      <!-- Concurrent Downloads Setting -->
      <div class="flex items-center gap-2 text-sm">
        <label for="concurrent-limit" class="text-gray-600">
          Max concurrent:
        </label>
        <select 
          id="concurrent-limit"
          bind:value={newConcurrentLimit}
          on:change={handleSetConcurrentLimit}
          class="px-2 py-1 border border-gray-300 rounded text-sm"
        >
          {#each [1, 2, 3, 4, 5] as limit}
            <option value={limit}>{limit}</option>
          {/each}
        </select>
      </div>

      <!-- Clear Completed Button -->
      <button
        on:click={handleClearCompleted}
        class="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
      >
        Clear Completed
      </button>
    </div>
  </div>

  <!-- Queue Stats -->
  <div class="mb-4 p-3 bg-gray-50 rounded-lg">
    <div class="flex items-center justify-between text-sm text-gray-600">
      <span>Active Downloads: {$queueStore.activeCount}/{$queueStore.maxConcurrent}</span>
      <span>Total in Queue: {$queueStore.queue.length}</span>
    </div>
  </div>

  <!-- Queue Items -->
  {#if $queueStore.queue.length === 0}
    <div class="text-center py-12 text-gray-500">
      <div class="text-5xl mb-4 opacity-50">📋</div>
      <p>No downloads in queue</p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each $queueStore.queue as item (item.id)}
        <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <!-- Header with title and controls -->
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <span class="text-2xl">{getStatusIcon(item.status)}</span>
              <div class="min-w-0 flex-1">
                <div class="font-medium text-gray-800 truncate">
                  {item.title || "Processing..."}
                </div>
                <div class="text-sm text-gray-500">
                  Added: {formatDate(item.addedAt)}
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2 ml-4">
              <span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 {getStatusColor(item.status)} whitespace-nowrap">
                {item.status.toUpperCase()}
              </span>
            </div>
          </div>

          <!-- Progress Bar (for downloading items) -->
          {#if item.status === "downloading"}
            <div class="mb-3">
              <div class="bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full transition-all duration-500"
                  style="width: {item.progress || 0}%"
                ></div>
              </div>
              <div class="flex justify-between text-xs text-gray-600 mt-1">
                <span>{(item.progress || 0).toFixed(1)}%</span>
                <span>{item.speed || ""}</span>
                <span>{item.eta ? `ETA: ${item.eta}` : ""}</span>
              </div>
            </div>
          {/if}

          <!-- Action Buttons Row -->
          <div class="flex items-center justify-between">
            <div class="flex gap-2">
              <!-- Get Info Button -->
              <button
                on:click={() => handleGetVideoInfo(item)}
                class="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors flex items-center gap-1"
                title="Get Video Info"
              >
                📋 Info
              </button>
              
              <!-- Control Buttons -->
              {#if item.status === "downloading"}
                <button
                  on:click={() => handlePause(item.id)}
                  class="px-3 py-1.5 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors flex items-center gap-1"
                  title="Pause"
                >
                  ⏸️ Pause
                </button>
              {/if}
              
              {#if item.status === "paused"}
                <button
                  on:click={() => handleResume(item.id)}
                  class="px-3 py-1.5 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors flex items-center gap-1"
                  title="Resume"
                >
                  ▶️ Resume
                </button>
              {/if}
              
              {#if ["downloading", "paused", "queued"].includes(item.status)}
                <button
                  on:click={() => handleCancel(item.id)}
                  class="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors flex items-center gap-1"
                  title="Cancel"
                >
                  🚫 Cancel
                </button>
              {/if}
              
              {#if item.status === "completed"}
                <button
                  on:click={() => handleRemoveCompleted(item.id)}
                  class="px-3 py-1.5 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors flex items-center gap-1"
                  title="Remove from queue (keeps downloaded file)"
                >
                  📋 Remove from Queue
                </button>
              {:else if ["failed", "cancelled"].includes(item.status)}
                <button
                  on:click={() => handleRemove(item.id)}
                  class="px-3 py-1.5 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors flex items-center gap-1"
                  title="Remove and delete partial files"
                >
                  🗑️ Delete & Remove
                </button>
              {/if}
            </div>
          </div>

          <!-- Error Message -->
          {#if item.status === "failed" && item.error}
            <div class="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              <strong>Error:</strong> {item.error}
            </div>
          {/if}

          <!-- URL -->
          <div class="text-xs text-gray-400 truncate mt-2 pt-2 border-t border-gray-100">
            URL: {item.url}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Video Info Modal -->
<VideoInfoModal 
  bind:isOpen={showModal}
  bind:videoInfo={modalVideoInfo}
  bind:loading={modalLoading}
  videoUrl={currentModalUrl}
  onClose={handleModalClose}
/>