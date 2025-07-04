import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  socialConnections: {
    instagram: {
      connected: { type: Boolean, default: false },
      username: String,
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    },
    facebook: {
      connected: { type: Boolean, default: false },
      pageId: String,
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    },
    linkedin: {
      connected: { type: Boolean, default: false },
      profileId: String,
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    },
    youtube: {
      connected: { type: Boolean, default: false },
      channelId: String,
      accessToken: String,
      refreshToken: String,
      expiresAt: Date
    },
    twitter: {
      connected: { type: Boolean, default: false },
      username: String,
      accessToken: String,
      accessSecret: String,
      expiresAt: Date
    }
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free'
    },
    startDate: Date,
    endDate: Date,
    isActive: { type: Boolean, default: true }
  },
  usage: {
    postsCreated: { type: Number, default: 0 },
    videosGenerated: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    storageUsed: { type: Number, default: 0 } // in bytes
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.name}`;
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ 'socialConnections.instagram.connected': 1 });
userSchema.index({ 'socialConnections.facebook.connected': 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.socialConnections;
  delete userObject.subscription;
  return userObject;
};

// Method to check if social account is connected
userSchema.methods.isSocialConnected = function(platform) {
  return this.socialConnections[platform]?.connected || false;
};

// Method to get connected platforms
userSchema.methods.getConnectedPlatforms = function() {
  const platforms = [];
  Object.keys(this.socialConnections).forEach(platform => {
    if (this.socialConnections[platform].connected) {
      platforms.push(platform);
    }
  });
  return platforms;
};

const User = mongoose.model('User', userSchema);

export default User; 