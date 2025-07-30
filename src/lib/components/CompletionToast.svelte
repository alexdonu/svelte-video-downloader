<script lang="ts">
  import { removeFromQueueOnly } from "$lib/utils/api";

  export let show = false;
  export let downloadId = "";
  export let title = "";
  export let message = "";

  let timeLeft = 5; // 5 seconds countdown
  let progressWidth = 100;
  let countdown: number | null = null;

  // Start countdown when toast is shown
  $: if (show && !countdown) {
    startCountdown();
  }

  function startCountdown() {
    countdown = setInterval(() => {
      timeLeft -= 0.1;
      progressWidth = (timeLeft / 5) * 100;

      if (timeLeft <= 0) {
        autoRemove();
      }
    }, 100);
  }

  function stopCountdown() {
    if (countdown) {
      clearInterval(countdown);
      countdown = null;
    }
  }

  function autoRemove() {
    stopCountdown();
    removeFromQueueOnly(downloadId);
    closeToast();
  }

  function keepInQueue() {
    stopCountdown();
    closeToast();
  }

  function closeToast() {
    show = false;
    timeLeft = 5;
    progressWidth = 100;
  }

  // Cleanup on destroy
  function cleanup() {
    stopCountdown();
  }
</script>

<svelte:window on:beforeunload={cleanup} />

{#if show}
  <div class="fixed top-4 right-4 z-50 animate-slide-in">
    <div
      class="bg-white border-l-4 border-green-500 rounded-lg shadow-lg p-4 max-w-sm"
    >
      <!-- Header -->
      <div class="flex items-start justify-between mb-2">
        <div class="flex items-start gap-2 min-w-0 flex-1">
          <div class="text-green-500 text-xl flex-shrink-0">✅</div>
          <div class="min-w-0 flex-1">
            <h4 class="font-semibold text-gray-800 text-sm">
              Download Complete
            </h4>
            <p class="text-xs text-gray-600 break-words line-clamp-2">
              {title}
            </p>
          </div>
        </div>
        <button
          on:click={closeToast}
          class="text-gray-400 hover:text-gray-600 ml-2"
          aria-label="Close"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Message -->
      <p class="text-sm text-gray-700 mb-3">{message}</p>

      <!-- Progress Bar -->
      <div class="mb-3">
        <div class="bg-gray-200 rounded-full h-1 overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-100 ease-linear"
            style="width: {progressWidth}%"
          ></div>
        </div>
        <p class="text-xs text-gray-500 mt-1 text-center">
          Auto-removing from queue in {timeLeft.toFixed(1)}s<br />
          <span class="text-green-600">✓ Downloaded file will be kept</span>
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2">
        <button
          on:click={keepInQueue}
          class="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded text-xs font-medium hover:bg-gray-200 transition-colors"
        >
          Keep in Queue
        </button>
        <button
          on:click={autoRemove}
          class="flex-1 px-3 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
        >
          Remove from Queue
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  @keyframes slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .animate-slide-in {
    animation: slide-in 0.3s ease-out;
  }

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
