# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Svelte Video Downloader application with a SvelteKit frontend and Express.js backend. The app allows users to download videos from various platforms using `yt-dlp`, with real-time progress updates via Socket.IO.

### Architecture

- **Frontend**: SvelteKit with Svelte 5, TypeScript, and Tailwind CSS
- **Backend**: Express.js with Socket.IO for real-time communication
- **Video Processing**: Uses `yt-dlp` binary (local or system-wide installation)
- **State Management**: Svelte stores for downloads, progress, status, and video info
- **Real-time Communication**: Socket.IO for download progress updates

## Development Commands

### Frontend (SvelteKit)
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run check

# Type checking with watch mode
npm run check:watch
```

### Backend (Express.js)
```bash
# Start backend in production mode
npm run backend

# Start backend in development mode (with nodemon)
npm run backend:dev
```

### Full Application
```bash
# Start both frontend and backend concurrently
npm run start:all
```

## Key Components and Structure

### Frontend Structure
- `src/routes/+page.svelte` - Main application page
- `src/routes/+layout.svelte` - Application layout
- `src/lib/components/` - Reusable Svelte components:
  - `VideoForm.svelte` - URL input and video info display
  - `ProgressBar.svelte` - Download progress visualization
  - `DownloadsList.svelte` - List of downloaded files
  - `FileItem.svelte` - Individual file item with actions
  - `StatusMessage.svelte` - Status/error message display
  - `VideoInfo.svelte` - Video metadata display
- `src/lib/stores/downloads.ts` - Centralized state management
- `src/lib/utils/api.ts` - API communication layer with Socket.IO

### Backend Structure
- `backend/server.js` - Main Express server with Socket.IO
- `backend/downloads/` - Directory where downloaded videos are stored
- Key API endpoints:
  - `POST /api/info` - Get video metadata
  - `POST /api/download` - Start video download
  - `GET /api/downloads` - List downloaded files
  - `POST /api/open-folder` - Open file in system file manager
  - `DELETE /api/delete-file` - Delete downloaded file

### State Management
The application uses Svelte stores for state management:
- `downloadsStore` - List of downloaded files
- `statusStore` - Status messages (success/error/info)
- `videoInfoStore` - Current video metadata
- `progressStore` - Download progress data

### Socket.IO Events
- `download-progress` - Real-time download progress updates
- `connect`/`disconnect` - Connection status

## Development Notes

### Prerequisites

#### Cross-Platform Requirements
- **Node.js** (v16 or higher) and npm installed
- **yt-dlp** binary available (see installation instructions below)

#### yt-dlp Installation (Cross-Platform)

**Windows:**
```bash
# Option 1: Using winget (Windows 10/11)
winget install yt-dlp

# Option 2: Using chocolatey
choco install yt-dlp

# Option 3: Manual download
# Download yt-dlp.exe from https://github.com/yt-dlp/yt-dlp/releases
# Place it in the backend/ directory or in your PATH
```

**macOS:**
```bash
# Option 1: Using Homebrew (recommended)
brew install yt-dlp

# Option 2: Using pip
pip3 install yt-dlp

# Option 3: Using MacPorts
sudo port install yt-dlp
```

**Linux (Ubuntu/Debian):**
```bash
# Option 1: Using pip (recommended)
pip3 install yt-dlp

# Option 2: Using apt (if available)
sudo apt update && sudo apt install yt-dlp

# Option 3: Using snap
sudo snap install yt-dlp
```

**Linux (Other Distributions):**
```bash
# Fedora/CentOS/RHEL
sudo dnf install yt-dlp

# Arch Linux
sudo pacman -S yt-dlp

# Generic (using pip)
pip3 install yt-dlp
```

#### File Manager Requirements (Linux Only)
For the "Open in Folder" feature on Linux, install one of these file managers:
```bash
# GNOME
sudo apt install nautilus

# KDE
sudo apt install dolphin

# XFCE
sudo apt install thunar

# LXDE/LXQt
sudo apt install pcmanfm
```

#### Verification
Test that yt-dlp is working:
```bash
yt-dlp --version
```

### Configuration
- Frontend runs on `http://localhost:5173` (Vite dev server)
- Backend runs on `http://localhost:3000`
- CORS is configured to allow frontend-backend communication

### File Management
- Downloads are stored in `backend/downloads/`
- Files can be opened in system file manager or deleted through the UI
- File operations include security checks to prevent directory traversal

### Error Handling
- API errors are displayed via the status store
- Socket.IO handles connection failures gracefully
- yt-dlp process errors are captured and reported to the user