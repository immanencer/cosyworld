# Radio Whisper

A Discord bot that creates an automated radio station with AI-powered hosts who discuss and transition between tracks.

## Features

- Plays music tracks from a MongoDB collection
- Generates AI-powered conversations between radio hosts using OpenAI
- Creates dynamic audio transitions between tracks
- Uses ElevenLabs for text-to-speech conversion
- Supports commands for playlist control
- Handles MP3 file uploads and URL submissions
- Maintains host personalities across different time slots

## Prerequisites

- Node.js 18 or higher
- MongoDB instance
- Discord Bot Token
- OpenRouter API Token (for AI conversations)
- ElevenLabs API Key (for text-to-speech)
- FFmpeg installed on the system

## Environment Variables

Create a `.env` file with the following:

