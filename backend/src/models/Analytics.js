import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  platform: {
    type: String,
    enum: ['instagram', 'facebook', 'linkedin', 'youtube', 'twitter'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  metrics: {
    // Reach metrics
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    uniqueReach: { type: Number, default: 0 },
    
    // Engagement metrics
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    
    // Video specific metrics
    views: { type: Number, default: 0 },
    watchTime: { type: Number, default: 0 }, // in seconds
    averageWatchTime: { type: Number, default: 0 }, // in seconds
    completionRate: { type: Number, default: 0 }, // percentage
    
    // Audience metrics
    newFollowers: { type: Number, default: 0 },
    unfollows: { type: Number, default: 0 },
    profileVisits: { type: Number, default: 0 },
    
    // Business metrics
    websiteClicks: { type: Number, default: 0 },
    emailSignups: { type: Number, default: 0 },
    purchases: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 }
  },
  demographics: {
    ageRanges: {
      '13-17': { type: Number, default: 0 },
      '18-24': { type: Number, default: 0 },
      '25-34': { type: Number, default: 0 },
      '35-44': { type: Number, default: 0 },
      '45-54': { type: Number, default: 0 },
      '55-64': { type: Number, default: 0 },
      '65+': { type: Number, default: 0 }
    },
    genders: {
      male: { type: Number, default: 0 },
      female: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    locations: [{
      country: String,
      city: String,
      count: { type: Number, default: 0 }
    }],
    languages: [{
      language: String,
      count: { type: Number, default: 0 }
    }]
  },
  engagement: {
    rate: { type: Number, default: 0 }, // (likes + comments + shares) / reach * 100
    quality: { type: Number, default: 0 }, // weighted engagement score
    sentiment: {
      positive: { type: Number, default: 0 },
      neutral: { type: Number, default: 0 },
      negative: { type: Number, default: 0 }
    }
  },
  performance: {
    score: { type: Number, default: 0 }, // overall performance score
    rank: { type: Number, default: 0 }, // rank among user's posts
    trend: { type: String, enum: ['up', 'down', 'stable'], default: 'stable' }
  },
  insights: {
    bestTimeToPost: Date,
    optimalContentType: String,
    topPerformingHashtags: [String],
    audiencePeakHours: [Number], // hours of the day
    recommendedActions: [String]
  }
}, {
  timestamps: true
});

// Indexes for better query performance
analyticsSchema.index({ user: 1, date: -1 });
analyticsSchema.index({ post: 1, platform: 1 });
analyticsSchema.index({ date: 1 });
analyticsSchema.index({ 'metrics.engagement.rate': -1 });

// Virtual for total engagement
analyticsSchema.virtual('totalEngagement').get(function() {
  return this.metrics.likes + this.metrics.comments + this.metrics.shares;
});

// Virtual for engagement rate
analyticsSchema.virtual('engagementRate').get(function() {
  if (this.metrics.reach === 0) return 0;
  return ((this.metrics.likes + this.metrics.comments + this.metrics.shares) / this.metrics.reach) * 100;
});

// Virtual for cost per engagement
analyticsSchema.virtual('costPerEngagement').get(function() {
  const totalEngagement = this.metrics.likes + this.metrics.comments + this.metrics.shares;
  if (totalEngagement === 0) return 0;
  return this.metrics.revenue / totalEngagement;
});

// Pre-save middleware to calculate engagement rate
analyticsSchema.pre('save', function(next) {
  if (this.metrics.reach > 0) {
    this.engagement.rate = ((this.metrics.likes + this.metrics.comments + this.metrics.shares) / this.metrics.reach) * 100;
  }
  
  // Calculate quality score (weighted engagement)
  this.engagement.quality = (
    this.metrics.likes * 1 +
    this.metrics.comments * 3 +
    this.metrics.shares * 5 +
    this.metrics.saves * 2
  ) / this.metrics.reach * 100;
  
  next();
});

// Method to update metrics
analyticsSchema.methods.updateMetrics = function(newMetrics) {
  Object.keys(newMetrics).forEach(key => {
    if (this.metrics[key] !== undefined) {
      this.metrics[key] = newMetrics[key];
    }
  });
};

// Method to add demographic data
analyticsSchema.methods.addDemographicData = function(demographicData) {
  if (demographicData.ageRanges) {
    Object.keys(demographicData.ageRanges).forEach(ageRange => {
      if (this.demographics.ageRanges[ageRange] !== undefined) {
        this.demographics.ageRanges[ageRange] += demographicData.ageRanges[ageRange];
      }
    });
  }
  
  if (demographicData.genders) {
    Object.keys(demographicData.genders).forEach(gender => {
      if (this.demographics.genders[gender] !== undefined) {
        this.demographics.genders[gender] += demographicData.genders[gender];
      }
    });
  }
};

// Static method to get analytics by date range
analyticsSchema.statics.getByDateRange = function(userId, startDate, endDate) {
  return this.find({
    user: userId,
    date: { $gte: startDate, $lte: endDate }
  }).populate('post', 'title content');
};

// Static method to get top performing posts
analyticsSchema.statics.getTopPosts = function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort({ 'metrics.engagement.rate': -1 })
    .limit(limit)
    .populate('post', 'title content media');
};

// Static method to get platform comparison
analyticsSchema.statics.getPlatformComparison = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$platform',
        totalReach: { $sum: '$metrics.reach' },
        totalEngagement: { $sum: { $add: ['$metrics.likes', '$metrics.comments', '$metrics.shares'] } },
        avgEngagementRate: { $avg: '$engagement.rate' },
        totalPosts: { $sum: 1 }
      }
    }
  ]);
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

export default Analytics; 