import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', protect, [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto'),
  body('preferences.timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
  body('preferences.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be between 2 and 5 characters')
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

    const { name, preferences, notifications } = req.body;
    const updateFields = {};

    if (name) updateFields.name = name;
    if (preferences) updateFields.preferences = { ...req.user.preferences, ...preferences };
    if (notifications) updateFields.notifications = { ...req.user.notifications, ...notifications };

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Connect social media account
// @route   POST /api/users/connect-social
// @access  Private
router.post('/connect-social', protect, [
  body('platform')
    .isIn(['instagram', 'facebook', 'linkedin', 'youtube', 'twitter'])
    .withMessage('Invalid platform'),
  body('accessToken')
    .notEmpty()
    .withMessage('Access token is required'),
  body('refreshToken')
    .optional()
    .isString()
    .withMessage('Refresh token must be a string'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Expires at must be a valid date')
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

    const { platform, accessToken, refreshToken, expiresAt, username, pageId, channelId } = req.body;

    const user = await User.findById(req.user._id);
    
    // Update social connection
    user.socialConnections[platform] = {
      connected: true,
      accessToken,
      refreshToken,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    };

    // Add platform-specific data
    if (username) user.socialConnections[platform].username = username;
    if (pageId) user.socialConnections[platform].pageId = pageId;
    if (channelId) user.socialConnections[platform].channelId = channelId;

    await user.save();

    res.json({
      success: true,
      data: {
        platform,
        connected: true,
        message: `${platform} account connected successfully`
      }
    });
  } catch (error) {
    console.error('Connect social error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Disconnect social media account
// @route   DELETE /api/users/disconnect-social/:platform
// @access  Private
router.delete('/disconnect-social/:platform', protect, async (req, res) => {
  try {
    const { platform } = req.params;

    if (!['instagram', 'facebook', 'linkedin', 'youtube', 'twitter'].includes(platform)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid platform'
      });
    }

    const user = await User.findById(req.user._id);
    
    // Reset social connection
    user.socialConnections[platform] = {
      connected: false,
      username: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null
    };

    await user.save();

    res.json({
      success: true,
      data: {
        platform,
        connected: false,
        message: `${platform} account disconnected successfully`
      }
    });
  } catch (error) {
    console.error('Disconnect social error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get connected social accounts
// @route   GET /api/users/social-accounts
// @access  Private
router.get('/social-accounts', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const connectedAccounts = {};

    Object.keys(user.socialConnections).forEach(platform => {
      const connection = user.socialConnections[platform];
      connectedAccounts[platform] = {
        connected: connection.connected,
        username: connection.username,
        pageId: connection.pageId,
        channelId: connection.channelId,
        expiresAt: connection.expiresAt
      };
    });

    res.json({
      success: true,
      data: connectedAccounts
    });
  } catch (error) {
    console.error('Get social accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get user usage statistics
// @route   GET /api/users/usage
// @access  Private
router.get('/usage', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Calculate usage percentages based on subscription plan
    const planLimits = {
      free: { posts: 10, videos: 5, storage: 100 * 1024 * 1024 }, // 100MB
      basic: { posts: 100, videos: 50, storage: 1024 * 1024 * 1024 }, // 1GB
      pro: { posts: 1000, videos: 500, storage: 10 * 1024 * 1024 * 1024 }, // 10GB
      enterprise: { posts: -1, videos: -1, storage: -1 } // Unlimited
    };

    const currentPlan = user.subscription.plan;
    const limits = planLimits[currentPlan];

    const usage = {
      posts: {
        used: user.usage.postsCreated,
        limit: limits.posts,
        percentage: limits.posts === -1 ? 0 : (user.usage.postsCreated / limits.posts) * 100
      },
      videos: {
        used: user.usage.videosGenerated,
        limit: limits.videos,
        percentage: limits.videos === -1 ? 0 : (user.usage.videosGenerated / limits.videos) * 100
      },
      storage: {
        used: user.usage.storageUsed,
        limit: limits.storage,
        percentage: limits.storage === -1 ? 0 : (user.usage.storageUsed / limits.storage) * 100
      },
      apiCalls: {
        used: user.usage.apiCalls,
        limit: currentPlan === 'enterprise' ? -1 : 1000,
        percentage: currentPlan === 'enterprise' ? 0 : (user.usage.apiCalls / 1000) * 100
      }
    };

    res.json({
      success: true,
      data: {
        currentPlan,
        usage,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Update subscription
// @route   PUT /api/users/subscription
// @access  Private
router.put('/subscription', protect, [
  body('plan')
    .isIn(['free', 'basic', 'pro', 'enterprise'])
    .withMessage('Invalid subscription plan')
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

    const { plan } = req.body;

    const user = await User.findById(req.user._id);
    
    // Update subscription
    user.subscription.plan = plan;
    user.subscription.startDate = new Date();
    user.subscription.isActive = true;

    // Set end date based on plan (30 days for now)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    user.subscription.endDate = endDate;

    await user.save();

    res.json({
      success: true,
      data: {
        subscription: user.subscription,
        message: `Subscription updated to ${plan} plan`
      }
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    
    const query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

export default router; 