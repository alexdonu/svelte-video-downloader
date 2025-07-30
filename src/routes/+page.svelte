<script lang="ts">
  import { onMount } from "svelte";
  import VideoForm from "$lib/components/VideoForm.svelte";
  import DownloadsList from "$lib/components/DownloadsList.svelte";
  import DownloadQueue from "$lib/components/DownloadQueue.svelte";
  import StatusMessage from "$lib/components/StatusMessage.svelte";
  import CompletionToast from "$lib/components/CompletionToast.svelte";
  import { connectSocket, loadQueueStatus } from "$lib/utils/api";

  // Toast state
  let showToast = false;
  let toastDownloadId = "";
  let toastTitle = "";
  let toastMessage = "";

  onMount(() => {
    // Connect to Socket.IO for real-time updates
    connectSocket();
    // Load initial queue status
    loadQueueStatus();

    // Listen for download completion events
    function handleDownloadCompleted(event: CustomEvent) {
      const { downloadId, title, message } = event.detail;
      toastDownloadId = downloadId;
      toastTitle = title;
      toastMessage = message;
      showToast = true;
    }

    window.addEventListener('download-completed', handleDownloadCompleted as EventListener);

    return () => {
      window.removeEventListener('download-completed', handleDownloadCompleted as EventListener);
    };
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
        Download videos from YouTube, TikTok and more
      </p>
    </div>

    <!-- Main Content -->
    <div class="bg-white rounded-b-3xl shadow-2xl p-8">
      <!-- Status Message -->
      <StatusMessage />

      <!-- Video Form -->
      <VideoForm />

      <!-- Download Queue -->
      <DownloadQueue />

      <!-- Downloads List -->
      <DownloadsList />
    </div>
  </div>
</div>

<!-- Completion Toast -->
<CompletionToast 
  bind:show={showToast}
  downloadId={toastDownloadId}
  title={toastTitle}
  message={toastMessage}
/>
