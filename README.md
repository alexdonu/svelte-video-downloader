# Svelte Video Downloader

A modern video downloader application built with SvelteKit and Express.js, featuring real-time progress updates via Socket.IO. Download videos from various platforms using `yt-dlp` with a clean, responsive interface.

## Features

- 🎥 Download videos from multiple platforms (YouTube, etc.)
- 📱 Responsive design with Tailwind CSS
- ⚡ Real-time download progress updates
- 📁 File management (view, delete, open in folder)
- 🔄 Socket.IO for live progress tracking
- 📝 TypeScript support throughout
- 🎨 Modern UI with Svelte 5

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
