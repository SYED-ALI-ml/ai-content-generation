import { validationResult } from 'express-validator';
import Video from '../models/Video.js';
import User from '../models/User.js';
import videoGenerationService from '../services/videoGenerationService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

class VideoController {
  // Create a new video generation request
  async createVideo(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const {
        title,
        prompt,
        description,
        videoType,
        parameters: parametersString,
        tags
      } = req.body;

      // Parse parameters if it's a JSON string (from FormData)
      let parameters;
      try {
        parameters = typeof parametersString === 'string' 
          ? JSON.parse(parametersString) 
          : parametersString;
      } catch (error) {
        console.error('Error parsing parameters:', error);
        parameters = {};
      }

      console.log('📋 Received parameters:', {
        raw: parametersString,
        parsed: parameters,
        durationSeconds: parameters?.durationSeconds
      });

      // Validate video type
      if (!['text-to-video', 'image-to-video'].includes(videoType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid video type. Must be "text-to-video" or "image-to-video"'
        });
      }

      // Validate image requirement for image-to-video
      if (videoType === 'image-to-video' && !req.file) {
        return res.status(400).json({
          success: false,
          message: 'Image file is required for image-to-video generation'
        });
      }

      // Validate parameters
      const validAspectRatios = ['16:9', '1:1', '9:16'];
      if (parameters?.aspectRatio && !validAspectRatios.includes(parameters.aspectRatio)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid aspect ratio. Must be one of: 16:9, 1:1, 9:16'
        });
      }

      if (parameters?.durationSeconds && (parameters.durationSeconds < 1 || parameters.durationSeconds > 20)) {
        return res.status(400).json({
          success: false,
          message: 'Duration must be between 1 and 20 seconds'
        });
      }

      // Validate seed parameter
      if (parameters?.seed && (parameters.seed < 1 || parameters.seed > 999999999)) {
        return res.status(400).json({
          success: false,
          message: 'Seed must be between 1 and 999999999'
        });
      }

      // Validate videoGenerationConfig parameters
      if (parameters?.videoGenerationConfig) {
        const config = parameters.videoGenerationConfig;
        
        const validMovements = ['slow', 'medium', 'fast'];
        if (config.movement && !validMovements.includes(config.movement)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid movement. Must be one of: slow, medium, fast'
          });
        }

        const validCameras = ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'static'];
        if (config.camera && !validCameras.includes(config.camera)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid camera. Must be one of: zoom_in, zoom_out, pan_left, pan_right, static'
          });
        }

        const validStyles = ['cinematic', 'photorealistic', 'anime', 'cartoon', 'artistic'];
        if (config.style && !validStyles.includes(config.style)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid style. Must be one of: cinematic, photorealistic, anime, cartoon, artistic'
          });
        }

        const validLighting = ['natural', 'sunset', 'sunrise', 'golden_hour', 'blue_hour', 'studio'];
        if (config.lighting && !validLighting.includes(config.lighting)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid lighting. Must be one of: natural, sunset, sunrise, golden_hour, blue_hour, studio'
          });
        }

        const validColorTones = ['warm', 'cool', 'neutral', 'vibrant', 'muted'];
        if (config.colorTone && !validColorTones.includes(config.colorTone)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid colorTone. Must be one of: warm, cool, neutral, vibrant, muted'
          });
        }
      }

      // Create video document
      const videoData = {
        user: req.user.id,
        title,
        prompt,
        description,
        videoType,
        parameters: {
          aspectRatio: parameters?.aspectRatio || '16:9',
          durationSeconds: parameters?.durationSeconds || 15,
          sampleCount: parameters?.sampleCount || 1,
          enhancePrompt: parameters?.enhancePrompt !== false,
          seed: parameters?.seed || null,
          videoGenerationConfig: {
            movement: parameters?.videoGenerationConfig?.movement || 'medium',
            camera: parameters?.videoGenerationConfig?.camera || 'static',
            style: parameters?.videoGenerationConfig?.style || 'cinematic',
            lighting: parameters?.videoGenerationConfig?.lighting || 'natural',
            colorTone: parameters?.videoGenerationConfig?.colorTone || 'neutral'
          }
        },
        tags: tags ? tags.split(',').map(tag => tag.trim()) : []
      };

      // Handle image upload for image-to-video
      if (videoType === 'image-to-video' && req.file) {
        try {
          // Validate file exists and has proper mime type
          if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({
              success: false,
              message: 'Invalid image file. Please upload a valid image (JPEG, PNG, GIF, WebP).'
            });
          }

          const imageBuffer = fs.readFileSync(req.file.path);
          const gcsUri = await videoGenerationService.uploadImageToGCS(
            imageBuffer, 
            req.file.filename, 
            req.file.mimetype
          );
          
          videoData.inputImage = {
            url: req.file.path,
            filename: req.file.filename,
            gcsUri,
            mimetype: req.file.mimetype
          };

          // Clean up temporary file
          fs.unlinkSync(req.file.path);
        } catch (error) {
          console.error('Error handling image upload:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to process image upload: ' + error.message
          });
        }
      }

      const video = new Video(videoData);
      await video.save();

      // Start video generation process in background
      videoGenerationService.processVideoGeneration(video._id).catch(error => {
        console.error('Background video generation failed:', error);
      });

      res.status(201).json({
        success: true,
        message: 'Video generation started',
        data: {
          id: video._id,
          title: video.title,
          status: video.status,
          videoType: video.videoType,
          createdAt: video.createdAt
        }
      });

    } catch (error) {
      console.error('Error creating video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create video generation request',
        error: error.message
      });
    }
  }

  // Get user's videos with pagination and filtering
  async getUserVideos(req, res) {
    try {
      const { page = 1, limit = 10, status, videoType } = req.query;
      const userId = req.user.id;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        videoType
      };

      const videos = await Video.getUserVideos(userId, options);
      const totalVideos = await Video.countDocuments({ user: userId });

      // Get video statistics
      const statsData = await videoGenerationService.getVideoStats(userId);
      const stats = {
        totalVideos: statsData.total,
        completedVideos: statsData.byStatus.completed || 0,
        processingVideos: statsData.byStatus.processing || 0,
        failedVideos: statsData.byStatus.failed || 0,
        pendingVideos: statsData.byStatus.pending || 0
      };

      res.json({
        success: true,
        data: {
          videos,
          stats,
          pagination: {
            currentPage: options.page,
            totalPages: Math.ceil(totalVideos / options.limit),
            totalVideos,
            hasNext: options.page * options.limit < totalVideos,
            hasPrev: options.page > 1
          }
        }
      });

    } catch (error) {
      console.error('Error getting user videos:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve videos',
        error: error.message
      });
    }
  }

  // Get a specific video by ID
  async getVideo(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const video = await Video.findById(id).populate('user', 'username email');
      
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      // Check if user owns the video or video is public
      if (video.user._id.toString() !== userId && video.isPrivate) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Increment view count if user doesn't own the video
      if (video.user._id.toString() !== userId) {
        await video.incrementViews();
      }

      res.json({
        success: true,
        data: video
      });

    } catch (error) {
      console.error('Error getting video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve video',
        error: error.message
      });
    }
  }

  // Download video file
  async downloadVideo(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      console.log(`📥 Download request for video ${id} by user ${userId}`);

      const video = await Video.findById(id);
      
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      // Check if user owns the video or video is public
      if (video.user.toString() !== userId && video.isPrivate) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (video.status !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Video is not ready for download'
        });
      }

      const videoData = await videoGenerationService.getVideoData(id, userId);
      
      // Handle GCS videos (with redirectUrl)
      if (videoData.redirectUrl) {
        console.log(`🔗 Redirecting download to GCS URL for video ${id}`);
        
        // For downloads, we want to fetch the video from GCS and stream it through our server
        // This ensures proper filename and download behavior
        
        try {
          const response = await axios({
            method: 'GET',
            url: videoData.redirectUrl,
            responseType: 'stream'
          });
          
          res.setHeader('Content-Type', videoData.contentType || 'video/mp4');
          res.setHeader('Content-Disposition', `attachment; filename="${videoData.filename}"`);
          res.setHeader('Content-Length', response.headers['content-length'] || videoData.size);
          
          // Pipe the GCS stream to the response
          response.data.pipe(res);
          
        } catch (streamError) {
          console.error('Error streaming from GCS:', streamError);
          // Fallback: redirect to GCS URL
          return res.redirect(videoData.redirectUrl);
        }
      }
      // Handle videos with binary data (legacy)
      else if (videoData.data) {
        console.log(`📦 Sending binary data for video ${id}: ${videoData.size} bytes`);
        
        res.setHeader('Content-Type', videoData.contentType || 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename="${videoData.filename}"`);
        res.setHeader('Content-Length', videoData.size);
        
        res.send(videoData.data);
      }
      else {
        throw new Error('No video data available for download');
      }

    } catch (error) {
      console.error('Error downloading video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download video',
        error: error.message
      });
    }
  }

  // Stream video file for playback
  async streamVideo(req, res) {
    try {
      console.log('🎬 Stream video request:', { 
        id: req.params.id, 
        hasToken: !!req.query.token,
        userAgent: req.get('User-Agent')?.substring(0, 50) + '...'
      });
      
      const { id } = req.params;
      const { token } = req.query;

      if (!token) {
        console.log('❌ No token provided in query');
        
        // Set CORS headers for token errors
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Return minimal video response to avoid CORS issues
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', '0');
        return res.status(401).end();
      }

      // Verify token manually since this endpoint doesn't use auth middleware
      
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (error) {
        console.log('❌ Invalid token provided');
        
        // Set CORS headers for token validation errors
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Return minimal video response to avoid CORS issues
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', '0');
        return res.status(401).end();
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        console.log('❌ User not found for token');
        
        // Set CORS headers for user not found errors
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Return minimal video response to avoid CORS issues
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', '0');
        return res.status(401).end();
      }

      const video = await Video.findById(id);
      
      if (!video) {
        console.log(`❌ Video not found: ${id}`);
        
        // Set CORS headers for video not found errors
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Return minimal video response to avoid CORS issues
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', '0');
        return res.status(404).end();
      }

      // Check if user owns the video or video is public
      if (video.user.toString() !== user._id.toString() && video.isPrivate) {
        console.log(`❌ Access denied for video ${id} - user ${user._id} tried to access video owned by ${video.user}`);
        
        // Set CORS headers for access denied errors
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Return minimal video response to avoid CORS issues
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', '0');
        return res.status(404).end();
      }

      if (video.status !== 'completed') {
        console.log(`❌ Video not ready for streaming: ${id} (status: ${video.status})`);
        
        // Set CORS headers for video not ready errors
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Return minimal video response to avoid CORS issues
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', '0');
        return res.status(404).end();
      }

      const videoData = await videoGenerationService.getVideoData(id, user._id);
      
      // If video has a redirect URL (new GCS direct streaming), redirect to it
      if (videoData.redirectUrl) {
        console.log(`🔗 Redirecting to GCS URL for ${id}: ${videoData.redirectUrl}`);
        
        // Set CORS headers for redirect
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // Redirect to the public GCS URL
        return res.redirect(302, videoData.redirectUrl);
      }
      
      // If video has binary data (old system), serve it directly
      if (videoData.data) {
        console.log(`✅ Serving video data for ${id}: ${videoData.size} bytes, type: ${videoData.contentType}`);
        
        // Set CORS headers for video streaming
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        res.setHeader('Content-Type', videoData.contentType);
        res.setHeader('Content-Length', videoData.size);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        
        return res.send(videoData.data);
      }
      
      throw new Error('No video data or redirect URL available');

    } catch (error) {
      console.error(`❌ Error streaming video ${req.params.id}:`, error.message);
      
      // Set CORS headers even for errors
      res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // For video streaming errors, return a minimal video response to avoid CORS issues
      // This prevents browsers from treating JSON error responses as CORS violations
      if (error.message.includes('Access denied') || error.message.includes('not found')) {
        // Return a minimal MP4 header to satisfy video element expectations
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Length', '0');
        res.status(404).end();
      } else {
        // For other errors, return JSON
        res.setHeader('Content-Type', 'application/json');
        res.status(500).json({
          success: false,
          message: 'Failed to stream video',
          error: error.message
        });
      }
    }
  }

  // Update video details
  async updateVideo(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title, description, tags, isPrivate } = req.body;

      const video = await Video.findById(id);
      
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      // Check if user owns the video
      if (video.user.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Update allowed fields
      if (title) video.title = title;
      if (description !== undefined) video.description = description;
      if (tags) video.tags = tags.split(',').map(tag => tag.trim());
      if (isPrivate !== undefined) video.isPrivate = isPrivate;

      await video.save();

      res.json({
        success: true,
        message: 'Video updated successfully',
        data: video
      });

    } catch (error) {
      console.error('Error updating video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update video',
        error: error.message
      });
    }
  }

  // Delete video
  async deleteVideo(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const result = await videoGenerationService.deleteVideo(id, userId);

      res.json({
        success: true,
        message: result.message
      });

    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete video',
        error: error.message
      });
    }
  }

  // Get video statistics
  async getVideoStats(req, res) {
    try {
      const userId = req.user.id;
      const stats = await videoGenerationService.getVideoStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Error getting video stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get video statistics',
        error: error.message
      });
    }
  }

  // Check video generation status
  async checkVideoStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const video = await Video.findById(id);
      
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      // Check if user owns the video
      if (video.user.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: {
          id: video._id,
          status: video.status,
          operation: video.operation,
          processingInfo: video.processingInfo,
          video: video.status === 'completed' && video.video ? {
            filename: video.video.filename,
            url: video.video.url, // Include the GCS URL
            size: video.video.size,
            duration: video.video.duration,
            contentType: video.video.contentType
          } : null
        }
      });

    } catch (error) {
      console.error('Error checking video status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check video status',
        error: error.message
      });
    }
  }

  // Force completion check for stuck videos
  async forceCompletionCheck(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verify user owns the video
      const video = await Video.findById(id);
      if (!video) {
        return res.status(404).json({
          success: false,
          message: 'Video not found'
        });
      }

      if (video.user.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const result = await videoGenerationService.forceCompletionCheck(id);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error forcing completion check:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check video completion'
      });
    }
  }

  // Check all stuck videos (admin function)
  async checkStuckVideos(req, res) {
    try {
      const result = await videoGenerationService.checkAndCompleteStuckVideos();

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Error checking stuck videos:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to check stuck videos'
      });
    }
  }
}

export { VideoController, upload }; 