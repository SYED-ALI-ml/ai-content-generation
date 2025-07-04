import express from 'express';
import { body, validationResult } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { 
  getInstagramProfile,
  getFacebookPages,
  getLinkedInProfile,
  getYouTubeChannels,
  getTwitterProfile,
  publishToInstagram,
  publishToFacebook,
  publishToLinkedIn,
  publishToYouTube,
  publishToTwitter
} from '../services/socialMediaService.js';

const router = express.Router();

// @desc    Get Instagram profile
// @route   GET /api/social/instagram/profile
// @access  Private
router.get('/instagram/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.isSocialConnected('instagram')) {
      return res.status(400).json({
        success: false,
        message: 'Instagram account not connected'
      });
    }

    const profile = await getInstagramProfile(user);
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get Instagram profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Instagram profile'
    });
  }
});

// @desc    Get Facebook pages
// @route   GET /api/social/facebook/pages
// @access  Private
router.get('/facebook/pages', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.isSocialConnected('facebook')) {
      return res.status(400).json({
        success: false,
        message: 'Facebook account not connected'
      });
    }

    const pages = await getFacebookPages(user);
    
    res.json({
      success: true,
      data: pages
    });
  } catch (error) {
    console.error('Get Facebook pages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Facebook pages'
    });
  }
});

// @desc    Get LinkedIn profile
// @route   GET /api/social/linkedin/profile
// @access  Private
router.get('/linkedin/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.isSocialConnected('linkedin')) {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn account not connected'
      });
    }

    const profile = await getLinkedInProfile(user);
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get LinkedIn profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get LinkedIn profile'
    });
  }
});

// @desc    Get YouTube channels
// @route   GET /api/social/youtube/channels
// @access  Private
router.get('/youtube/channels', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.isSocialConnected('youtube')) {
      return res.status(400).json({
        success: false,
        message: 'YouTube account not connected'
      });
    }

    const channels = await getYouTubeChannels(user);
    
    res.json({
      success: true,
      data: channels
    });
  } catch (error) {
    console.error('Get YouTube channels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get YouTube channels'
    });
  }
});

// @desc    Get Twitter profile
// @route   GET /api/social/twitter/profile
// @access  Private
router.get('/twitter/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.isSocialConnected('twitter')) {
      return res.status(400).json({
        success: false,
        message: 'Twitter account not connected'
      });
    }

    const profile = await getTwitterProfile(user);
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Get Twitter profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Twitter profile'
    });
  }
});

// @desc    Publish to Instagram
// @route   POST /api/social/instagram/publish
// @access  Private
router.post('/instagram/publish', protect, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2200 })
    .withMessage('Content must be between 1 and 2200 characters'),
  body('media')
    .optional()
    .isArray()
    .withMessage('Media must be an array')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user.isSocialConnected('instagram')) {
      return res.status(400).json({
        success: false,
        message: 'Instagram account not connected'
      });
    }

    const { content, media, hashtags } = req.body;
    
    const result = await publishToInstagram(user, {
      content,
      media: media || [],
      hashtags: hashtags || []
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Post published to Instagram successfully'
    });
  } catch (error) {
    console.error('Publish to Instagram error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish to Instagram'
    });
  }
});

// @desc    Publish to Facebook
// @route   POST /api/social/facebook/publish
// @access  Private
router.post('/facebook/publish', protect, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 63206 })
    .withMessage('Content must be between 1 and 63206 characters'),
  body('pageId')
    .notEmpty()
    .withMessage('Page ID is required'),
  body('media')
    .optional()
    .isArray()
    .withMessage('Media must be an array')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user.isSocialConnected('facebook')) {
      return res.status(400).json({
        success: false,
        message: 'Facebook account not connected'
      });
    }

    const { content, pageId, media, link } = req.body;
    
    const result = await publishToFacebook(user, {
      content,
      pageId,
      media: media || [],
      link
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Post published to Facebook successfully'
    });
  } catch (error) {
    console.error('Publish to Facebook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish to Facebook'
    });
  }
});

// @desc    Publish to LinkedIn
// @route   POST /api/social/linkedin/publish
// @access  Private
router.post('/linkedin/publish', protect, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 3000 })
    .withMessage('Content must be between 1 and 3000 characters'),
  body('media')
    .optional()
    .isArray()
    .withMessage('Media must be an array')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user.isSocialConnected('linkedin')) {
      return res.status(400).json({
        success: false,
        message: 'LinkedIn account not connected'
      });
    }

    const { content, media, visibility } = req.body;
    
    const result = await publishToLinkedIn(user, {
      content,
      media: media || [],
      visibility: visibility || 'PUBLIC'
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Post published to LinkedIn successfully'
    });
  } catch (error) {
    console.error('Publish to LinkedIn error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish to LinkedIn'
    });
  }
});

// @desc    Publish to YouTube
// @route   POST /api/social/youtube/publish
// @access  Private
router.post('/youtube/publish', protect, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Description must be between 1 and 5000 characters'),
  body('videoUrl')
    .notEmpty()
    .withMessage('Video URL is required'),
  body('thumbnailUrl')
    .optional()
    .isURL()
    .withMessage('Thumbnail URL must be a valid URL')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user.isSocialConnected('youtube')) {
      return res.status(400).json({
        success: false,
        message: 'YouTube account not connected'
      });
    }

    const { title, description, videoUrl, thumbnailUrl, tags, category } = req.body;
    
    const result = await publishToYouTube(user, {
      title,
      description,
      videoUrl,
      thumbnailUrl,
      tags: tags || [],
      category
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Video published to YouTube successfully'
    });
  } catch (error) {
    console.error('Publish to YouTube error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish to YouTube'
    });
  }
});

// @desc    Publish to Twitter
// @route   POST /api/social/twitter/publish
// @access  Private
router.post('/twitter/publish', protect, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 280 })
    .withMessage('Content must be between 1 and 280 characters'),
  body('media')
    .optional()
    .isArray()
    .withMessage('Media must be an array')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user.isSocialConnected('twitter')) {
      return res.status(400).json({
        success: false,
        message: 'Twitter account not connected'
      });
    }

    const { content, media, replyTo } = req.body;
    
    const result = await publishToTwitter(user, {
      content,
      media: media || [],
      replyTo
    });
    
    res.json({
      success: true,
      data: result,
      message: 'Tweet published successfully'
    });
  } catch (error) {
    console.error('Publish to Twitter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to publish to Twitter'
    });
  }
});

// @desc    Get social media insights
// @route   GET /api/social/insights
// @access  Private
router.get('/insights', protect, async (req, res) => {
  try {
    const { platform, startDate, endDate } = req.query;
    const user = await User.findById(req.user._id);
    
    const connectedPlatforms = user.getConnectedPlatforms();
    const insights = {};

    for (const platformName of connectedPlatforms) {
      if (platform && platform !== platformName) continue;
      
      try {
        // This would integrate with each platform's API to get insights
        insights[platformName] = {
          followers: Math.floor(Math.random() * 10000),
          engagement: Math.random() * 10,
          reach: Math.floor(Math.random() * 50000),
          impressions: Math.floor(Math.random() * 100000)
        };
      } catch (error) {
        console.error(`Error getting insights for ${platformName}:`, error);
        insights[platformName] = { error: 'Failed to fetch insights' };
      }
    }

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Get social insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get social media insights'
    });
  }
});

export default router; 