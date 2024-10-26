import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, FileState } from "@google/generative-ai/server";
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import path from 'path';
import process from 'process';

class RadioResearcher {
  constructor() {
    this.fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    this.mongoClient = null;
    this.trackCollection = null;
    this.analysisCollection = null;
  }

  async connect() {
    try {
      this.mongoClient = new MongoClient(process.env.MONGODB_URI);
      await this.mongoClient.connect();
      console.log('Connected to MongoDB');
      const db = this.mongoClient.db('radio-whisper');
      this.trackCollection = db.collection('radio');
      this.analysisCollection = db.collection('track_analysis');
      
      // Create indexes for efficient querying
      await this.analysisCollection.createIndex({ trackId: 1 });
      await this.analysisCollection.createIndex({ processedAt: 1 });
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  // Helper function to handle rate limiting
  async requestWithRetry(fn, retries = 5, backoffMs = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (error.response && error.response.status === 429) { // Rate limit error
          const retryAfter = error.response.headers['retry-after']
                             ? parseInt(error.response.headers['retry-after']) * 1000
                             : backoffMs * Math.pow(2, attempt);
          console.warn(`Rate limit hit. Retrying after ${retryAfter} ms (Attempt ${attempt}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Rate limit retries exceeded');
  }

  async processTrack(track) {
    try {
      // Skip if analysis already exists and is recent (less than 7 days old)
      const existingAnalysis = await this.analysisCollection.findOne({
        trackId: track._id,
        processedAt: { 
          $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
        }
      });

      if (existingAnalysis) {
        console.log(`Recent analysis exists for track: ${track.title}`);
        return existingAnalysis;
      }

      // Upload file to Gemini
      const uploadResult = await this.fileManager.uploadFile(
        path.resolve(track.path), 
        {
          mimeType: "audio/mp3",
          displayName: track.title,
        }
      );

      // Wait for processing to complete
      let file = await this.fileManager.getFile(uploadResult.file.name);
      while (file.state === FileState.PROCESSING) {
        process.stdout.write(".");
        await new Promise((resolve) => setTimeout(resolve, 10000));
        file = await this.fileManager.getFile(uploadResult.file.name);
      }

      if (file.state === FileState.FAILED) {
        throw new Error("Audio processing failed.");
      }

      // Generate analyses
      const [musicAnalysis, titleSuggestion, emotionalAnalysis, genreAnalysis] = await Promise.all([
        this.generateMusicAnalysis(file),
        this.generateTitleSuggestion(file),
        this.generateEmotionalAnalysis(file),
        this.generateGenreAnalysis(file)
      ]);

      // Clean up the uploaded file
      await this.fileManager.deleteFile(file.name);

      // Create analysis document
      const analysis = {
        trackId: track._id,
        originalTitle: track.title,
        suggestedTitle: titleSuggestion,
        musicAnalysis: musicAnalysis,
        emotionalProfile: emotionalAnalysis,
        genreAnalysis: genreAnalysis,
        processedAt: new Date(),
        version: '1.0' // For future compatibility
      };

      // Save to analysis collection
      await this.analysisCollection.updateOne(
        { trackId: track._id },
        { $set: analysis },
        { upsert: true }
      );

      // Update original track with reference
      await this.trackCollection.updateOne(
        { _id: track._id },
        { 
          $set: { 
            hasAnalysis: true,
            lastAnalysisAt: new Date()
          }
        }
      );

      return analysis;

    } catch (error) {
      console.error('Error processing track:', error);
      
      // Save error information
      await this.analysisCollection.updateOne(
        { trackId: track._id },
        { 
          $set: { 
            error: error.message,
            processedAt: new Date(),
            status: 'failed'
          }
        },
        { upsert: true }
      );
      
      throw error;
    }
  }

  async generateMusicAnalysis(file) {
    return await this.requestWithRetry(async () => {
      const result = await this.model.generateContent([
        {
          fileData: {
            fileUri: file.uri,
            mimeType: file.mimeType,
          }
        },
        { 
          text: `Analyze this music track and provide a detailed description that would be useful for a radio DJ or music curator. Include:
          1. Overall style and mood
          2. Key musical elements and instruments
          3. Structure and notable moments
          4. What makes this track unique or interesting
          Keep the description engaging and informative, suitable for announcing on radio.`
        }
      ]);
      return result.response.text();
    });
  }

  async generateTitleSuggestion(file) {
    return await this.requestWithRetry(async () => {
      const result = await this.model.generateContent([
        {
          fileData: {
            fileUri: file.uri,
            mimeType: file.mimeType,
          }
        },
        { 
          text: `Based on this music, suggest an appropriate title that captures its essence. 
          Consider the mood, style, and any distinctive elements.
          Just provide the title itself, no explanation needed.`
        }
      ]);
      return result.response.text().trim();
    });
  }

  async generateEmotionalAnalysis(file) {
    return await this.requestWithRetry(async () => {
      const result = await this.model.generateContent([
        {
          fileData: {
            fileUri: file.uri,
            mimeType: file.mimeType,
          }
        },
        { 
          text: `Create an emotional profile for this track, suitable for a radio playlist algorithm. Include:
          1. Primary moods and feelings
          2. Energy level and intensity
          3. Emotional progression
          4. Best situations or times for playing this track
          Make it useful for playlist curation and mood-based programming.`
        }
      ]);
      return result.response.text();
    });
  }

  async generateGenreAnalysis(file) {
    return await this.requestWithRetry(async () => {
      const result = await this.model.generateContent([
        {
          fileData: {
            fileUri: file.uri,
            mimeType: file.mimeType,
          }
        },
        { 
          text: `Provide a detailed genre analysis of this track, including:
          1. Primary genre(s)
          2. Subgenres and style influences
          3. Similar artists or tracks
          4. Era or time period characteristics
          Make it useful for music categorization and playlist organization.`
        }
      ]);
      return result.response.text();
    });
  }

  async processUnanalyzedTracks() {
    try {
      // Find tracks without analysis or with old analysis
      const unanalyzedTracks = await this.trackCollection.find({
        $or: [
          { hasAnalysis: { $exists: false } },
          { hasAnalysis: false },
          { 
            lastAnalysisAt: { 
              $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) 
            }
          }
        ]
      }).toArray();

      console.log(`Found ${unanalyzedTracks.length} tracks needing analysis`);

      for (const track of unanalyzedTracks) {
        try {
          console.log(`Processing track: ${track.title}`);
          await this.processTrack(track);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between requests
          console.log(`Successfully processed track: ${track.title}`);
        } catch (error) {
          console.error(`Failed to process track ${track.title}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in processUnanalyzedTracks:', error);
    }
  }

  async getAnalysis(trackId) {
    try {
      if (!ObjectId.isValid(trackId)) {
        throw new Error('Invalid trackId format');
      }
      return await this.analysisCollection.findOne({ trackId: new ObjectId(trackId) });
    } catch (error) {
      console.error('Error in getAnalysis:', error);
      throw error;
    }
  }

  async getAllAnalyses() {
    return await this.analysisCollection.find({}).toArray();
  }

  async startAnalysis(intervalMinutes = 30) {
    await this.connect();
    
    // Initial processing
    await this.processUnanalyzedTracks();
    
    // Set up interval for continuous processing
    setInterval(
      () => this.processUnanalyzedTracks(),
      intervalMinutes * 60 * 1000
    );
  }

  async close() {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}

export default RadioResearcher;
