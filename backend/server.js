const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const app = express();
const http = require("http");
const socketIo = require("socket.io");

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://192.168.100.37:5173",
      /^https:\/\/.*\.ngrok-free\.app$/, // Allow ngrok URLs
      /^https:\/\/.*\.ngrok\.io$/ // Allow legacy ngrok URLs
    ],
    methods: ["GET", "POST", "DELETE"],
  },
});

const PORT = 3000;
const DOWNLOADS_DIR = path.join(__dirname, "downloads");

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// Download Queue Management
class DownloadQueue {
  constructor() {
    this.queue = [];
    this.activeDownloads = new Map(); // downloadId -> { process, info }
    this.maxConcurrentDownloads = 3;
    this.nextId = 1;
  }

  addToQueue(url, format = "best", customFilename = null) {
    const downloadId = `download_${this.nextId++}`;
    const queueItem = {
      id: downloadId,
      url,
      format,
      customFilename,
      status: "queued", // queued, downloading, paused, completed, failed, cancelled
      addedAt: new Date(),
      progress: 0,
      speed: "",
      eta: "",
      title: customFilename || "", // Use custom filename as initial title if provided
      error: null
    };
    
    this.queue.push(queueItem);
    
    // Emit queue update immediately
    io.emit("queue-update", this.getQueueStatus());
    
    this.processQueue();
    return downloadId;
  }

  processQueue() {
    // Start downloads up to the concurrent limit
    const activeCount = this.activeDownloads.size;
    const availableSlots = this.maxConcurrentDownloads - activeCount;
    
    if (availableSlots <= 0) return;

    const queuedItems = this.queue.filter(item => item.status === "queued");
    const itemsToStart = queuedItems.slice(0, availableSlots);

    itemsToStart.forEach(item => {
      this.startDownload(item);
    });
  }

  async startDownload(queueItem) {
    const { id, url, format, customFilename } = queueItem;
    queueItem.status = "downloading";
    
    try {
      const ytdlpPath = await checkYtDlp();
      if (!ytdlpPath) {
        throw new Error("yt-dlp not found");
      }

      // Use custom filename if provided, otherwise use default template
      const outputTemplate = customFilename 
        ? path.join(DOWNLOADS_DIR, `${customFilename}.%(ext)s`)
        : path.join(DOWNLOADS_DIR, "%(title)s.%(ext)s");
      
      const downloadProcess = spawn(ytdlpPath, [
        url,
        "-o", outputTemplate,
        "--format", format,
        "--newline",
      ]);

      this.activeDownloads.set(id, {
        process: downloadProcess,
        info: queueItem
      });

      // Emit queue update
      io.emit("queue-update", this.getQueueStatus());

      downloadProcess.stdout.on("data", (data) => {
        const output = data.toString().trim();

        if (output.includes("[download]")) {
          const progressMatch = output.match(/(\d+\.?\d*)%/);
          const speedMatch = output.match(/at\s+([^\s]+)/);
          const etaMatch = output.match(/ETA\s+([^\s]+)/);

          if (progressMatch) {
            queueItem.progress = parseFloat(progressMatch[1]);
            queueItem.speed = speedMatch ? speedMatch[1] : "";
            queueItem.eta = etaMatch ? etaMatch[1] : "";

            io.emit("download-progress", {
              downloadId: id,
              progress: queueItem.progress,
              speed: queueItem.speed,
              eta: queueItem.eta,
              status: "downloading",
            });
          }
        }

        // Extract title from output or use custom filename
        if (customFilename) {
          // Use custom filename if provided
          if (!queueItem.title) {
            queueItem.title = customFilename;
            io.emit("queue-update", this.getQueueStatus());
          }
        } else if (output.includes("[download] Destination:") || output.includes("Destination:")) {
          const titleMatch = output.match(/(?:\[download\]\s+)?Destination:\s*(.+)/);
          if (titleMatch) {
            const fullPath = titleMatch[1].trim();
            queueItem.title = path.basename(fullPath);
            // Emit queue update when title is found
            io.emit("queue-update", this.getQueueStatus());
          }
        }

        // Also try to extract title from other yt-dlp output formats (only if no custom filename)
        if (!customFilename && output.includes("[youtube]") && output.includes(":")) {
          const titleMatch = output.match(/\[youtube\][^:]*:\s*(.+?)(?:\s+\(|$)/);
          if (titleMatch && !queueItem.title) {
            queueItem.title = titleMatch[1].trim();
            io.emit("queue-update", this.getQueueStatus());
          }
        }
      });

      downloadProcess.on("close", (code) => {
        this.activeDownloads.delete(id);
        
        if (code === 0) {
          queueItem.status = "completed";
          queueItem.progress = 100;
          
          io.emit("download-progress", {
            downloadId: id,
            progress: 100,
            status: "completed",
            message: "Download completed successfully!",
          });
          
          // Emit completion event for toast notification
          io.emit("download-completed", {
            downloadId: id,
            title: queueItem.title || "Download",
            message: "Download completed successfully!"
          });
          
          // Emit downloads list update event
          io.emit("downloads-updated");
          
        } else if (queueItem.status === "paused") {
          // Don't treat paused downloads as failed
        } else if (queueItem.status !== "cancelled") {
          queueItem.status = "failed";
          queueItem.error = code !== null ? `Download failed with code ${code}` : "Download was interrupted";
          
          io.emit("download-progress", {
            downloadId: id,
            status: "error",
            message: queueItem.error,
          });
        }
        
        io.emit("queue-update", this.getQueueStatus());
        this.processQueue(); // Start next downloads
      });

      downloadProcess.on("error", (error) => {
        this.activeDownloads.delete(id);
        queueItem.status = "failed";
        queueItem.error = error.message;
        
        io.emit("download-progress", {
          downloadId: id,
          status: "error",
          message: `Process error: ${error.message}`,
        });
        
        io.emit("queue-update", this.getQueueStatus());
        this.processQueue();
      });

    } catch (error) {
      queueItem.status = "failed";
      queueItem.error = error.message;
      
      // Also emit status message for critical download failures
      io.emit("status-message", {
        message: `Download failed: ${error.message}`,
        type: "error"
      });
      
      io.emit("queue-update", this.getQueueStatus());
      this.processQueue();
    }
  }

  pauseDownload(downloadId) {
    const activeDownload = this.activeDownloads.get(downloadId);
    if (activeDownload && activeDownload.info.status === "downloading") {
      // Mark as paused and gracefully terminate
      activeDownload.info.status = "paused";
      
      try {
        // Try graceful termination first
        activeDownload.process.kill('SIGTERM');
      } catch (error) {
        // Process already terminated
      }
      
      this.activeDownloads.delete(downloadId);
      io.emit("queue-update", this.getQueueStatus());
      return true;
    }
    return false;
  }

  resumeDownload(downloadId) {
    const queueItem = this.queue.find(item => item.id === downloadId);
    if (queueItem && queueItem.status === "paused") {
      queueItem.status = "queued";
      io.emit("queue-update", this.getQueueStatus());
      this.processQueue(); // Restart the download
      return true;
    }
    return false;
  }

  cancelDownload(downloadId) {
    const activeDownload = this.activeDownloads.get(downloadId);
    if (activeDownload) {
      activeDownload.process.kill('SIGTERM');
      activeDownload.info.status = "cancelled";
      this.activeDownloads.delete(downloadId);
    } else {
      // Find in queue and mark as cancelled
      const queueItem = this.queue.find(item => item.id === downloadId);
      if (queueItem) {
        queueItem.status = "cancelled";
      }
    }
    
    io.emit("queue-update", this.getQueueStatus());
    this.processQueue();
    return true;
  }

  removeFromQueue(downloadId) {
    // Find the queue item to get potential file info
    const queueItem = this.queue.find(item => item.id === downloadId);
    
    // Cancel the download if it's active
    this.cancelDownload(downloadId);
    
    // Only delete partial files for incomplete downloads
    if (queueItem && queueItem.title && queueItem.status !== "completed") {
      this.deletePartialFiles(queueItem.title);
    }
    
    // Remove from queue
    this.queue = this.queue.filter(item => item.id !== downloadId);
    io.emit("queue-update", this.getQueueStatus());
    return true;
  }

  // Delete partial download files
  deletePartialFiles(titlePattern) {
    try {
      const files = fs.readdirSync(DOWNLOADS_DIR);
      
      // Look for files that match the title pattern or have .part extension
      const filesToDelete = files.filter(file => {
        const lowerFile = file.toLowerCase();
        const lowerTitle = titlePattern.toLowerCase();
        
        return (
          file.includes(titlePattern) ||
          lowerFile.includes(lowerTitle.split('.')[0]) ||
          file.endsWith('.part') ||
          file.endsWith('.ytdl') ||
          file.endsWith('.temp')
        );
      });
      
      filesToDelete.forEach(file => {
        const filePath = path.join(DOWNLOADS_DIR, file);
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          // Emit error to frontend
          io.emit("status-message", {
            message: `Could not delete partial file ${file}: ${error.message}`,
            type: "error"
          });
        }
      });
      
    } catch (error) {
      // Emit error to frontend
      io.emit("status-message", {
        message: `Could not scan downloads directory: ${error.message}`,
        type: "error"
      });
    }
  }

  getQueueStatus() {
    return {
      queue: this.queue,
      activeCount: this.activeDownloads.size,
      maxConcurrent: this.maxConcurrentDownloads
    };
  }

  clearCompleted() {
    this.queue = this.queue.filter(item => 
      item.status !== "completed"
    );
    io.emit("queue-update", this.getQueueStatus());
  }

  // Remove from queue without deleting files (for completed downloads)
  removeFromQueueOnly(downloadId) {
    const queueItem = this.queue.find(item => item.id === downloadId);
    
    if (queueItem) {
      // Remove from queue without any file deletion
      this.queue = this.queue.filter(item => item.id !== downloadId);
      io.emit("queue-update", this.getQueueStatus());
      return true;
    }
    return false;
  }
}

const downloadQueue = new DownloadQueue();

// Middleware
app.use(express.json());

// CORS middleware for SvelteKit
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow localhost, local network, and ngrok URLs
  const isAllowed = origin && (
    origin.includes("localhost") ||
    origin.includes("192.168.100.37") ||
    origin.includes(".ngrok-free.app") ||
    origin.includes(".ngrok.io")
  );
  
  // Always allow requests from ngrok domains
  const isNgrokRequest = req.get('host') && req.get('host').includes('.ngrok-free.app');
  
  if (isAllowed || isNgrokRequest) {
    res.header("Access-Control-Allow-Origin", origin || "*");
  }
  
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, ngrok-skip-browser-warning");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Root route handler
app.get("/", (req, res) => {
  res.json({
    name: "Svelte Video Downloader API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      "GET /": "API status",
      "POST /api/info": "Get video information",
      "POST /api/download": "Download video",
      "GET /api/downloads": "List downloaded files",
      "POST /api/open-folder": "Open file in system folder",
      "DELETE /api/delete-file": "Delete downloaded file"
    }
  });
});

// Check if yt-dlp is available - Cross-platform compatible
function checkYtDlp() {
  return new Promise((resolve) => {
    const { spawn: spawnCheck } = require("child_process");
    
    // Define possible yt-dlp executable names for different platforms
    const possibleExecutables = [
      // Local binaries
      process.platform === "win32" ? "./yt-dlp.exe" : "./yt-dlp",
      // System-wide installations
      "yt-dlp",
      // Alternative names
      "yt-dlp.exe", // Windows global
      "youtube-dl", // Fallback to older version
      "youtube-dl.exe" // Windows youtube-dl
    ];

    async function tryExecutable(index = 0) {
      if (index >= possibleExecutables.length) {
        resolve(null);
        return;
      }

      const exe = possibleExecutables[index];
        const check = spawnCheck(exe, ["--version"], { 
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === "win32" // Use shell on Windows for better compatibility
      });

      check.on("close", (code) => {
        if (code === 0) {
          resolve(exe);
        } else {
          tryExecutable(index + 1);
        }
      });

      check.on("error", (err) => {
        tryExecutable(index + 1);
      });
    }

    tryExecutable();
  });
}

// Get video info
app.post("/api/info", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const ytdlpPath = await checkYtDlp();
    if (!ytdlpPath) {
      return res
        .status(500)
        .json({
          error: "yt-dlp not found. Please ensure yt-dlp is installed.",
        });
    }

    const infoProcess = spawn(ytdlpPath, [url, "--dump-json", "--no-download"]);

    let output = "";
    let error = "";

    infoProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    infoProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    infoProcess.on("close", (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          // Process formats to include useful information
          const processedFormats = info.formats?.map(format => ({
            format_id: format.format_id,
            ext: format.ext,
            resolution: format.resolution || 'audio',
            filesize: format.filesize,
            vcodec: format.vcodec,
            acodec: format.acodec,
            format_note: format.format_note,
            quality: format.quality,
            fps: format.fps,
            tbr: format.tbr // total bitrate
          })).filter(format => format.format_id) || [];

          res.json({
            title: info.title,
            duration: info.duration,
            uploader: info.uploader,
            thumbnail: info.thumbnail,
            formats: processedFormats,
            formatCount: processedFormats.length,
          });
        } catch (e) {
          res
            .status(500)
            .json({ error: "Could not parse video info: " + e.message });
        }
      } else {
        res.status(500).json({
          error: `Could not get video info. yt-dlp error: ${
            error || "Unknown error"
          }`,
        });
      }
    });

    infoProcess.on("error", (err) => {
      const errorMsg = "Failed to start yt-dlp process: " + err.message;
      io.emit("status-message", {
        message: errorMsg,
        type: "error"
      });
      res.status(500).json({ error: errorMsg });
    });
  } catch (err) {
    const errorMsg = "Internal server error: " + err.message;
    io.emit("status-message", {
      message: errorMsg,
      type: "error"
    });
    res.status(500).json({ error: errorMsg });
  }
});

// Add video to download queue
app.post("/api/download", async (req, res) => {
  const { url, format = "best", customFilename } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const downloadId = downloadQueue.addToQueue(url, format, customFilename);
    res.json({ 
      downloadId, 
      status: "queued",
      message: "Added to download queue"
    });
  } catch (error) {
    io.emit("status-message", {
      message: "Failed to add to download queue: " + error.message,
      type: "error"
    });
    res.status(500).json({ error: error.message });
  }
});

// Get download queue status
app.get("/api/queue", (req, res) => {
  res.json(downloadQueue.getQueueStatus());
});

// Pause download
app.post("/api/queue/pause/:downloadId", (req, res) => {
  const { downloadId } = req.params;
  const success = downloadQueue.pauseDownload(downloadId);
  
  if (success) {
    res.json({ success: true, message: "Download paused" });
  } else {
    res.status(404).json({ error: "Download not found or cannot be paused" });
  }
});

// Resume download
app.post("/api/queue/resume/:downloadId", (req, res) => {
  const { downloadId } = req.params;
  const success = downloadQueue.resumeDownload(downloadId);
  
  if (success) {
    res.json({ success: true, message: "Download resumed" });
  } else {
    res.status(404).json({ error: "Download not found or cannot be resumed" });
  }
});

// Cancel download
app.post("/api/queue/cancel/:downloadId", (req, res) => {
  const { downloadId } = req.params;
  const success = downloadQueue.cancelDownload(downloadId);
  
  if (success) {
    res.json({ success: true, message: "Download cancelled" });
  } else {
    res.status(404).json({ error: "Download not found" });
  }
});

// Remove from queue
app.delete("/api/queue/:downloadId", (req, res) => {
  const { downloadId } = req.params;
  const success = downloadQueue.removeFromQueue(downloadId);
  
  if (success) {
    res.json({ success: true, message: "Removed from queue" });
  } else {
    res.status(404).json({ error: "Download not found" });
  }
});

// Remove from queue only (without deleting files)
app.post("/api/queue/remove-only/:downloadId", (req, res) => {
  const { downloadId } = req.params;
  const success = downloadQueue.removeFromQueueOnly(downloadId);
  
  if (success) {
    res.json({ success: true, message: "Removed from queue (files kept)" });
  } else {
    res.status(404).json({ error: "Download not found" });
  }
});

// Clear completed downloads
app.post("/api/queue/clear-completed", (req, res) => {
  downloadQueue.clearCompleted();
  res.json({ success: true, message: "Completed downloads cleared" });
});

// Set concurrent download limit
app.post("/api/queue/concurrent-limit", (req, res) => {
  const { limit } = req.body;
  
  if (!limit || limit < 1 || limit > 10) {
    return res.status(400).json({ error: "Limit must be between 1 and 10" });
  }
  
  downloadQueue.maxConcurrentDownloads = parseInt(limit);
  downloadQueue.processQueue(); // Process queue with new limit
  
  // Emit queue update to sync the frontend
  io.emit("queue-update", downloadQueue.getQueueStatus());
  
  res.json({ 
    success: true, 
    message: "Concurrent download limit updated",
    limit: downloadQueue.maxConcurrentDownloads
  });
});

// Get downloaded files
app.get("/api/downloads", (req, res) => {
  try {
    const files = fs
      .readdirSync(DOWNLOADS_DIR)
      .filter((file) => !file.startsWith("."))
      .map((file) => {
        const filePath = path.join(DOWNLOADS_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          modified: stats.mtime,
        };
      });
    res.json(files);
  } catch (error) {
    const errorMsg = "Could not read downloads directory: " + error.message;
    io.emit("status-message", {
      message: errorMsg,
      type: "error"
    });
    res.status(500).json({ error: "Could not read downloads directory" });
  }
});

// Open file in folder
app.post("/api/open-folder", (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: "Filename is required" });
  }

  const filePath = path.join(DOWNLOADS_DIR, filename);
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  const { exec } = require("child_process");

  // Cross-platform file opening with multiple fallbacks
  function getOpenCommands(filePath, dirPath) {
    const escapedFilePath = filePath.replace(/"/g, '\\"');
    const escapedDirPath = dirPath.replace(/"/g, '\\"');
    
    switch (process.platform) {
      case "darwin": // macOS
        return [
          `open -R "${escapedFilePath}"`, // Select file in Finder
          `open "${escapedDirPath}"` // Open folder
        ];
      case "win32": // Windows
        const winFilePath = escapedFilePath.replace(/\//g, "\\");
        const winDirPath = escapedDirPath.replace(/\//g, "\\");
        return [
          `explorer /select,"${winFilePath}"`, // Select file in Explorer
          `explorer "${winDirPath}"`, // Open folder
          `start "" "${winDirPath}"` // Alternative Windows command
        ];
      default: // Linux and other Unix-like systems
        return [
          // Try to select file in various file managers
          `nautilus --select "${escapedFilePath}"`,
          `dolphin --select "${escapedFilePath}"`,
          `thunar --select "${escapedFilePath}"`,
          `pcmanfm --select "${escapedFilePath}"`,
          // Fallback to opening directory
          `xdg-open "${escapedDirPath}"`,
          `nautilus "${escapedDirPath}"`,
          `dolphin "${escapedDirPath}"`,
          `thunar "${escapedDirPath}"`,
          `pcmanfm "${escapedDirPath}"`,
          `gnome-open "${escapedDirPath}"`,
          `kde-open "${escapedDirPath}"`
        ];
    }
  }

  const commands = getOpenCommands(absolutePath, path.dirname(absolutePath));
  
  function tryCommand(index = 0) {
    if (index >= commands.length) {
      // All commands failed
      const errorMsg = "Could not open folder. Please navigate manually to: " + path.dirname(absolutePath);
      io.emit("status-message", {
        message: errorMsg,
        type: "error"
      });
      res.status(500).json({
        error: errorMsg,
        path: path.dirname(absolutePath),
        platform: process.platform,
        suggestion: process.platform === "linux" 
          ? "Install a file manager like nautilus, dolphin, or thunar" 
          : "Check if file explorer is available"
      });
      return;
    }

    const command = commands[index];

    exec(command, { timeout: 10000 }, (error, stdout, stderr) => {
      if (error) {
        tryCommand(index + 1); // Try next command
      } else {
        res.json({
          success: true,
          message: index === 0 ? "File highlighted in folder" : "Folder opened",
          path: absolutePath,
          method: command.split(' ')[0] // Show which command worked
        });
      }
    });
  }

  tryCommand();
});

// Delete file
app.delete("/api/delete-file", (req, res) => {
  const { filename } = req.body;

  if (!filename) {
    return res.status(400).json({ error: "Filename is required" });
  }

  // Security check: prevent directory traversal
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return res.status(400).json({ error: "Invalid filename" });
  }

  const filePath = path.join(DOWNLOADS_DIR, filename);
  const absolutePath = path.resolve(filePath);

  // Additional security: ensure the file is within downloads directory
  if (!absolutePath.startsWith(path.resolve(DOWNLOADS_DIR))) {
    return res.status(400).json({ error: "Invalid file path" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  try {
    fs.unlinkSync(filePath);
    
    // Emit file deletion event to update downloads list
    io.emit("file-deleted", { filename: filename });
    
    res.json({
      success: true,
      message: "File deleted successfully",
      filename: filename,
    });
  } catch (error) {
    res.status(500).json({
      error: "Could not delete file: " + error.message,
    });
  }
});

// Socket.io connection
io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    // Client disconnected
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Video Downloader API running at http://0.0.0.0:${PORT}`);
  console.log(`🌐 Access from other devices: http://192.168.100.37:${PORT}`);
  console.log("📁 Downloads will be saved to:", DOWNLOADS_DIR);
  console.log("🌐 CORS enabled for network access");
});
