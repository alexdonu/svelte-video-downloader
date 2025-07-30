import { writable } from "svelte/store";

// Type definitions
export interface DownloadFile {
  name: string;
  size: number;
  modified: string;
}

export interface VideoFormat {
  format_id: string;
  ext: string;
  resolution: string;
  filesize?: number;
  vcodec?: string;
  acodec?: string;
  format_note?: string;
  quality?: number;
  fps?: number;
  tbr?: number;
}

export interface VideoInfo {
  title: string;
  duration: number;
  uploader: string;
  thumbnail?: string;
  formats: VideoFormat[];
  formatCount: number;
}

export interface StatusMessage {
  message: string;
  type: "success" | "error" | "info";
}

export interface ProgressData {
  show: boolean;
  progress: number;
  speed: string;
  eta: string;
}

export interface QueueItem {
  id: string;
  url: string;
  format: string;
  status: "queued" | "downloading" | "paused" | "completed" | "failed" | "cancelled";
  addedAt: Date;
  progress: number;
  speed: string;
  eta: string;
  title: string;
  error: string | null;
}

export interface QueueStatus {
  queue: QueueItem[];
  activeCount: number;
  maxConcurrent: number;
}

// Downloads list store
export const downloadsStore = writable<DownloadFile[]>([]);

// Status message store
export const statusStore = writable<StatusMessage | null>(null);

// Video info store
export const videoInfoStore = writable<VideoInfo | null>(null);

// Progress store
export const progressStore = writable<ProgressData>({
  show: false,
  progress: 0,
  speed: "",
  eta: "",
});

// Queue store
export const queueStore = writable<QueueStatus>({
  queue: [],
  activeCount: 0,
  maxConcurrent: 3
});
