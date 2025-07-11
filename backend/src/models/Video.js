import mongoose from 'mongoose';

const videoSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  videoType: {
    type: String,
    enum: ['text-to-video', 'image-to-video'],
    required: true
  },
  // Video generation parameters
  parameters: {
    aspectRatio: {
      type: String,
      enum: ['16:9', '1:1', '9:16'],
      default: '16:9'
    },
    durationSeconds: {
      type: Number,
      min: 1,
      max: 20,
      default: 5
    },
    sampleCount: {
      type: Number,
      min: 1,
      max: 4,
      default: 1
    },
    enhancePrompt: {
      type: Boolean,
      default: true
    },
    seed: {
      type: Number,
      min: 1,
      max: 999999999,
      default: null
    },
    videoGenerationConfig: {
      movement: {
        type: String,
        enum: ['slow', 'medium', 'fast'],
        default: 'medium'
      },
      camera: {
        type: String,
        enum: ['zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'static'],
        default: 'static'
      },
      style: {
        type: String,
        enum: ['cinematic', 'photorealistic', 'anime', 'cartoon', 'artistic'],
        default: 'cinematic'
      },
      lighting: {
        type: String,
        enum: ['natural', 'sunset', 'sunrise', 'golden_hour', 'blue_hour', 'studio'],
        default: 'natural'
      },
      colorTone: {
        type: String,
        enum: ['warm', 'cool', 'neutral', 'vibrant', 'muted'],
        default: 'neutral'
      }
    }
  },
  // Input image for image-to-video (optional)
  inputImage: {
    url: String,
    filename: String,
    gcsUri: String, // Google Cloud Storage URI for the input image
    mimetype: String // MIME type of the uploaded image
  },
  // Generated video information
  video: {
    url: String,
    urlExpiry: Date, // When signed URL expires
    filename: String,
    size: Number,
    duration: Number,
    resolution: String,
    gcsUri: String, // Google Cloud Storage URI
    localPath: String, // Local path after download
    data: Buffer, // Binary video data stored in MongoDB
    contentType: {
      type: String,
      default: 'video/mp4'
    }
  },
  // Google Cloud operation details
  operation: {
    name: String, // Long-running operation name
    done: {
      type: Boolean,
      default: false
    },
    metadata: Object,
    response: Object,
    error: Object
  },
  // Processing information
  processingInfo: {
    startedAt: Date,
    completedAt: Date,
    errorMessage: String,
    retryCount: {
      type: Number,
      default: 0
    }
  },
  // Privacy and access control
  isPrivate: {
    type: Boolean,
    default: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  // Analytics
  views: {
    type: Number,
    default: 0
  },
  downloads: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better query performance
videoSchema.index({ user: 1, createdAt: -1 });
videoSchema.index({ status: 1 });
videoSchema.index({ 'video.url': 1 });

// Virtual for video duration in human-readable format
videoSchema.virtual('durationFormatted').get(function() {
  if (!this.video.duration) return null;
  const minutes = Math.floor(this.video.duration / 60);
  const seconds = this.video.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Method to update processing status
videoSchema.methods.updateStatus = function(status, additionalData = {}) {
  this.status = status;
  
  if (status === 'processing' && !this.processingInfo.startedAt) {
    this.processingInfo.startedAt = new Date();
  } else if (status === 'completed') {
    this.processingInfo.completedAt = new Date();
  } else if (status === 'failed') {
    this.processingInfo.errorMessage = additionalData.errorMessage;
  }
  
  return this.save();
};

// Method to increment view count
videoSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to increment download count
videoSchema.methods.incrementDownloads = function() {
  this.downloads += 1;
  return this.save();
};

// Static method to get user's videos
videoSchema.statics.getUserVideos = function(userId, options = {}) {
  const { page = 1, limit = 10, status, videoType } = options;
  const skip = (page - 1) * limit;
  
  const query = { user: userId };
  if (status) query.status = status;
  if (videoType) query.videoType = videoType;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('user', 'username email');
};

// Static method to get video statistics
videoSchema.statics.getVideoStats = function(userId) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

const Video = mongoose.model('Video', videoSchema);

export default Video; 