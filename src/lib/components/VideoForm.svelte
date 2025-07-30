<script lang="ts">
  import { downloadVideo } from "$lib/utils/api";
  import { statusStore } from "$lib/stores/downloads";

  let videoUrl = "";
  let customFilename = "";
  let isDownloading = false;

  async function handleDownload() {
    if (!videoUrl.trim()) {
      statusStore.set({ message: "Please enter a video URL", type: "error" });
      return;
    }

    isDownloading = true;
    try {
      await downloadVideo(videoUrl, customFilename.trim() || undefined);
      statusStore.set({ message: "Added to download queue", type: "success" });
      videoUrl = ""; // Clear the input after adding to queue
      customFilename = ""; // Clear the filename input
    } catch (error) {
      statusStore.set({
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    } finally {
      isDownloading = false;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter") {
      handleDownload();
    }
  }
</script>

<div class="mb-8">
  <!-- URL Input -->
  <div class="mb-6">
    <label
      for="videoUrl"
      class="block text-lg font-semibold text-gray-700 mb-3"
    >
      Video URL
    </label>
    <input
      id="videoUrl"
      type="url"
      bind:value={videoUrl}
      on:keypress={handleKeyPress}
      placeholder="Paste your video URL here..."
      class="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-base bg-gray-50
			   focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2
			   focus:ring-blue-100 transition-all duration-300"
    />
  </div>

  <!-- Custom Filename Input -->
  <div class="mb-6">
    <label
      for="customFilename"
      class="block text-lg font-semibold text-gray-700 mb-3"
    >
      Custom Filename <span class="text-sm font-normal text-gray-500">(optional)</span>
    </label>
    <input
      id="customFilename"
      type="text"
      bind:value={customFilename}
      on:keypress={handleKeyPress}
      placeholder="Leave empty to use default filename from video..."
      class="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-base bg-gray-50
		   focus:outline-none focus:border-blue-400 focus:bg-white focus:ring-2
		   focus:ring-blue-100 transition-all duration-300"
    />
    <p class="text-xs text-gray-500 mt-2">
      💡 Don't include file extension - it will be added automatically
    </p>
  </div>

  <!-- Download Button -->
  <div class="text-center">
    <button
      on:click={handleDownload}
      disabled={isDownloading}
      class="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white
			   rounded-xl font-semibold transition-all duration-300
			   hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5
			   disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
			   flex items-center justify-center gap-2"
    >
      {#if isDownloading}
        <div
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        ></div>
      {/if}
      🎬 Add to Download Queue
    </button>
    <p class="text-sm text-gray-500 mt-2">
      Use the "📋 Info" button on each queue item to get video details
    </p>
  </div>
</div>