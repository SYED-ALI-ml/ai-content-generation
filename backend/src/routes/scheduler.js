import express from 'express';
import { body, validationResult } from 'express-validator';
import Post from '../models/Post.js';
import { protect } from '../middleware/auth.js';
import { publishPost } from '../services/socialMediaService.js';

const router = express.Router();

// @desc    Get scheduled posts
// @route   GET /api/scheduler
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, platform, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    const query = { user: req.user._id };
    
    if (status) query.status = status;
    if (platform) query['platforms.name'] = platform;
    
    if (startDate && endDate) {
      query.scheduledDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const posts = await Post.find(query)
      .sort({ scheduledDate: 1 })
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
    console.error('Get scheduled posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Schedule a post
// @route   POST /api/scheduler/schedule
// @access  Private
router.post('/schedule', protect, [
  body('postId')
    .isMongoId()
    .withMessage('Valid post ID is required'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Scheduled date must be a valid date')
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

    const { postId, scheduledDate } = req.body;

    const post = await Post.findOne({
      _id: postId,
      user: req.user._id
    });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if scheduled date is in the future
    const scheduled = new Date(scheduledDate);
    const now = new Date();
    
    if (scheduled <= now) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future'
      });
    }

    // Update post status and scheduled date
    post.status = 'scheduled';
    post.scheduledDate = scheduled;
    post.platforms.forEach(platform => {
      platform.status = 'scheduled';
    });

    await post.save();

    res.json({
      success: true,
      data: post,
      message: 'Post scheduled successfully'
    });
  } catch (error) {
    console.error('Schedule post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Cancel scheduled post
// @route   POST /api/scheduler/cancel/:id
// @access  Private
router.post('/cancel/:id', protect, async (req, res) => {
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

    if (post.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Only scheduled posts can be cancelled'
      });
    }

    // Update post status
    post.status = 'draft';
    post.platforms.forEach(platform => {
      if (platform.status === 'scheduled') {
        platform.status = 'draft';
      }
    });

    await post.save();

    res.json({
      success: true,
      data: post,
      message: 'Post cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Publish post immediately
// @route   POST /api/scheduler/publish/:id
// @access  Private
router.post('/publish/:id', protect, async (req, res) => {
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

    if (post.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Post is already published'
      });
    }

    // Publish to all connected platforms
    const publishResults = [];
    
    for (const platform of post.platforms) {
      try {
        const result = await publishPost(post, platform.name, req.user);
        platform.status = 'published';
        platform.publishedAt = new Date();
        platform.postId = result.postId;
        publishResults.push({
          platform: platform.name,
          success: true,
          postId: result.postId
        });
      } catch (error) {
        platform.status = 'failed';
        platform.error = error.message;
        publishResults.push({
          platform: platform.name,
          success: false,
          error: error.message
        });
      }
    }

    // Update post status
    const hasFailures = publishResults.some(result => !result.success);
    post.status = hasFailures ? 'failed' : 'published';
    post.scheduledDate = new Date(); // Set to current time

    await post.save();

    res.json({
      success: true,
      data: {
        post,
        publishResults
      },
      message: hasFailures ? 'Post published with some failures' : 'Post published successfully'
    });
  } catch (error) {
    console.error('Publish post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get calendar view
// @route   GET /api/scheduler/calendar
// @access  Private
router.get('/calendar', protect, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    const startDate = new Date(year || new Date().getFullYear(), month ? month - 1 : new Date().getMonth(), 1);
    const endDate = new Date(year || new Date().getFullYear(), month ? month : new Date().getMonth() + 1, 0);

    const posts = await Post.find({
      user: req.user._id,
      scheduledDate: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ scheduledDate: 1 });

    // Group posts by date
    const calendarData = {};
    posts.forEach(post => {
      const dateKey = post.scheduledDate.toISOString().split('T')[0];
      if (!calendarData[dateKey]) {
        calendarData[dateKey] = [];
      }
      calendarData[dateKey].push({
        id: post._id,
        title: post.title,
        status: post.status,
        platforms: post.platforms.map(p => p.name)
      });
    });

    res.json({
      success: true,
      data: calendarData
    });
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get upcoming posts
// @route   GET /api/scheduler/upcoming
// @access  Private
router.get('/upcoming', protect, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const now = new Date();
    const upcomingPosts = await Post.find({
      user: req.user._id,
      status: 'scheduled',
      scheduledDate: { $gt: now }
    })
    .sort({ scheduledDate: 1 })
    .limit(parseInt(limit))
    .populate('user', 'name email');

    res.json({
      success: true,
      data: upcomingPosts
    });
  } catch (error) {
    console.error('Get upcoming posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Bulk schedule posts
// @route   POST /api/scheduler/bulk
// @access  Private
router.post('/bulk', protect, [
  body('postIds')
    .isArray({ min: 1 })
    .withMessage('At least one post ID is required'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Scheduled date must be a valid date')
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

    const { postIds, scheduledDate } = req.body;

    const scheduled = new Date(scheduledDate);
    const now = new Date();
    
    if (scheduled <= now) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date must be in the future'
      });
    }

    const results = await Promise.allSettled(
      postIds.map(async (postId) => {
        const post = await Post.findOne({
          _id: postId,
          user: req.user._id
        });

        if (!post) {
          throw new Error(`Post ${postId} not found`);
        }

        post.status = 'scheduled';
        post.scheduledDate = scheduled;
        post.platforms.forEach(platform => {
          platform.status = 'scheduled';
        });

        await post.save();
        return post;
      })
    );

    const successful = results.filter(result => result.status === 'fulfilled');
    const failed = results.filter(result => result.status === 'rejected');

    res.json({
      success: true,
      data: {
        successful: successful.length,
        failed: failed.length,
        results: results.map((result, index) => ({
          postId: postIds[index],
          success: result.status === 'fulfilled',
          error: result.status === 'rejected' ? result.reason.message : null
        }))
      },
      message: `Successfully scheduled ${successful.length} posts, ${failed.length} failed`
    });
  } catch (error) {
    console.error('Bulk schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 