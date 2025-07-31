<script lang="ts">
  import { downloadVideo, downloadVideoStream } from "$lib/utils/api";
  import { statusStore } from "$lib/stores/downloads";

  let videoUrl = "";
  let customFilename = "";
  let isDownloading = false;
  let downloadMode = "queue"; // "queue" or "direct"

  async function handleDownload() {
    if (!videoUrl.trim()) {
      statusStore.set({ message: "Please enter a video URL", type: "error" });
      return;
    }

    isDownloading = true;
    try {
      if (downloadMode === "direct") {
        await downloadVideoStream(videoUrl, customFilename.trim() || undefined);
        statusStore.set({
          message: "Download started - check your browser's download folder",
          type: "success",
        });
      } else {
        await downloadVideo(videoUrl, customFilename.trim() || undefined);
        statusStore.set({
          message: "Added to download queue",
          type: "success",
        });
      }
      videoUrl = ""; // Clear the input after download/queue
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
      Custom Filename <span class="text-sm font-normal text-gray-500"
        >(optional)</span
      >
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

  <!-- Download Mode Selection -->
  <div class="mb-6">
    <label class="block text-lg font-semibold text-gray-700 mb-3">
      Download Mode
    </label>
    <div class="flex gap-4">
      <label class="flex items-center cursor-pointer">
        <input
          type="radio"
          bind:group={downloadMode}
          value="queue"
          class="sr-only"
        />
        <div
          class="flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200
                    {downloadMode === 'queue'
            ? 'border-blue-400 bg-blue-50 text-blue-700'
            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}"
        >
          <div
            class="w-4 h-4 rounded-full border-2 flex items-center justify-center
                      {downloadMode === 'queue'
              ? 'border-blue-400'
              : 'border-gray-300'}"
          >
            {#if downloadMode === "queue"}
              <div class="w-2 h-2 rounded-full bg-blue-400"></div>
            {/if}
          </div>
          <span class="font-medium">📋 Queue Mode</span>
        </div>
      </label>

      <label class="flex items-center cursor-pointer">
        <input
          type="radio"
          bind:group={downloadMode}
          value="direct"
          class="sr-only"
        />
        <div
          class="flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all duration-200
                    {downloadMode === 'direct'
            ? 'border-green-400 bg-green-50 text-green-700'
            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}"
        >
          <div
            class="w-4 h-4 rounded-full border-2 flex items-center justify-center
                      {downloadMode === 'direct'
              ? 'border-green-400'
              : 'border-gray-300'}"
          >
            {#if downloadMode === "direct"}
              <div class="w-2 h-2 rounded-full bg-green-400"></div>
            {/if}
          </div>
          <span class="font-medium">⬇️ Direct Download</span>
        </div>
      </label>
    </div>
    <p class="text-sm text-gray-600 mt-2">
      {#if downloadMode === "queue"}
        📋 <strong>Queue Mode:</strong> Downloads are managed on the server and stored
        in the downloads folder, if you are not owner, you don't have access to them
      {:else}
        ⬇️ <strong>Direct Download:</strong> Files download directly to your device's
        download folder
      {/if}
    </p>
  </div>

  <!-- Download Button -->
  <div class="text-center">
    <button
      on:click={handleDownload}
      disabled={isDownloading}
      class="w-full px-6 py-4 bg-gradient-to-r {downloadMode === 'direct'
        ? 'from-green-500 to-emerald-600'
        : 'from-indigo-500 to-purple-600'} text-white
			   rounded-xl font-semibold transition-all duration-300
			   {downloadMode === 'direct'
        ? 'hover:from-green-600 hover:to-emerald-700'
        : 'hover:from-indigo-600 hover:to-purple-700'} hover:shadow-lg hover:-translate-y-0.5
			   disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
			   flex items-center justify-center gap-2"
    >
      {#if isDownloading}
        <div
          class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
        ></div>
      {/if}
      {downloadMode === "direct"
        ? "⬇️ Download to Device"
        : "🎬 Add to Download Queue"}
    </button>
    <p class="text-sm text-gray-500 mt-2">
      Use the "📋 Info" button on each queue item to get video details
    </p>
  </div>
</div>
