import express from 'express';
import { body, param, query } from 'express-validator';
import { VideoController, upload } from '../controllers/videoController.js';
import { protect } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const streamRouter = express.Router();
const videoController = new VideoController();

// Apply authentication middleware to all routes except streaming
router.use(protect);

// Validation middleware
const validateCreateVideo = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('prompt')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Prompt must be between 10 and 1000 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('videoType')
    .isIn(['text-to-video', 'image-to-video'])
    .withMessage('Video type must be either "text-to-video" or "image-to-video"'),
  body('parameters.aspectRatio')
    .optional()
    .isIn(['16:9', '1:1', '9:16'])
    .withMessage('Aspect ratio must be one of: 16:9, 1:1, 9:16'),
  body('parameters.durationSeconds')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Duration must be between 1 and 20 seconds'),
  body('parameters.sampleCount')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('Sample count must be between 1 and 4'),
  body('parameters.enhancePrompt')
    .optional()
    .isBoolean()
    .withMessage('Enhance prompt must be a boolean'),
  body('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string')
];

const validateVideoId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid video ID format')
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed'])
    .withMessage('Invalid status filter'),
  query('videoType')
    .optional()
    .isIn(['text-to-video', 'image-to-video'])
    .withMessage('Invalid video type filter')
];

const validateUpdateVideo = [
  param('id')
    .isMongoId()
    .withMessage('Invalid video ID format'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('tags')
    .optional()
    .isString()
    .withMessage('Tags must be a comma-separated string'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be a boolean')
];

// Routes

/**
 * @route   POST /api/videos
 * @desc    Create a new video generation request
 * @access  Private
 */
router.post('/', 
  rateLimiter,
  upload.single('image'), // Handle image upload for image-to-video
  validateCreateVideo,
  videoController.createVideo
);

/**
 * @route   GET /api/videos
 * @desc    Get user's videos with pagination and filtering
 * @access  Private
 */
router.get('/',
  validatePagination,
  videoController.getUserVideos
);

/**
 * @route   GET /api/videos/stats
 * @desc    Get video statistics for the user
 * @access  Private
 */
router.get('/stats',
  videoController.getVideoStats
);

/**
 * @route   GET /api/videos/:id
 * @desc    Get a specific video by ID
 * @access  Private (owner or public videos)
 */
router.get('/:id',
  validateVideoId,
  videoController.getVideo
);

/**
 * @route   GET /api/videos/:id/status
 * @desc    Check video generation status
 * @access  Private (owner only)
 */
router.get('/:id/status',
  validateVideoId,
  videoController.checkVideoStatus
);

/**
 * @route   GET /api/videos/:id/download
 * @desc    Download video file
 * @access  Private (owner or public videos)
 */
router.get('/:id/download',
  validateVideoId,
  videoController.downloadVideo
);

/**
 * @route   PUT /api/videos/:id
 * @desc    Update video details
 * @access  Private (owner only)
 */
router.put('/:id',
  validateUpdateVideo,
  videoController.updateVideo
);

/**
 * @route   POST /api/videos/:id/force-completion
 * @desc    Force completion check for a stuck video
 * @access  Private (owner only)
 */
router.post('/:id/force-completion',
  validateVideoId,
  videoController.forceCompletionCheck
);

/**
 * @route   POST /api/videos/check-stuck
 * @desc    Check all stuck videos and complete them if possible
 * @access  Private
 */
router.post('/check-stuck',
  videoController.checkStuckVideos
);

/**
 * @route   DELETE /api/videos/:id
 * @desc    Delete video and associated files
 * @access  Private (owner only)
 */
router.delete('/:id',
  validateVideoId,
  videoController.deleteVideo
);

// Streaming routes (no auth middleware)
/**
 * @route   OPTIONS /api/stream/:id
 * @desc    Handle CORS preflight for video streaming
 * @access  Public
 */
streamRouter.options('/:id', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.status(200).end();
});

/**
 * @route   GET /api/stream/:id
 * @desc    Stream video file for playback (token via query param)
 * @access  Private (owner or public videos)
 */
streamRouter.get('/:id',
  validateVideoId,
  videoController.streamVideo
);

export default router;
export { streamRouter }; 