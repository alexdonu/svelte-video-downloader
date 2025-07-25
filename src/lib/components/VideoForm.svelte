<script lang="ts">
  import { getVideoInfo, downloadVideo } from "$lib/utils/api";
  import {
    statusStore,
    videoInfoStore,
    progressStore,
  } from "$lib/stores/downloads";

  let videoUrl = "https://www.dailymotion.com/video/x9nem4c";
  let isGettingInfo = false;
  let isDownloading = false;

  async function handleGetInfo() {
    if (!videoUrl.trim()) {
      statusStore.set({ message: "Please enter a video URL", type: "error" });
      return;
    }

    isGettingInfo = true;
    try {
      const info = await getVideoInfo(videoUrl);
      videoInfoStore.set(info);
      statusStore.set({
        message: "Video information loaded successfully",
        type: "success",
      });
    } catch (error) {
      statusStore.set({
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    } finally {
      isGettingInfo = false;
    }
  }

  async function handleDownload() {
    if (!videoUrl.trim()) {
      statusStore.set({ message: "Please enter a video URL", type: "error" });
      return;
    }

    isDownloading = true;
    try {
      await downloadVideo(videoUrl);
      statusStore.set({ message: "Download started...", type: "info" });
      progressStore.set({ show: true, progress: 0, speed: "", eta: "" });
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

  <!-- Action Buttons -->
  <div class="flex gap-4">
    <button
      on:click={handleGetInfo}
      disabled={isGettingInfo}
      class="flex-1 px-6 py-4 bg-gray-100 text-gray-700 border-2 border-gray-200
				   rounded-xl font-semibold transition-all duration-300
				   hover:bg-gray-200 hover:border-gray-300 disabled:opacity-60
				   disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {#if isGettingInfo}
        <div
          class="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"
        ></div>
      {/if}
      Get Info
    </button>

    <button
      on:click={handleDownload}
      disabled={isDownloading}
      class="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white
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
      Download
    </button>
  </div>
</div>
