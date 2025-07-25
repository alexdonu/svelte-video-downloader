import { writable } from "svelte/store";

// Type definitions
export interface DownloadFile {
  name: string;
  size: number;
  modified: string;
}

export interface VideoInfo {
  title: string;
  duration: number;
  uploader: string;
  thumbnail?: string;
  formats: number;
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
