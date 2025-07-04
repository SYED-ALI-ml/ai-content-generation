import { validationResult } from 'express-validator';
import Video from '../models/Video.js';
import videoGenerationService from '../services/videoGenerationService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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
        parameters,
        tags
      } = req.body;

      // Validate video type
      if (!['text-to-video', 'image-to-video'].includes(videoType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid video type. Must be "text-to-video" or "image-to-video"'
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

      // Create video document
      const videoData = {
        user: req.user.id,
        title,
        prompt,
        description,
        videoType,
        parameters: {
          aspectRatio: parameters?.aspectRatio || '16:9',
          durationSeconds: parameters?.durationSeconds || 5,
          sampleCount: parameters?.sampleCount || 1,
          enhancePrompt: parameters?.enhancePrompt !== false
        },
        tags: tags ? tags.split(',').map(tag => tag.trim()) : []
      };

      // Handle image upload for image-to-video
      if (videoType === 'image-to-video' && req.file) {
        try {
          const imageBuffer = fs.readFileSync(req.file.path);
          const gcsUri = await videoGenerationService.uploadImageToGCS(imageBuffer, req.file.filename);
          
          videoData.inputImage = {
            url: req.file.path,
            filename: req.file.filename,
            gcsUri
          };

          // Clean up temporary file
          fs.unlinkSync(req.file.path);
        } catch (error) {
          console.error('Error handling image upload:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to process image upload'
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

      res.json({
        success: true,
        data: {
          videos,
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

      const videoStream = await videoGenerationService.getVideoStream(id, userId);
      
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `attachment; filename="${video.video.filename}"`);
      
      videoStream.pipe(res);

    } catch (error) {
      console.error('Error downloading video:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to download video',
        error: error.message
      });
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
          video: video.status === 'completed' ? {
            filename: video.video.filename,
            size: video.video.size,
            duration: video.video.duration
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
}

export { VideoController, upload }; 