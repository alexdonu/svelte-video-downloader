<script lang="ts">
  import { onMount } from "svelte";
  import VideoForm from "$lib/components/VideoForm.svelte";
  import VideoInfo from "$lib/components/VideoInfo.svelte";
  import ProgressBar from "$lib/components/ProgressBar.svelte";
  import DownloadsList from "$lib/components/DownloadsList.svelte";
  import StatusMessage from "$lib/components/StatusMessage.svelte";
  import { connectSocket } from "$lib/utils/api";

  onMount(() => {
    // Connect to Socket.IO for real-time updates
    connectSocket();
  });
</script>

<svelte:head>
  <title>Video Downloader</title>
  <meta
    name="description"
    content="Download videos from Dailymotion, YouTube, and more"
  />
</svelte:head>

<div
  class="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-5"
>
  <div class="mx-auto max-w-4xl">
    <!-- Header -->
    <div
      class="bg-gradient-to-r from-blue-400 to-cyan-400 rounded-t-3xl p-8 text-center text-white"
    >
      <h1 class="text-4xl font-bold mb-3">🎬 Video Downloader</h1>
      <p class="text-lg opacity-90">
        Download videos from Dailymotion, YouTube, and more
      </p>
    </div>

    <!-- Main Content -->
    <div class="bg-white rounded-b-3xl shadow-2xl p-8">
      <!-- Status Message -->
      <StatusMessage />

      <!-- Video Form -->
      <VideoForm />

      <!-- Video Info Display -->
      <VideoInfo />

      <!-- Progress Bar -->
      <ProgressBar />

      <!-- Downloads List -->
      <DownloadsList />
    </div>
  </div>
</div>
