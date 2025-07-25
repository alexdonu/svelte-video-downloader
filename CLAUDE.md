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
- Node.js and npm installed
- `yt-dlp` binary available (either in `backend/` directory or system-wide)
- The backend expects `yt-dlp` executable in the backend directory or globally installed

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