import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: [true, 'Post title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Post content is required'],
    trim: true,
    maxlength: [2200, 'Content cannot be more than 2200 characters']
  },
  media: {
    images: [{
      url: String,
      publicId: String,
      alt: String,
      order: Number
    }],
    video: {
      url: String,
      publicId: String,
      thumbnail: String,
      duration: Number,
      size: Number
    }
  },
  platforms: [{
    name: {
      type: String,
      enum: ['instagram', 'facebook', 'linkedin', 'youtube', 'twitter'],
      required: true
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published', 'failed'],
      default: 'draft'
    },
    postId: String, // ID from the social platform
    publishedAt: Date,
    error: String,
    engagement: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      views: { type: Number, default: 0 }
    }
  }],
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'published', 'failed', 'cancelled'],
    default: 'draft'
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    enum: ['business', 'entertainment', 'education', 'lifestyle', 'technology', 'other'],
    default: 'other'
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiPrompt: String, // The prompt used to generate this content
  analytics: {
    totalReach: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    clickThroughRate: { type: Number, default: 0 },
    bestPerformingPlatform: String
  },
  settings: {
    allowComments: { type: Boolean, default: true },
    allowSharing: { type: Boolean, default: true },
    boostPost: { type: Boolean, default: false },
    targetAudience: {
      ageRange: {
        min: { type: Number, min: 13, max: 65 },
        max: { type: Number, min: 13, max: 65 }
      },
      interests: [String],
      locations: [String]
    }
  },
  metadata: {
    language: { type: String, default: 'en' },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'] },
    keywords: [String],
    hashtags: [String]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
postSchema.index({ user: 1, scheduledDate: -1 });
postSchema.index({ status: 1, scheduledDate: 1 });
postSchema.index({ 'platforms.name': 1, 'platforms.status': 1 });
postSchema.index({ tags: 1 });
postSchema.index({ category: 1 });

// Virtual for formatted scheduled date
postSchema.virtual('formattedScheduledDate').get(function() {
  return this.scheduledDate.toLocaleString();
});

// Virtual for time until scheduled
postSchema.virtual('timeUntilScheduled').get(function() {
  const now = new Date();
  const scheduled = new Date(this.scheduledDate);
  return scheduled.getTime() - now.getTime();
});

// Virtual for total engagement across all platforms
postSchema.virtual('totalEngagement').get(function() {
  return this.platforms.reduce((total, platform) => {
    return total + (platform.engagement.likes + platform.engagement.comments + platform.engagement.shares);
  }, 0);
});

// Pre-save middleware to update status based on scheduled date
postSchema.pre('save', function(next) {
  const now = new Date();
  const scheduled = new Date(this.scheduledDate);
  
  if (this.status === 'scheduled' && scheduled <= now) {
    this.status = 'published';
  }
  
  next();
});

// Method to check if post is ready to publish
postSchema.methods.isReadyToPublish = function() {
  const now = new Date();
  const scheduled = new Date(this.scheduledDate);
  return this.status === 'scheduled' && scheduled <= now;
};

// Method to get platform status
postSchema.methods.getPlatformStatus = function(platformName) {
  const platform = this.platforms.find(p => p.name === platformName);
  return platform ? platform.status : null;
};

// Method to update platform engagement
postSchema.methods.updatePlatformEngagement = function(platformName, engagement) {
  const platform = this.platforms.find(p => p.name === platformName);
  if (platform) {
    platform.engagement = { ...platform.engagement, ...engagement };
  }
};

// Method to add platform
postSchema.methods.addPlatform = function(platformName) {
  if (!this.platforms.find(p => p.name === platformName)) {
    this.platforms.push({
      name: platformName,
      status: 'draft',
      engagement: { likes: 0, comments: 0, shares: 0, views: 0 }
    });
  }
};

// Method to remove platform
postSchema.methods.removePlatform = function(platformName) {
  this.platforms = this.platforms.filter(p => p.name !== platformName);
};

// Static method to get posts by status
postSchema.statics.getByStatus = function(status) {
  return this.find({ status }).populate('user', 'name email');
};

// Static method to get posts by platform
postSchema.statics.getByPlatform = function(platformName) {
  return this.find({ 'platforms.name': platformName }).populate('user', 'name email');
};

// Static method to get scheduled posts
postSchema.statics.getScheduledPosts = function() {
  const now = new Date();
  return this.find({
    status: 'scheduled',
    scheduledDate: { $lte: now }
  }).populate('user', 'name email');
};

const Post = mongoose.model('Post', postSchema);

export default Post; 