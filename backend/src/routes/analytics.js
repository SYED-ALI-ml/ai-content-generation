import express from 'express';
import Analytics from '../models/Analytics.js';
import Post from '../models/Post.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get analytics overview
// @route   GET /api/analytics/overview
// @access  Private
router.get('/overview', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { user: req.user._id };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalReach: { $sum: '$metrics.reach' },
          totalEngagement: { $sum: { $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares'] } },
          totalViews: { $sum: '$metrics.views' },
          totalPosts: { $sum: 1 },
          avgEngagementRate: { $avg: '$engagement.rate' },
          totalRevenue: { $sum: '$metrics.revenue' }
        }
      }
    ]);

    const platformBreakdown = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$platform',
          reach: { $sum: '$metrics.reach' },
          engagement: { $sum: { $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares'] } },
          views: { $sum: '$metrics.views' },
          posts: { $sum: 1 },
          avgEngagementRate: { $avg: '$engagement.rate' }
        }
      }
    ]);

    const topPosts = await Analytics.find(query)
      .sort({ 'metrics.engagement.rate': -1 })
      .limit(5)
      .populate('post', 'title content media');

    res.json({
      success: true,
      data: {
        overview: analytics[0] || {
          totalReach: 0,
          totalEngagement: 0,
          totalViews: 0,
          totalPosts: 0,
          avgEngagementRate: 0,
          totalRevenue: 0
        },
        platformBreakdown,
        topPosts
      }
    });
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get analytics by platform
// @route   GET /api/analytics/platform/:platform
// @access  Private
router.get('/platform/:platform', protect, async (req, res) => {
  try {
    const { platform } = req.params;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    if (!['instagram', 'facebook', 'linkedin', 'youtube', 'twitter'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform'
      });
    }

    const query = { 
      user: req.user._id,
      platform 
    };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await Analytics.find(query)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('post', 'title content media');

    const total = await Analytics.countDocuments(query);

    const platformStats = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalReach: { $sum: '$metrics.reach' },
          totalEngagement: { $sum: { $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares'] } },
          totalViews: { $sum: '$metrics.views' },
          avgEngagementRate: { $avg: '$engagement.rate' },
          bestPerformingPost: { $max: '$engagement.rate' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        analytics,
        stats: platformStats[0] || {
          totalReach: 0,
          totalEngagement: 0,
          totalViews: 0,
          avgEngagementRate: 0,
          bestPerformingPost: 0
        },
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalAnalytics: total,
          hasNextPage: page * limit < total,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get platform analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get analytics by post
// @route   GET /api/analytics/post/:postId
// @access  Private
router.get('/post/:postId', protect, async (req, res) => {
  try {
    const { postId } = req.params;

    // Verify post belongs to user
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

    const analytics = await Analytics.find({
      post: postId,
      user: req.user._id
    }).sort({ date: -1 });

    const postStats = await Analytics.aggregate([
      {
        $match: {
          post: new mongoose.Types.ObjectId(postId),
          user: new mongoose.Types.ObjectId(req.user._id)
        }
      },
      {
        $group: {
          _id: '$platform',
          reach: { $sum: '$metrics.reach' },
          engagement: { $sum: { $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares'] } },
          views: { $sum: '$metrics.views' },
          engagementRate: { $avg: '$engagement.rate' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        post,
        analytics,
        platformStats: postStats
      }
    });
  } catch (error) {
    console.error('Get post analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get analytics insights
// @route   GET /api/analytics/insights
// @access  Private
router.get('/insights', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { user: req.user._id };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Best performing content types
    const contentInsights = await Analytics.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'posts',
          localField: 'post',
          foreignField: '_id',
          as: 'postData'
        }
      },
      { $unwind: '$postData' },
      {
        $group: {
          _id: '$postData.category',
          avgEngagementRate: { $avg: '$engagement.rate' },
          totalPosts: { $sum: 1 },
          totalReach: { $sum: '$metrics.reach' }
        }
      },
      { $sort: { avgEngagementRate: -1 } }
    ]);

    // Best posting times
    const timeInsights = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $hour: '$date' },
          avgEngagementRate: { $avg: '$engagement.rate' },
          totalPosts: { $sum: 1 }
        }
      },
      { $sort: { avgEngagementRate: -1 } },
      { $limit: 5 }
    ]);

    // Top performing hashtags
    const hashtagInsights = await Analytics.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'posts',
          localField: 'post',
          foreignField: '_id',
          as: 'postData'
        }
      },
      { $unwind: '$postData' },
      { $unwind: '$postData.metadata.hashtags' },
      {
        $group: {
          _id: '$postData.metadata.hashtags',
          avgEngagementRate: { $avg: '$engagement.rate' },
          totalPosts: { $sum: 1 }
        }
      },
      { $sort: { avgEngagementRate: -1 } },
      { $limit: 10 }
    ]);

    // Audience demographics
    const demographicInsights = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          ageRanges: {
            $push: '$demographics.ageRanges'
          },
          genders: {
            $push: '$demographics.genders'
          },
          locations: {
            $push: '$demographics.locations'
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        contentInsights,
        timeInsights,
        hashtagInsights,
        demographicInsights: demographicInsights[0] || {}
      }
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get analytics trends
// @route   GET /api/analytics/trends
// @access  Private
router.get('/trends', protect, async (req, res) => {
  try {
    const { startDate, endDate, platform } = req.query;
    
    const query = { user: req.user._id };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    if (platform) {
      query.platform = platform;
    }

    // Daily trends
    const dailyTrends = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          reach: { $sum: '$metrics.reach' },
          engagement: { $sum: { $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares'] } },
          views: { $sum: '$metrics.views' },
          posts: { $sum: 1 },
          avgEngagementRate: { $avg: '$engagement.rate' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Weekly trends
    const weeklyTrends = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $week: '$date' },
          reach: { $sum: '$metrics.reach' },
          engagement: { $sum: { $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares'] } },
          views: { $sum: '$metrics.views' },
          posts: { $sum: 1 },
          avgEngagementRate: { $avg: '$engagement.rate' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Monthly trends
    const monthlyTrends = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          reach: { $sum: '$metrics.reach' },
          engagement: { $sum: { $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares'] } },
          views: { $sum: '$metrics.views' },
          posts: { $sum: 1 },
          avgEngagementRate: { $avg: '$engagement.rate' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        dailyTrends,
        weeklyTrends,
        monthlyTrends
      }
    });
  } catch (error) {
    console.error('Get trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 