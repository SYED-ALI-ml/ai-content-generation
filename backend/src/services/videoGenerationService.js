import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Video from '../models/Video.js';
import { promisify } from 'util';
import stream from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
const MODEL_ID = 'veo-2.0-generate-001';
const BUCKET_NAME = process.env.GOOGLE_CLOUD_BUCKET_NAME;

// Initialize Google Cloud services only if credentials are available
let auth, storage, bucket, STORAGE_URI;

if (PROJECT_ID && BUCKET_NAME) {
  try {
    // Use default credentials (like gcloud auth application-default login)
    auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    storage = new Storage({
      projectId: PROJECT_ID
      // No keyFilename needed - uses default credentials
    });

    bucket = storage.bucket(BUCKET_NAME);
    STORAGE_URI = `gs://${BUCKET_NAME}/generated-videos/`;
    
    console.log('✅ Google Cloud Storage initialized successfully');
    console.log(`📦 Using bucket: ${BUCKET_NAME}`);
  } catch (error) {
    console.warn('⚠️ Google Cloud Storage initialization failed:', error.message);
    console.warn('Video generation will not be available until Google Cloud is properly configured');
    console.warn('Run: gcloud auth application-default login');
  }
} else {
  console.warn('⚠️ Google Cloud credentials not configured. Video generation will not be available.');
  console.warn('Please set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_BUCKET_NAME in your environment variables.');
  console.warn('Then run: gcloud auth application-default login');
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
const videosDir = path.join(uploadsDir, 'videos');
const tempDir = path.join(uploadsDir, 'temp');

[uploadsDir, videosDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

class VideoGenerationService {
  constructor() {
    this.endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predictLongRunning`;
  }

  // Get access token for Google Cloud API
  async getAccessToken() {
    if (!auth) {
      throw new Error('Google Cloud not configured. Please set up your Google Cloud credentials.');
    }
    
    try {
      const client = await auth.getClient();
      const token = await client.getAccessToken();
      return token.token;
    } catch (error) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to authenticate with Google Cloud');
    }
  }

  // Upload image to Google Cloud Storage for image-to-video
  async uploadImageToGCS(imageBuffer, filename) {
    if (!bucket) {
      throw new Error('Google Cloud Storage not configured. Please set up your Google Cloud credentials.');
    }
    
    try {
      const gcsFileName = `input-images/${Date.now()}-${filename}`;
      const file = bucket.file(gcsFileName);
      
      await file.save(imageBuffer, {
        metadata: {
          contentType: 'image/jpeg'
        }
      });

      return `gs://${BUCKET_NAME}/${gcsFileName}`;
    } catch (error) {
      console.error('Error uploading image to GCS:', error);
      throw new Error('Failed to upload image to Google Cloud Storage');
    }
  }

  // Generate video using Veo2 API
  async generateVideo(videoData) {
    try {
      const token = await this.getAccessToken();
      
      // Build instances based on video type
      let instances;
      if (videoData.videoType === 'image-to-video' && videoData.inputImage) {
        instances = [{
          prompt: videoData.prompt,
          image: {
            gcsUri: videoData.inputImage.gcsUri,
            bytesBase64Encoded: null
          }
        }];
      } else {
        instances = [{
          prompt: videoData.prompt
        }];
      }

      const parameters = {
        aspectRatio: videoData.parameters.aspectRatio,
        durationSeconds: videoData.parameters.durationSeconds,
        sampleCount: videoData.parameters.sampleCount,
        storageUri: STORAGE_URI,
        enhancePrompt: videoData.parameters.enhancePrompt
      };

      const payload = {
        instances,
        parameters
      };

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      console.log('Sending request to Veo2 API:', {
        endpoint: this.endpoint,
        videoType: videoData.videoType,
        prompt: videoData.prompt.substring(0, 100) + '...'
      });

      const response = await axios.post(this.endpoint, payload, { headers });
      
      console.log('Veo2 API response status:', response.status);
      
      return {
        operationName: response.data.name,
        done: response.data.done || false,
        metadata: response.data.metadata || {},
        response: response.data.response || {}
      };

    } catch (error) {
      console.error('Error generating video:', error.response?.data || error.message);
      throw new Error(`Video generation failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Check operation status
  async checkOperationStatus(operationName) {
    try {
      const token = await this.getAccessToken();
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axios.get(operationName, { headers });
      
      return {
        done: response.data.done,
        metadata: response.data.metadata,
        response: response.data.response,
        error: response.data.error
      };

    } catch (error) {
      console.error('Error checking operation status:', error);
      throw new Error('Failed to check operation status');
    }
  }

  // Download video from GCS to local storage
  async downloadVideoFromGCS(gcsUri, videoId) {
    if (!bucket) {
      throw new Error('Google Cloud Storage not configured. Please set up your Google Cloud credentials.');
    }
    
    try {
      // Extract filename from GCS URI
      const gcsPath = gcsUri.replace(`gs://${BUCKET_NAME}/`, '');
      const filename = path.basename(gcsPath);
      const localPath = path.join(videosDir, `${videoId}-${filename}`);
      
      // Download file from GCS
      await bucket.file(gcsPath).download({
        destination: localPath
      });

      // Get file stats
      const stats = fs.statSync(localPath);
      
      return {
        localPath,
        filename: `${videoId}-${filename}`,
        size: stats.size
      };

    } catch (error) {
      console.error('Error downloading video from GCS:', error);
      throw new Error('Failed to download video from Google Cloud Storage');
    }
  }

  // Clean up temporary files
  async cleanupTempFiles(gcsUri) {
    if (!bucket) {
      console.warn('Google Cloud Storage not configured, skipping cleanup');
      return;
    }
    
    try {
      if (gcsUri) {
        const gcsPath = gcsUri.replace(`gs://${BUCKET_NAME}/`, '');
        await bucket.file(gcsPath).delete();
        console.log('Cleaned up GCS file:', gcsPath);
      }
    } catch (error) {
      console.error('Error cleaning up temp files:', error);
      // Don't throw error for cleanup failures
    }
  }

  // Process video generation workflow
  async processVideoGeneration(videoId) {
    try {
      const video = await Video.findById(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // Update status to processing
      await video.updateStatus('processing');

      // Generate video
      const operation = await this.generateVideo(video);
      
      // Save operation details
      video.operation = operation;
      await video.save();

      // Start polling for completion
      await this.pollForCompletion(videoId);

    } catch (error) {
      console.error('Error in video generation process:', error);
      
      const video = await Video.findById(videoId);
      if (video) {
        await video.updateStatus('failed', { errorMessage: error.message });
      }
      
      throw error;
    }
  }

  // Poll for operation completion
  async pollForCompletion(videoId, maxAttempts = 60) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const video = await Video.findById(videoId);
        if (!video || !video.operation.name) {
          throw new Error('Video or operation not found');
        }

        const status = await this.checkOperationStatus(video.operation.name);
        
        // Update operation details
        video.operation = {
          ...video.operation,
          ...status
        };
        await video.save();

        if (status.done) {
          if (status.error) {
            // Operation failed
            await video.updateStatus('failed', { 
              errorMessage: status.error.message || 'Video generation failed' 
            });
            throw new Error(status.error.message || 'Video generation failed');
          } else {
            // Operation completed successfully
            await this.handleSuccessfulGeneration(video, status);
            break;
          }
        }

        // Wait 10 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 10000));
        attempts++;

      } catch (error) {
        console.error(`Error in poll attempt ${attempts}:`, error);
        
        if (attempts >= maxAttempts - 1) {
          const video = await Video.findById(videoId);
          if (video) {
            await video.updateStatus('failed', { 
              errorMessage: 'Operation timed out' 
            });
          }
          throw new Error('Video generation timed out');
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // Handle successful video generation
  async handleSuccessfulGeneration(video, status) {
    try {
      // Extract video URI from response
      const videoUri = status.response?.videoUri || status.response?.outputUri;
      if (!videoUri) {
        throw new Error('No video URI in response');
      }

      // Download video to local storage
      const downloadResult = await this.downloadVideoFromGCS(videoUri, video._id);
      
      // Update video with local file information
      video.video = {
        ...video.video,
        gcsUri: videoUri,
        localPath: downloadResult.localPath,
        filename: downloadResult.filename,
        size: downloadResult.size
      };

      // Update status to completed
      await video.updateStatus('completed');
      
      // Clean up GCS file after successful download
      await this.cleanupTempFiles(videoUri);
      
      console.log(`Video generation completed for video ${video._id}`);

    } catch (error) {
      console.error('Error handling successful generation:', error);
      await video.updateStatus('failed', { errorMessage: error.message });
      throw error;
    }
  }

  // Get video file stream for download
  async getVideoStream(videoId, userId) {
    try {
      const video = await Video.findById(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // Check if user owns the video or video is public
      if (video.user.toString() !== userId.toString() && video.isPrivate) {
        throw new Error('Access denied');
      }

      if (!video.video.localPath || !fs.existsSync(video.video.localPath)) {
        throw new Error('Video file not found');
      }

      // Increment download count
      await video.incrementDownloads();

      return fs.createReadStream(video.video.localPath);

    } catch (error) {
      console.error('Error getting video stream:', error);
      throw error;
    }
  }

  // Delete video and associated files
  async deleteVideo(videoId, userId) {
    try {
      const video = await Video.findById(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // Check if user owns the video
      if (video.user.toString() !== userId.toString()) {
        throw new Error('Access denied');
      }

      // Delete local file
      if (video.video.localPath && fs.existsSync(video.video.localPath)) {
        fs.unlinkSync(video.video.localPath);
      }

      // Clean up GCS file if still exists
      if (video.video.gcsUri) {
        await this.cleanupTempFiles(video.video.gcsUri);
      }

      // Delete from database
      await Video.findByIdAndDelete(videoId);

      return { message: 'Video deleted successfully' };

    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }

  // Get video statistics
  async getVideoStats(userId) {
    try {
      const stats = await Video.getVideoStats(userId);
      const totalVideos = await Video.countDocuments({ user: userId });
      
      return {
        total: totalVideos,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {})
      };

    } catch (error) {
      console.error('Error getting video stats:', error);
      throw error;
    }
  }
}

export default new VideoGenerationService(); 