# Svelte Video Downloader

A modern video downloader application built with SvelteKit and Express.js, featuring real-time progress updates via Socket.IO. Download videos from various platforms using `yt-dlp` with a clean, responsive interface.

## Download Modes

The application supports two download modes:

### 📋 Queue Mode (Default)
- Downloads are processed on the server
- Files are stored in the server's downloads folder
- Full queue management with pause/resume/cancel
- Real-time progress tracking via Socket.IO
- File management UI for server-stored files
- Ideal for single-user or server owner scenarios

### ⬇️ Direct Download Mode
- Files stream directly to the requesting device's download folder
- No server storage required
- Works across networks (perfect for ngrok/remote access)
- Downloads appear in browser's default download location
- Each user gets files on their own device
- Ideal for multi-user or remote access scenarios

## Features

- 🎥 **Multi-platform video downloads** - Support for YouTube and other platforms via yt-dlp
- 📱 **Responsive design** - Clean, modern interface with Tailwind CSS
- ⚡ **Real-time progress tracking** - Live download progress with Socket.IO
- 📋 **Download queue management** - Pause, resume, cancel downloads with concurrent limits
- 🎬 **Format selection** - Choose video quality and format before downloading
- ⬇️ **Direct download mode** - Stream files directly to requesting device's download folder
- 📁 **File management** - View, delete, and open downloaded files in system folder (queue mode)
- 🔄 **Cross-platform compatibility** - Works on Windows, macOS, and Linux
- 📝 **TypeScript support** - Full type safety throughout the application
- 🎨 **Modern UI** - Built with Svelte 5 and responsive design principles
- 🌐 **Network access** - Support for local network and ngrok tunneling

## Prerequisites

- Node.js (v18 or higher)
- `yt-dlp` binary (installed globally or placed in `backend/` directory)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/alexdonu/svelte-video-downloader.git
cd svelte-video-downloader
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd backend
npm install
cd ..
```

4. Install `yt-dlp` (if not already installed):
```bash
# On macOS with Homebrew
brew install yt-dlp

# Or download from https://github.com/yt-dlp/yt-dlp
```

## Development

Start both frontend and backend in development mode:

```bash
# Start both servers concurrently
npm run start:all

# Or start them separately:
# Frontend (http://localhost:5173)
npm run dev

# Backend (http://localhost:3000)
npm run backend:dev
```

### Key Features in Development

- **Real-time updates**: Changes are reflected immediately via Socket.IO
- **Download modes**: Choose between queue management or direct device downloads
- **Download queue**: Manage multiple downloads with configurable concurrent limits
- **Format selection**: Preview available video formats and select preferred quality
- **Cross-platform file operations**: Open files in system file manager
- **Network access**: Access from other devices on your local network

## Building for Production

Build the frontend:

```bash
npm run build
npm run preview
```

Start the backend in production:

```bash
npm run backend
```

## Project Structure

```
├── src/                    # SvelteKit frontend
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   ├── stores/         # State management
│   │   └── utils/          # API utilities
│   └── routes/             # SvelteKit routes
├── backend/                # Express.js backend
│   ├── downloads/          # Downloaded videos storage
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
└── CLAUDE.md              # Development guidance
```

## Technologies Used

- **Frontend**: SvelteKit, Svelte 5, TypeScript, Tailwind CSS
- **Backend**: Express.js, Socket.IO
- **Video Processing**: yt-dlp
- **Real-time Communication**: Socket.IO
- **Build Tool**: Vite
- **State Management**: Svelte stores
- **File System**: Cross-platform file operations
- **Network**: CORS support for local network access

## API Endpoints

### Video Information
- `POST /api/info` - Get video metadata and available formats
- `POST /api/download` - Add video to download queue
- `POST /api/download-stream` - Stream download directly to client device

### Download Management
- `GET /api/queue` - Get current download queue status
- `POST /api/queue/pause/:id` - Pause active download
- `POST /api/queue/resume/:id` - Resume paused download
- `POST /api/queue/cancel/:id` - Cancel download
- `DELETE /api/queue/:id` - Remove from queue and delete files
- `POST /api/queue/clear-completed` - Clear completed downloads
- `POST /api/queue/concurrent-limit` - Set max concurrent downloads

### File Operations
- `GET /api/downloads` - List downloaded files
- `POST /api/open-folder` - Open file in system file manager
- `DELETE /api/delete-file` - Delete downloaded file

## Socket.IO Events

### Client Events
- `download-progress` - Real-time download progress updates
- `queue-update` - Download queue status changes
- `downloads-updated` - Downloaded files list updates
- `file-deleted` - File deletion notifications
- `status-message` - System status messages
- `download-completed` - Download completion notifications

### Connection Events
- `connect` - Connection established
- `disconnect` - Connection lost
- `connect_error` - Connection failed
- `reconnect` - Connection restored
- `reconnect_error` - Reconnection failed
