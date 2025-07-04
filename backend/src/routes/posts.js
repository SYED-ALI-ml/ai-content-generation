import express from 'express';
import { body, validationResult } from 'express-validator';
import Post from '../models/Post.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get all posts for user
// @route   GET /api/posts
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, platform, category, page = 1, limit = 10 } = req.query;
    
    const query = { user: req.user._id };
    
    if (status) query.status = status;
    if (platform) query['platforms.name'] = platform;
    if (category) query.category = category;

    const posts = await Post.find(query)
      .sort({ scheduledDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name email');

    const total = await Post.countDocuments(query);

    res.json({
      success: true,
      data: posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('user', 'name email');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Create new post
// @route   POST /api/posts
// @access  Private
router.post('/', protect, [
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 2200 })
    .withMessage('Content must be between 1 and 2200 characters'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Scheduled date must be a valid date'),
  body('platforms')
    .isArray({ min: 1 })
    .withMessage('At least one platform must be selected'),
  body('platforms.*.name')
    .isIn(['instagram', 'facebook', 'linkedin', 'youtube', 'twitter'])
    .withMessage('Invalid platform name'),
  body('category')
    .optional()
    .isIn(['business', 'entertainment', 'education', 'lifestyle', 'technology', 'other'])
    .withMessage('Invalid category'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
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

    const {
      title,
      content,
      media,
      platforms,
      scheduledDate,
      tags,
      category,
      aiGenerated,
      aiPrompt,
      settings,
      metadata
    } = req.body;

    // Check if scheduled date is in the future
    const scheduled = new Date(scheduledDate);
    const now = new Date();
    
    if (scheduled <= now) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future'
      });
    }

    const post = await Post.create({
      user: req.user._id,
      title,
      content,
      media: media || {},
      platforms,
      scheduledDate: scheduled,
      tags: tags || [],
      category: category || 'other',
      aiGenerated: aiGenerated || false,
      aiPrompt,
      settings: settings || {},
      metadata: metadata || {}
    });

    // Update user usage
    await req.user.updateOne({
      $inc: { 'usage.postsCreated': 1 }
    });

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Create post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
router.put('/:id', protect, [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 2200 })
    .withMessage('Content must be between 1 and 2200 characters'),
  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid date'),
  body('platforms')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one platform must be selected'),
  body('platforms.*.name')
    .optional()
    .isIn(['instagram', 'facebook', 'linkedin', 'youtube', 'twitter'])
    .withMessage('Invalid platform name')
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

    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if post is already published
    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update published post'
      });
    }

    // Check if new scheduled date is in the future
    if (req.body.scheduledDate) {
      const scheduled = new Date(req.body.scheduledDate);
      const now = new Date();
      
      if (scheduled <= now) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled date must be in the future'
        });
      }
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedPost
    });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if post is already published
    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete published post'
      });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Duplicate post
// @route   POST /api/posts/:id/duplicate
// @access  Private
router.post('/:id/duplicate', protect, async (req, res) => {
  try {
    const originalPost = await Post.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!originalPost) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Create new scheduled date (1 hour from now)
    const newScheduledDate = new Date();
    newScheduledDate.setHours(newScheduledDate.getHours() + 1);

    const duplicatedPost = await Post.create({
      user: req.user._id,
      title: `${originalPost.title} (Copy)`,
      content: originalPost.content,
      media: originalPost.media,
      platforms: originalPost.platforms.map(p => ({ ...p, status: 'draft' })),
      scheduledDate: newScheduledDate,
      tags: originalPost.tags,
      category: originalPost.category,
      aiGenerated: originalPost.aiGenerated,
      aiPrompt: originalPost.aiPrompt,
      settings: originalPost.settings,
      metadata: originalPost.metadata,
      status: 'draft'
    });

    res.status(201).json({
      success: true,
      data: duplicatedPost
    });
  } catch (error) {
    console.error('Duplicate post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get post statistics
// @route   GET /api/posts/stats/overview
// @access  Private
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const stats = await Post.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          publishedPosts: { $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] } },
          scheduledPosts: { $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } },
          draftPosts: { $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } },
          failedPosts: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          aiGeneratedPosts: { $sum: { $cond: ['$aiGenerated', 1, 0] } }
        }
      }
    ]);

    const platformStats = await Post.aggregate([
      { $match: { user: req.user._id } },
      { $unwind: '$platforms' },
      {
        $group: {
          _id: '$platforms.name',
          count: { $sum: 1 },
          published: { $sum: { $cond: [{ $eq: ['$platforms.status', 'published'] }, 1, 0] } },
          scheduled: { $sum: { $cond: [{ $eq: ['$platforms.status', 'scheduled'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$platforms.status', 'failed'] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalPosts: 0,
          publishedPosts: 0,
          scheduledPosts: 0,
          draftPosts: 0,
          failedPosts: 0,
          aiGeneratedPosts: 0
        },
        platforms: platformStats
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 