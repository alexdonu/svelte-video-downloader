<script lang="ts">
  import type { VideoInfo, VideoFormat } from "$lib/stores/downloads";
  import { downloadVideo } from "$lib/utils/api";
  import { statusStore } from "$lib/stores/downloads";
  import { browser } from "$app/environment";

  export let isOpen = false;
  export let videoInfo: VideoInfo | null = null;
  export let loading = false;
  export let videoUrl = "";

  // Close function - will be set by parent
  export let onClose: () => void = () => {};

  let selectedFormat: VideoFormat | null = null;
  let isDownloading = false;

  function closeModal() {
    // Restore body scroll before closing
    if (browser) {
      document.body.style.overflow = '';
    }
    onClose();
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }

  function formatDuration(seconds: number): string {
    if (!seconds) return "Unknown";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  }

  function selectFormat(format: VideoFormat) {
    selectedFormat = format;
  }

  async function handleDownloadWithFormat() {
    if (!selectedFormat || !videoUrl) return;

    isDownloading = true;
    try {
      await downloadVideo(videoUrl, undefined, selectedFormat.format_id);
      statusStore.set({ 
        message: `Added to download queue with ${selectedFormat.resolution} (${selectedFormat.ext.toUpperCase()}) format`, 
        type: "success" 
      });
      closeModal();
    } catch (error) {
      statusStore.set({
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    } finally {
      isDownloading = false;
    }
  }

  // Cleanup on component destroy
  import { onDestroy } from 'svelte';
  
  onDestroy(() => {
    // Ensure body scroll is restored if component is destroyed while modal is open
    if (browser) {
      document.body.style.overflow = '';
    }
  });

  // Focus trap for accessibility
  let modalElement: HTMLElement;
  
  $: if (browser) {
    if (isOpen && modalElement) {
      modalElement.focus();
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = '';
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
    on:click={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-title"
  >
    <!-- Modal Content -->
    <div 
      bind:this={modalElement}
      class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-modal-in flex flex-col"
      tabindex="-1"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 id="modal-title" class="text-2xl font-bold text-gray-800 flex items-center gap-2">
          📺 Video Information
        </h2>
        <button 
          on:click={closeModal}
          class="p-2 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Close modal"
        >
          <svg class="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 overflow-y-auto flex-1 min-h-0">
        {#if loading}
          <div class="flex items-center justify-center py-12">
            <div class="text-center">
              <div class="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p class="text-gray-600">Loading video information...</p>
            </div>
          </div>
        {:else if videoInfo}
          <div class="space-y-6">
            <!-- Thumbnail -->
            {#if videoInfo.thumbnail}
              <div class="text-center">
                <img 
                  src={videoInfo.thumbnail} 
                  alt="Video thumbnail"
                  class="max-w-full h-auto rounded-lg shadow-md mx-auto"
                  style="max-height: 300px;"
                />
              </div>
            {/if}

            <!-- Video Details -->
            <div class="grid gap-4">
              <!-- Title -->
              <div class="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg">
                <h3 class="text-sm font-medium text-gray-500 mb-1">Title</h3>
                <p class="text-lg font-semibold text-gray-800 break-words">
                  {videoInfo.title}
                </p>
              </div>

              <!-- Duration and Uploader Row -->
              <div class="grid md:grid-cols-2 gap-4">
                <div class="bg-gray-50 p-4 rounded-lg">
                  <h3 class="text-sm font-medium text-gray-500 mb-1">Duration</h3>
                  <p class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    🕒 {formatDuration(videoInfo.duration)}
                  </p>
                </div>

                <div class="bg-gray-50 p-4 rounded-lg">
                  <h3 class="text-sm font-medium text-gray-500 mb-1">Uploader</h3>
                  <p class="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    👤 {videoInfo.uploader || "Unknown"}
                  </p>
                </div>
              </div>

              <!-- Available Formats -->
              <div class="bg-green-50 p-4 rounded-lg">
                <h3 class="text-sm font-medium text-gray-500 mb-3">Available Formats</h3>
                <p class="text-sm text-green-700 mb-4 flex items-center gap-2">
                  📹 {videoInfo.formatCount} format{videoInfo.formatCount !== 1 ? 's' : ''} available
                </p>
                
                {#if videoInfo.formats && videoInfo.formats.length > 0}
                  <div class="max-h-40 overflow-y-auto space-y-2">
                    {#each videoInfo.formats as format}
                      <button
                        type="button"
                        on:click={() => selectFormat(format)}
                        class="w-full text-left bg-white p-3 rounded border transition-all
                               {selectedFormat?.format_id === format.format_id 
                                 ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                                 : 'border-green-200 hover:border-green-300 hover:bg-green-25'}"
                      >
                        <div class="space-y-2">
                          <!-- Main format info - responsive layout -->
                          <div class="flex items-center flex-wrap gap-1 text-sm font-medium text-gray-800">
                            <span class="text-green-600 flex-shrink-0">{format.format_id}</span>
                            <span class="text-gray-400 flex-shrink-0">•</span>
                            <span class="flex-shrink-0">{format.ext.toUpperCase()}</span>
                            <span class="text-gray-400 flex-shrink-0">•</span>
                            <span class="flex-shrink-0">{format.resolution}</span>
                            {#if format.fps}
                              <span class="text-gray-400 flex-shrink-0">•</span>
                              <span class="flex-shrink-0">{format.fps}fps</span>
                            {/if}
                            {#if selectedFormat?.format_id === format.format_id}
                              <span class="text-blue-600 flex-shrink-0">✓ Selected</span>
                            {/if}
                          </div>
                          
                          <!-- Additional info in mobile-friendly layout -->
                          <div class="flex flex-col sm:flex-row sm:justify-between gap-1 text-xs text-gray-500">
                            <div class="space-y-1">
                              {#if format.format_note}
                                <div class="truncate">{format.format_note}</div>
                              {/if}
                              {#if format.filesize}
                                <div>Size: {(format.filesize / 1024 / 1024).toFixed(1)} MB</div>
                              {/if}
                            </div>
                            <div class="space-y-1 sm:text-right flex-shrink-0">
                              {#if format.vcodec && format.vcodec !== 'none'}
                                <div>Video: {format.vcodec}</div>
                              {/if}
                              {#if format.acodec && format.acodec !== 'none'}
                                <div>Audio: {format.acodec}</div>
                              {/if}
                              {#if format.tbr}
                                <div>{format.tbr}kbps</div>
                              {/if}
                            </div>
                          </div>
                        </div>
                      </button>
                    {/each}
                  </div>
                {:else}
                  <p class="text-sm text-gray-500">No format details available</p>
                {/if}
              </div>
            </div>
          </div>
        {:else}
          <div class="text-center py-12">
            <div class="text-6xl mb-4 opacity-50">❌</div>
            <p class="text-gray-600">Failed to load video information</p>
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="flex justify-between items-center gap-3 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        {#if selectedFormat && videoInfo}
          <div class="text-sm text-gray-600">
            Selected: <span class="font-medium text-blue-600">{selectedFormat.resolution} • {selectedFormat.ext.toUpperCase()}</span>
          </div>
        {:else}
          <div class="text-sm text-gray-500">Select a format to download</div>
        {/if}
        
        <div class="flex gap-3">
          <button 
            on:click={closeModal}
            class="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
          
          {#if selectedFormat && videoUrl}
            <button 
              on:click={handleDownloadWithFormat}
              disabled={isDownloading}
              class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {#if isDownloading}
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {/if}
              Download Selected Format
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes modal-in {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .animate-modal-in {
    animation: modal-in 0.2s ease-out;
  }
</style>