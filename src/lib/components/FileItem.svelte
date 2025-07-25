<script lang="ts">
  import { openInFolder, deleteFile } from "$lib/utils/api";
  import { statusStore } from "$lib/stores/downloads";
  import type { DownloadFile } from "$lib/stores/downloads";

  export let file: DownloadFile;

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  async function handleOpenFolder(): Promise<void> {
    try {
      const result = await openInFolder(file.name);
      statusStore.set({
        message: result.message || "Opening folder...",
        type: "success",
      });
    } catch (error) {
      statusStore.set({
        message: `Error opening folder: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    }
  }

  async function handleDelete(): Promise<void> {
    const confirmed = confirm(
      `Are you sure you want to delete "${file.name}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteFile(file.name);
      statusStore.set({
        message: "File deleted successfully!",
        type: "success",
      });
    } catch (error) {
      statusStore.set({
        message: `Error deleting file: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      });
    }
  }
</script>

<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
  <!-- File Info -->
  <div class="flex-1 min-w-0 mr-4">
    <p class="font-medium text-gray-800 truncate">
      {file.name}
    </p>
    <p class="text-sm text-gray-500">
      {formatFileSize(file.size)}
    </p>
  </div>

  <!-- Action Buttons -->
  <div class="flex gap-2">
    <button
      on:click={handleOpenFolder}
      class="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium
				   hover:bg-purple-700 transition-colors duration-200 flex items-center gap-1"
      title="Open in Folder"
    >
      📁 Open in Folder
    </button>

    <button
      on:click={handleDelete}
      class="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium
				   hover:bg-red-700 transition-colors duration-200 flex items-center gap-1"
      title="Delete file"
    >
      🗑️ Delete
    </button>
  </div>
</div>
