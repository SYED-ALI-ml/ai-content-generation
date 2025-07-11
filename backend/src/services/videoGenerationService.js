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
const KEY_FILE = process.env.GOOGLE_CLOUD_KEY_FILE;

// Initialize Google Cloud services only if credentials are available
let auth, storage, bucket, STORAGE_URI;

if (PROJECT_ID && BUCKET_NAME) {
  try {
    // Use service account key file for authentication
    const keyFilePath = path.join(__dirname, '../../', KEY_FILE || 'service-account-key.json');
    
    auth = new GoogleAuth({
      keyFilename: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    storage = new Storage({
      projectId: PROJECT_ID,
      keyFilename: keyFilePath
    });

    bucket = storage.bucket(BUCKET_NAME);
    STORAGE_URI = `gs://${BUCKET_NAME}/generated-videos/`;
    
    console.log('✅ Google Cloud Storage initialized successfully with service account');
    console.log(`📦 Using bucket: ${BUCKET_NAME}`);
    console.log(`🔑 Using key file: ${keyFilePath}`);
  } catch (error) {
    console.warn('⚠️ Google Cloud Storage initialization failed:', error.message);
    console.warn('Video generation will not be available until Google Cloud is properly configured');
    console.warn('Make sure the service account key file exists and has proper permissions');
  }
} else {
  console.warn('⚠️ Google Cloud credentials not configured. Video generation will not be available.');
  console.warn('Please set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_BUCKET_NAME in your environment variables.');
  console.warn('Make sure the service account key file is available');
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
  async uploadImageToGCS(imageBuffer, filename, mimeType = 'image/jpeg') {
    if (!bucket) {
      throw new Error('Google Cloud Storage not configured. Please set up your Google Cloud credentials.');
    }
    
    try {
      const gcsFileName = `input-images/${Date.now()}-${filename}`;
      const file = bucket.file(gcsFileName);
      
      // Validate and set proper content type
      const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const contentType = validMimeTypes.includes(mimeType) ? mimeType : 'image/jpeg';
      
      await file.save(imageBuffer, {
        metadata: {
          contentType: contentType
        }
      });

      console.log(`✅ Image uploaded to GCS: ${gcsFileName} (${contentType})`);
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
        if (!videoData.inputImage.gcsUri) {
          throw new Error('Image GCS URI is required for image-to-video generation');
        }
        
        if (!videoData.inputImage.mimetype) {
          throw new Error('Image MIME type is required for image-to-video generation');
        }
        
        console.log('Creating image-to-video instance with:', {
          gcsUri: videoData.inputImage.gcsUri,
          mimeType: videoData.inputImage.mimetype
        });
        
        instances = [{
          prompt: videoData.prompt,
          image: {
            gcsUri: videoData.inputImage.gcsUri,
            mimeType: videoData.inputImage.mimetype
          }
        }];
      } else {
        instances = [{
          prompt: videoData.prompt
        }];
      }

      // Build parameters with all supported options
      const parameters = {
        aspectRatio: videoData.parameters.aspectRatio,
        durationSeconds: videoData.parameters.durationSeconds,
        sampleCount: videoData.parameters.sampleCount,
        storageUri: STORAGE_URI,
        enhancePrompt: videoData.parameters.enhancePrompt
      };

      // Add seed if provided
      if (videoData.parameters.seed) {
        parameters.seed = videoData.parameters.seed;
      }

      // Add videoGenerationConfig if any advanced options are provided
      if (videoData.parameters.videoGenerationConfig) {
        const config = videoData.parameters.videoGenerationConfig;
        parameters.videoGenerationConfig = {};
        
        if (config.movement && config.movement !== 'medium') {
          parameters.videoGenerationConfig.movement = config.movement;
        }
        if (config.camera && config.camera !== 'static') {
          parameters.videoGenerationConfig.camera = config.camera;
        }
        if (config.style && config.style !== 'cinematic') {
          parameters.videoGenerationConfig.style = config.style;
        }
        if (config.lighting && config.lighting !== 'natural') {
          parameters.videoGenerationConfig.lighting = config.lighting;
        }
        if (config.colorTone && config.colorTone !== 'neutral') {
          parameters.videoGenerationConfig.colorTone = config.colorTone;
        }
      }

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
        prompt: videoData.prompt.substring(0, 100) + '...',
        hasImage: videoData.videoType === 'image-to-video' && videoData.inputImage,
        imageMimeType: videoData.inputImage?.mimetype,
        parameters: {
          aspectRatio: parameters.aspectRatio,
          durationSeconds: parameters.durationSeconds,
          seed: parameters.seed,
          videoGenerationConfig: parameters.videoGenerationConfig
        }
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

  // Download video from GCS to MongoDB
  async downloadVideoFromGCS(gcsUri, videoId) {
    if (!bucket) {
      throw new Error('Google Cloud Storage not configured. Please set up your Google Cloud credentials.');
    }
    
    try {
      // Extract filename from GCS URI
      const gcsPath = gcsUri.replace(`gs://${BUCKET_NAME}/`, '');
      const filename = path.basename(gcsPath);
      
      console.log(`📥 Downloading video data from GCS: ${gcsPath}`);
      
      // Download file data to memory
      const [fileData] = await bucket.file(gcsPath).download();
      
      console.log(`✅ Downloaded video data: ${fileData.length} bytes`);
      
      return {
        data: fileData,
        filename: `${videoId}-${filename}`,
        size: fileData.length,
        contentType: 'video/mp4'
      };

    } catch (error) {
      console.error('Error downloading video from GCS:', error);
      throw new Error('Failed to download video from Google Cloud Storage');
    }
  }

  // Clean up temporary files (no longer needed since we keep videos in GCS)
  async cleanupTempFiles(gcsUri) {
    // No longer delete GCS files since we serve them directly
    console.log('Keeping GCS file for direct streaming:', gcsUri);
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
        
        // Clean up temporary input image from GCS if it exists (even on failure)
        if (video.inputImage && video.inputImage.gcsUri) {
          await this.cleanupTemporaryImage(video.inputImage.gcsUri);
        }
      }
      
      throw error;
    }
  }

  // Check if video exists in bucket
  async checkVideoInBucket(videoId) {
    if (!bucket) {
      return null;
    }
    
    try {
      const video = await Video.findById(videoId);
      if (!video || !video.processingInfo?.startedAt) {
        return null;
      }
      
      // List all files in the generated-videos directory
      const [files] = await bucket.getFiles({
        prefix: 'generated-videos/'
      });
      
      console.log(`🔍 Checking ${files.length} files in bucket for video ${videoId}`);
      
      const videoStartTime = new Date(video.processingInfo.startedAt);
      let bestMatch = null;
      let bestMatchScore = 0;
      
      // Look for video files that might match this generation
      for (const file of files) {
        if (file.name.includes('.mp4') || file.name.includes('.mov')) {
          const fileTime = new Date(file.metadata.timeCreated);
          
          // Check if file was created after video generation started
          if (fileTime >= videoStartTime) {
            // Calculate how close the file creation time is to video start time
            const timeDiff = Math.abs(fileTime.getTime() - videoStartTime.getTime());
            const score = 1 / (timeDiff + 1); // Higher score for closer times
            
            console.log(`📹 Found video file: ${file.name}, created: ${fileTime.toISOString()}, score: ${score}`);
            
            if (score > bestMatchScore) {
              bestMatch = file;
              bestMatchScore = score;
            }
          }
        }
      }
      
      if (bestMatch) {
        console.log(`🎬 Best match video file: ${bestMatch.name} for video ${videoId}`);
        return `gs://${BUCKET_NAME}/${bestMatch.name}`;
      }
      
      return null;
    } catch (error) {
      console.error('Error checking video in bucket:', error);
      return null;
    }
  }

  // Enhanced polling with bucket checking
  async pollForCompletion(videoId, maxAttempts = 60) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const video = await Video.findById(videoId);
        if (!video) {
          throw new Error('Video not found');
        }

        // First, check the operation status if we have an operation name
        let operationStatus = null;
        if (video.operation?.name) {
          try {
            operationStatus = await this.checkOperationStatus(video.operation.name);
            
            // Update operation details
            video.operation = {
              ...video.operation,
              ...operationStatus
            };
            await video.save();
          } catch (error) {
            console.warn(`Warning: Could not check operation status: ${error.message}`);
          }
        }

        // Check if operation is done
        if (operationStatus?.done) {
          if (operationStatus.error) {
            // Operation failed
            await video.updateStatus('failed', { 
              errorMessage: operationStatus.error.message || 'Video generation failed' 
            });
            throw new Error(operationStatus.error.message || 'Video generation failed');
          } else {
            // Operation completed successfully
            await this.handleSuccessfulGeneration(video, operationStatus);
            break;
          }
        }

        // Even if operation isn't marked as done, check if video exists in bucket
        const bucketVideoUri = await this.checkVideoInBucket(videoId);
        if (bucketVideoUri) {
          console.log(`🎉 Video found in bucket, completing generation for ${videoId}`);
          
          // Create a mock successful status
          const mockStatus = {
            done: true,
            response: {
              videoUri: bucketVideoUri
            }
          };
          
          await this.handleSuccessfulGeneration(video, mockStatus);
          break;
        }

        console.log(`⏳ Polling attempt ${attempts + 1}/${maxAttempts} for video ${videoId}`);
        
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

      // Get file metadata from GCS
      const gcsPath = videoUri.replace(`gs://${BUCKET_NAME}/`, '');
      const file = bucket.file(gcsPath);
      const [metadata] = await file.getMetadata();
      
      // Generate signed URL (valid for 7 days) instead of making file public
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days from now
      });
      
      const publicUrl = signedUrl;
      
      // Update video with signed URL and metadata (no binary data)
      video.video = {
        ...video.video,
        gcsUri: videoUri,
        url: publicUrl,
        urlExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        filename: path.basename(gcsPath),
        size: metadata.size,
        contentType: metadata.contentType || 'video/mp4'
      };

      // Update status to completed
      await video.updateStatus('completed');
      
      console.log(`✅ Video URL saved to MongoDB for video ${video._id}: ${publicUrl}`);
      console.log(`🎉 Video generation completed for video ${video._id}`);

      // Clean up temporary input image from GCS if it exists
      if (video.inputImage && video.inputImage.gcsUri) {
        await this.cleanupTemporaryImage(video.inputImage.gcsUri);
      }

    } catch (error) {
      console.error('Error handling successful generation:', error);
      await video.updateStatus('failed', { errorMessage: error.message });
      throw error;
    }
  }

  // Clean up temporary image from GCS
  async cleanupTemporaryImage(gcsUri) {
    if (!bucket || !gcsUri) return;

    try {
      const gcsPath = gcsUri.replace(`gs://${BUCKET_NAME}/`, '');
      const file = bucket.file(gcsPath);
      
      // Check if file exists before attempting to delete
      const [exists] = await file.exists();
      if (exists) {
        await file.delete();
        console.log(`🧹 Cleaned up temporary image: ${gcsPath}`);
      }
    } catch (error) {
      console.error('Error cleaning up temporary image:', error);
      // Don't throw error as this is cleanup operation
    }
  }

  // Refresh signed URL if expired
  async refreshSignedUrl(video) {
    if (!video.video.gcsUri || !bucket) {
      return video.video.url;
    }

    try {
      const gcsPath = video.video.gcsUri.replace(`gs://${BUCKET_NAME}/`, '');
      const file = bucket.file(gcsPath);
      
      // Generate new signed URL (valid for 7 days)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days from now
      });
      
      // Update video with new signed URL
      video.video.url = signedUrl;
      video.video.urlExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await video.save();
      
      return signedUrl;
    } catch (error) {
      console.error('Error refreshing signed URL:', error);
      throw error;
    }
  }

  // Get video data from MongoDB
  async getVideoData(videoId, userId) {
    try {
      const video = await Video.findById(videoId);
      if (!video) {
        throw new Error('Video not found');
      }

      // Check if user owns the video or video is public
      if (video.user.toString() !== userId.toString() && video.isPrivate) {
        throw new Error('Access denied');
      }

      // Check if video has signed URL (new GCS direct streaming system)
      if (video.video.url) {
        let currentUrl = video.video.url;
        
        // Check if signed URL has expired and refresh if needed
        if (video.video.urlExpiry && new Date() > video.video.urlExpiry) {
          console.log(`🔄 Refreshing expired signed URL for video ${videoId}`);
          currentUrl = await this.refreshSignedUrl(video);
        }
        
        // Increment view count
        await video.incrementViews();

        return {
          redirectUrl: currentUrl,
          contentType: video.video.contentType || 'video/mp4',
          filename: video.video.filename,
          size: video.video.size
        };
      }

      // Check if video has binary data (old MongoDB system)
      if (video.video.data) {
        // Increment view count
        await video.incrementViews();

        return {
          data: video.video.data,
          contentType: video.video.contentType || 'video/mp4',
          filename: video.video.filename,
          size: video.video.size
        };
      }

      // Backward compatibility: check if video has local file (oldest system)
      if (video.video.localPath && fs.existsSync(video.video.localPath)) {
        console.log(`📁 Serving video from local file: ${video.video.localPath}`);
        
        // Read file data and convert to buffer
        const fileData = fs.readFileSync(video.video.localPath);
        
        // Increment view count
        await video.incrementViews();

        return {
          data: fileData,
          contentType: video.video.contentType || 'video/mp4',
          filename: video.video.filename,
          size: fileData.length
        };
      }

      throw new Error('Video data not found - no URL, binary data, or local file available');

    } catch (error) {
      console.error('Error getting video data:', error);
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

      // Clean up GCS file if exists
      if (video.video.gcsUri && bucket) {
        try {
          const gcsPath = video.video.gcsUri.replace(`gs://${BUCKET_NAME}/`, '');
          await bucket.file(gcsPath).delete();
          console.log('Deleted GCS file:', gcsPath);
        } catch (error) {
          console.warn('Could not delete GCS file:', error.message);
        }
      }

      // Delete from database
      await Video.findByIdAndDelete(videoId);

      return { message: 'Video deleted successfully' };

    } catch (error) {
      console.error('Error deleting video:', error);
      throw error;
    }
  }

  // Manual completion check for stuck videos
  async checkAndCompleteStuckVideos() {
    try {
      console.log('🔍 Checking for stuck processing videos...');
      
      // Find all videos that are still processing
      const processingVideos = await Video.find({ status: 'processing' });
      
      let completedCount = 0;
      
      for (const video of processingVideos) {
        try {
          // Check if video exists in bucket
          const bucketVideoUri = await this.checkVideoInBucket(video._id);
          
          if (bucketVideoUri) {
            console.log(`🎬 Found completed video in bucket for ${video._id}`);
            
            // Create a mock successful status
            const mockStatus = {
              done: true,
              response: {
                videoUri: bucketVideoUri
              }
            };
            
            await this.handleSuccessfulGeneration(video, mockStatus);
            completedCount++;
          }
        } catch (error) {
          console.error(`Error checking video ${video._id}:`, error);
        }
      }
      
      console.log(`✅ Completed ${completedCount} stuck videos`);
      return { completedCount, totalProcessing: processingVideos.length };
      
    } catch (error) {
      console.error('Error checking stuck videos:', error);
      throw error;
    }
  }

  // Force completion check for a specific video
  async forceCompletionCheck(videoId) {
    try {
      const video = await Video.findById(videoId);
      if (!video) {
        throw new Error('Video not found');
      }
      
      if (video.status !== 'processing') {
        return { message: 'Video is not in processing state', status: video.status };
      }
      
      // Check if video exists in bucket
      const bucketVideoUri = await this.checkVideoInBucket(videoId);
      
      if (bucketVideoUri) {
        console.log(`🎬 Forcing completion for video ${videoId}`);
        
        // Create a mock successful status
        const mockStatus = {
          done: true,
          response: {
            videoUri: bucketVideoUri
          }
        };
        
        await this.handleSuccessfulGeneration(video, mockStatus);
        return { message: 'Video completed successfully', status: 'completed' };
      } else {
        return { message: 'Video not found in bucket, still processing', status: 'processing' };
      }
      
    } catch (error) {
      console.error('Error forcing completion check:', error);
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