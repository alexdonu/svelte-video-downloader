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
    origin: ["http://localhost:5173", "http://192.168.100.37:5173"], // Allow both localhost and network access
    methods: ["GET", "POST", "DELETE"],
  },
});

const PORT = 3000;
const DOWNLOADS_DIR = path.join(__dirname, "downloads");

// Ensure downloads directory exists
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// Middleware
app.use(express.json());

// CORS middleware for SvelteKit
app.use((req, res, next) => {
  const allowedOrigins = ["http://localhost:5173", "http://192.168.100.37:5173"];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Check if yt-dlp is available
function checkYtDlp() {
  return new Promise((resolve) => {
    const localExe = process.platform === "win32" ? "./yt-dlp.exe" : "./yt-dlp";

    // Try local first
    const { spawn: spawnCheck } = require("child_process");
    const check = spawnCheck(localExe, ["--version"]);

    check.on("close", (code) => {
      if (code === 0) {
        resolve(localExe);
      } else {
        // Try system-wide
        const systemCheck = spawnCheck("yt-dlp", ["--version"]);
        systemCheck.on("close", (systemCode) => {
          resolve(systemCode === 0 ? "yt-dlp" : null);
        });
      }
    });

    check.on("error", () => {
      const systemCheck = spawnCheck("yt-dlp", ["--version"]);
      systemCheck.on("close", (systemCode) => {
        resolve(systemCode === 0 ? "yt-dlp" : null);
      });
      systemCheck.on("error", () => resolve(null));
    });
  });
}

// Get video info
app.post("/api/info", async (req, res) => {
  console.log("INFO request received:", req.body);

  try {
    const { url } = req.body;

    if (!url) {
      console.log("No URL provided");
      return res.status(400).json({ error: "URL is required" });
    }

    console.log("Checking yt-dlp...");
    const ytdlpPath = await checkYtDlp();
    if (!ytdlpPath) {
      console.log("yt-dlp not found");
      return res
        .status(500)
        .json({
          error: "yt-dlp not found. Please ensure yt-dlp is installed.",
        });
    }

    console.log("Using yt-dlp:", ytdlpPath);
    console.log("Getting info for URL:", url);

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
      console.log("yt-dlp process closed with code:", code);
      console.log("Output length:", output.length);
      console.log("Error output:", error);

      if (code === 0) {
        try {
          const info = JSON.parse(output);
          console.log("Successfully parsed video info");
          res.json({
            title: info.title,
            duration: info.duration,
            uploader: info.uploader,
            thumbnail: info.thumbnail,
            formats: info.formats?.length || 0,
          });
        } catch (e) {
          console.error("JSON parse error:", e);
          console.error("Raw output:", output.substring(0, 500));
          res
            .status(500)
            .json({ error: "Could not parse video info: " + e.message });
        }
      } else {
        console.error("yt-dlp failed with code:", code);
        res.status(500).json({
          error: `Could not get video info. yt-dlp error: ${
            error || "Unknown error"
          }`,
        });
      }
    });

    infoProcess.on("error", (err) => {
      console.error("Process error:", err);
      res
        .status(500)
        .json({ error: "Failed to start yt-dlp process: " + err.message });
    });
  } catch (err) {
    console.error("Unexpected error in /api/info:", err);
    res.status(500).json({ error: "Internal server error: " + err.message });
  }
});

// Download video
app.post("/api/download", async (req, res) => {
  const { url, format = "best" } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  const ytdlpPath = await checkYtDlp();
  if (!ytdlpPath) {
    return res.status(500).json({ error: "yt-dlp not found" });
  }

  const downloadId = Date.now().toString();
  const outputTemplate = path.join(DOWNLOADS_DIR, "%(title)s.%(ext)s");

  const downloadProcess = spawn(ytdlpPath, [
    url,
    "-o",
    outputTemplate,
    "--format",
    format,
    "--newline",
  ]);

  res.json({ downloadId, status: "started" });

  downloadProcess.stdout.on("data", (data) => {
    const output = data.toString().trim();

    // Parse progress from yt-dlp output
    if (output.includes("[download]")) {
      const progressMatch = output.match(/(\d+\.?\d*)%/);
      const speedMatch = output.match(/at\s+([^\s]+)/);
      const etaMatch = output.match(/ETA\s+([^\s]+)/);

      if (progressMatch) {
        const progress = parseFloat(progressMatch[1]);
        const speed = speedMatch ? speedMatch[1] : "";
        const eta = etaMatch ? etaMatch[1] : "";

        io.emit("download-progress", {
          downloadId,
          progress,
          speed,
          eta,
          status: "downloading",
        });
      }
    }
  });

  downloadProcess.stderr.on("data", (data) => {
    const output = data.toString().trim();
    if (output && !output.includes("WARNING")) {
      io.emit("download-progress", {
        downloadId,
        message: output,
        status: "info",
      });
    }
  });

  downloadProcess.on("close", (code) => {
    if (code === 0) {
      io.emit("download-progress", {
        downloadId,
        progress: 100,
        status: "completed",
        message: "Download completed successfully!",
      });
    } else {
      io.emit("download-progress", {
        downloadId,
        status: "error",
        message: `Download failed with code ${code}`,
      });
    }
  });

  downloadProcess.on("error", (error) => {
    io.emit("download-progress", {
      downloadId,
      status: "error",
      message: `Process error: ${error.message}`,
    });
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
    res.status(500).json({ error: "Could not read downloads directory" });
  }
});

// Open file in folder
app.post("/api/open-folder", (req, res) => {
  const { filename } = req.body;

  console.log("Open folder request for:", filename);
  console.log("Platform:", process.platform);

  if (!filename) {
    return res.status(400).json({ error: "Filename is required" });
  }

  const filePath = path.join(DOWNLOADS_DIR, filename);
  const absolutePath = path.resolve(filePath);

  console.log("File path:", absolutePath);
  console.log("Downloads dir:", path.resolve(DOWNLOADS_DIR));

  if (!fs.existsSync(filePath)) {
    console.log("File does not exist:", filePath);
    return res.status(404).json({ error: "File not found" });
  }

  const { exec } = require("child_process");
  let command;

  // Different commands for different operating systems
  switch (process.platform) {
    case "darwin": // macOS
      command = `open -R "${absolutePath}"`;
      break;
    case "win32": // Windows
      command = `explorer /select,"${absolutePath.replace(/\//g, "\\")}"`;
      break;
    default: // Linux and others
      // Try multiple commands for Linux
      command = `nautilus --select "${absolutePath}" || dolphin --select "${absolutePath}" || thunar "${path.dirname(
        absolutePath
      )}" || xdg-open "${path.dirname(absolutePath)}"`;
      break;
  }

  console.log("Executing command:", command);

  exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
    if (error) {
      console.error("Error opening folder:", error);
      console.error("stdout:", stdout);
      console.error("stderr:", stderr);

      // Fallback: try to open just the downloads directory
      const fallbackCommand =
        process.platform === "darwin"
          ? `open "${path.dirname(absolutePath)}"`
          : process.platform === "win32"
          ? `explorer "${path.dirname(absolutePath).replace(/\//g, "\\")}"`
          : `xdg-open "${path.dirname(absolutePath)}"`;

      console.log("Trying fallback command:", fallbackCommand);

      exec(fallbackCommand, (fallbackError) => {
        if (fallbackError) {
          console.error("Fallback also failed:", fallbackError);
          res.status(500).json({
            error:
              "Could not open folder. Please navigate manually to: " +
              path.dirname(absolutePath),
            path: path.dirname(absolutePath),
          });
        } else {
          res.json({
            success: true,
            message: "Downloads folder opened (file not highlighted)",
            path: path.dirname(absolutePath),
          });
        }
      });
    } else {
      console.log("Successfully opened folder");
      res.json({
        success: true,
        message: "Folder opened successfully",
        path: absolutePath,
      });
    }
  });
});

// Delete file
app.delete("/api/delete-file", (req, res) => {
  const { filename } = req.body;

  console.log("Delete request for:", filename);

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
    console.log("Successfully deleted:", absolutePath);
    res.json({
      success: true,
      message: "File deleted successfully",
      filename: filename,
    });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({
      error: "Could not delete file: " + error.message,
    });
  }
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Video Downloader API running at http://0.0.0.0:${PORT}`);
  console.log(`🌐 Access from other devices: http://192.168.100.37:${PORT}`);
  console.log("📁 Downloads will be saved to:", DOWNLOADS_DIR);
  console.log("🌐 CORS enabled for network access");
});
