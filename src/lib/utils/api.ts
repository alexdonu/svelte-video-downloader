import { io, Socket } from "socket.io-client";
import {
  downloadsStore,
  statusStore,
  queueStore,
} from "$lib/stores/downloads";
import type { DownloadFile, VideoInfo, QueueStatus } from "$lib/stores/downloads";

// Dynamic API base - uses ngrok domain for external access
const getApiBase = () => {
  const hostname = window.location.hostname;
  
  // If running locally or on ngrok frontend, use static ngrok domain for API calls
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.ngrok-free.app')) {
    return 'https://splendid-bobcat-strictly.ngrok-free.app/api';
  }
  
  // For other hostnames, use dynamic detection
  const protocol = window.location.protocol;
  return `${protocol}//${hostname}:3000/api`;
};

const getSocketUrl = () => {
  const hostname = window.location.hostname;
  
  // If running locally or on ngrok frontend, use static ngrok domain for Socket.IO
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('.ngrok-free.app')) {
    return 'https://splendid-bobcat-strictly.ngrok-free.app';
  }
  
  // For other hostnames, use dynamic detection
  const protocol = window.location.protocol;
  return `${protocol}//${hostname}:3000`;
};

let socket: Socket | null = null;

// Connect to Socket.IO
export function connectSocket(): void {
  const socketUrl = getSocketUrl();
  
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    extraHeaders: {
      "ngrok-skip-browser-warning": "true"
    },
    // Add timeout and retry logic
    timeout: 20000,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });

  socket.on("download-progress", (data: any) => {
    
    // Update the queue item with progress data
    queueStore.update((queueStatus) => {
      const updatedQueue = queueStatus.queue.map((item) => {
        if (item.id === data.downloadId) {
          return {
            ...item,
            progress: data.progress || item.progress,
            speed: data.speed || item.speed,
            eta: data.eta || item.eta,
            status: data.status === "downloading" ? "downloading" : 
                   data.status === "completed" ? "completed" :
                   data.status === "error" ? "failed" : item.status
          };
        }
        return item;
      });
      
      return {
        ...queueStatus,
        queue: updatedQueue
      };
    });

    // Handle completion and errors
    if (data.status === "completed") {
      statusStore.set({
        message: "Download completed successfully! 🎉",
        type: "success",
      });
      // Downloads list will be refreshed by downloads-updated event
    } else if (data.status === "error") {
      statusStore.set({
        message: `Download failed: ${data.message}`,
        type: "error",
      });
    }
  });

  socket.on("connect", () => {
    statusStore.set({
      message: "Connected to server successfully!",
      type: "success",
    });
  });

  socket.on("disconnect", (reason) => {
    statusStore.set({
      message: `Connection lost: ${reason}`,
      type: "error",
    });
  });

  socket.on("connect_error", (error) => {
    statusStore.set({
      message: `Connection failed: ${error.message || "Please check your internet connection."}`,
      type: "error",
    });
  });

  socket.on("reconnect", (attemptNumber) => {
    statusStore.set({
      message: `Connection restored after ${attemptNumber} attempt${attemptNumber > 1 ? 's' : ''}!`,
      type: "success",
    });
  });

  socket.on("reconnect_error", (error) => {
    statusStore.set({
      message: `Failed to reconnect: ${error.message || "Please refresh the page."}`,
      type: "error",
    });
  });

  // Listen for queue updates
  socket.on("queue-update", (queueStatus: QueueStatus) => {
    queueStore.set(queueStatus);
  });

  // Listen for download completion events for toast notifications
  socket.on("download-completed", (data: any) => {
    // Dispatch custom event for toast notification
    window.dispatchEvent(new CustomEvent('download-completed', { detail: data }));
  });

  // Listen for downloads list updates
  socket.on("downloads-updated", () => {
    loadDownloads();
  });

  // Listen for file deletions
  socket.on("file-deleted", () => {
    loadDownloads();
  });

  // Listen for status messages from backend
  socket.on("status-message", (data: any) => {
    statusStore.set({
      message: data.message,
      type: data.type,
    });
  });
}

// Get video info
export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const response = await fetch(`${getApiBase()}/info`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get video info");
  }

  return response.json();
}

// Direct streaming download (new approach)
export async function downloadVideoStream(
  url: string,
  customFilename?: string,
  format?: string
): Promise<void> {
  // Check if running in browser
  if (typeof window === 'undefined') {
    throw new Error('Streaming downloads only work in browser environment');
  }

  try {
    const response = await fetch(`${getApiBase()}/download-stream`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true"
      },
      body: JSON.stringify({ url, customFilename, format }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to start download");
    }

    // Get filename from response headers
    const contentDisposition = response.headers.get('content-disposition');
    let filename = 'download';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    // Read the response as blob and trigger download
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    
    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);

  } catch (error) {
    throw error;
  }
}

// Download video (legacy queue approach - keeping for compatibility)
export async function downloadVideo(
  url: string,
  customFilename?: string,
  format?: string
): Promise<{ downloadId: string; status: string }> {
  const response = await fetch(`${getApiBase()}/download`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    },
    body: JSON.stringify({ url, customFilename, format }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to start download");
  }

  // Progress is now handled in the queue, no need to set old progress store

  return response.json();
}

// Load downloads list
export async function loadDownloads(): Promise<void> {
  try {
    const response = await fetch(`${getApiBase()}/downloads`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });
    
    if (!response.ok) {
      throw new Error("Failed to load downloads");
    }

    const files: DownloadFile[] = await response.json();
    downloadsStore.set(files);
  } catch (error) {
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
    headers: { 
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    },
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
    headers: { 
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true"
    },
    body: JSON.stringify({ filename }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to delete file");
  }

  // Downloads list will be refreshed by file-deleted event
  return response.json();
}

// Queue Management Functions

// Load queue status
export async function loadQueueStatus(): Promise<void> {
  try {
    const response = await fetch(`${getApiBase()}/queue`, {
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!response.ok) {
      throw new Error("Failed to load queue status");
    }

    const queueStatus: QueueStatus = await response.json();
    queueStore.set(queueStatus);
  } catch (error) {
    statusStore.set({
      message: `Failed to load queue status: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
    });
  }
}

// Pause download
export async function pauseDownload(downloadId: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/queue/pause/${downloadId}`, {
      method: "POST",
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!response.ok) {
      throw new Error("Failed to pause download");
    }

    return true;
  } catch (error) {
    statusStore.set({
      message: `Failed to pause download: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
    });
    return false;
  }
}

// Resume download
export async function resumeDownload(downloadId: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/queue/resume/${downloadId}`, {
      method: "POST",
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!response.ok) {
      throw new Error("Failed to resume download");
    }

    return true;
  } catch (error) {
    statusStore.set({
      message: `Failed to resume download: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
    });
    return false;
  }
}

// Cancel download
export async function cancelDownload(downloadId: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/queue/cancel/${downloadId}`, {
      method: "POST",
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!response.ok) {
      throw new Error("Failed to cancel download");
    }

    return true;
  } catch (error) {
    statusStore.set({
      message: `Failed to cancel download: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
    });
    return false;
  }
}

// Remove from queue
export async function removeFromQueue(downloadId: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/queue/${downloadId}`, {
      method: "DELETE",
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!response.ok) {
      throw new Error("Failed to remove from queue");
    }

    return true;
  } catch (error) {
    statusStore.set({
      message: `Failed to remove from queue: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
    });
    return false;
  }
}

// Clear completed downloads
export async function clearCompleted(): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/queue/clear-completed`, {
      method: "POST",
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!response.ok) {
      throw new Error("Failed to clear completed downloads");
    }

    return true;
  } catch (error) {
    statusStore.set({
      message: `Failed to clear completed: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
    });
    return false;
  }
}

// Set concurrent download limit
export async function setConcurrentLimit(limit: number): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/queue/concurrent-limit`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true" 
      },
      body: JSON.stringify({ limit })
    });

    if (!response.ok) {
      throw new Error("Failed to set concurrent limit");
    }

    return true;
  } catch (error) {
    statusStore.set({
      message: `Failed to set concurrent limit: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
    });
    return false;
  }
}

// Remove from queue only (without deleting files)
export async function removeFromQueueOnly(downloadId: string): Promise<boolean> {
  try {
    const response = await fetch(`${getApiBase()}/queue/remove-only/${downloadId}`, {
      method: "POST",
      headers: { "ngrok-skip-browser-warning": "true" }
    });

    if (!response.ok) {
      throw new Error("Failed to remove from queue");
    }

    return true;
  } catch (error) {
    statusStore.set({
      message: `Failed to remove from queue: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
    });
    return false;
  }
}
