import { io, Socket } from "socket.io-client";
import {
  downloadsStore,
  progressStore,
  statusStore,
} from "$lib/stores/downloads";
import type { DownloadFile, VideoInfo } from "$lib/stores/downloads";

// Dynamic API base - works for both localhost and network access
const getApiBase = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:3000/api`;
};

const getSocketUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  return `${protocol}//${hostname}:3000`;
};

let socket: Socket | null = null;

// Connect to Socket.IO
export function connectSocket(): void {
  socket = io(getSocketUrl());

  socket.on("download-progress", (data: any) => {
    if (data.status === "downloading") {
      progressStore.update((store) => ({
        ...store,
        progress: data.progress,
        speed: data.speed || "",
        eta: data.eta || "",
      }));
    } else if (data.status === "completed") {
      progressStore.update((store) => ({
        ...store,
        progress: 100,
        speed: "",
        eta: "",
      }));
      statusStore.set({
        message: "Download completed successfully! 🎉",
        type: "success",
      });
      // Refresh downloads list
      loadDownloads();
    } else if (data.status === "error") {
      statusStore.set({
        message: `Download failed: ${data.message}`,
        type: "error",
      });
    }
  });

  socket.on("connect", () => {
    console.log("Connected to server");
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
  });
}

// Get video info
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const response = await fetch(`${getApiBase()}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get video info");
  }

  return response.json();
}

// Download video
export async function downloadVideo(
  url: string
): Promise<{ downloadId: string; status: string }> {
  const response = await fetch(`${getApiBase()}/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to start download");
  }

  return response.json();
}

// Load downloads list
export async function loadDownloads(): Promise<void> {
  try {
    const response = await fetch(`${getApiBase()}/downloads`);

    if (!response.ok) {
      throw new Error("Failed to load downloads");
    }

    const files: DownloadFile[] = await response.json();
    downloadsStore.set(files);
  } catch (error) {
    console.error("Failed to load downloads:", error);
    statusStore.set({
      message: `Failed to load downloads: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      type: "error",
    });
  }
}

// Open file in folder
export async function openInFolder(
  filename: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiBase()}/open-folder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to open folder");
  }

  return response.json();
}

// Delete file
export async function deleteFile(
  filename: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${getApiBase()}/delete-file`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete file");
  }

  // Refresh downloads list after successful deletion
  await loadDownloads();

  return response.json();
}
