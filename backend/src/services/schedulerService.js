import cron from 'node-cron';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { publishPost } from './socialMediaService.js';
import Analytics from '../models/Analytics.js';

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  // Initialize the scheduler
  async initialize() {
    if (this.isInitialized) return;

    console.log('🕐 Initializing scheduler service...');
    
    // Load all scheduled posts from database
    await this.loadScheduledPosts();
    
    // Start the cron job to check for new scheduled posts every minute
    cron.schedule('* * * * *', async () => {
      await this.checkScheduledPosts();
    });

    // Start the cron job to clean up old analytics data daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.cleanupOldAnalytics();
    });

    this.isInitialized = true;
    console.log('✅ Scheduler service initialized');
  }

  // Load all scheduled posts and create cron jobs
  async loadScheduledPosts() {
    try {
      const now = new Date();
      const scheduledPosts = await Post.find({
        status: 'scheduled',
        scheduledDate: { $gt: now }
      }).populate('user');

      console.log(`📅 Loading ${scheduledPosts.length} scheduled posts`);

      for (const post of scheduledPosts) {
        this.schedulePost(post);
      }
    } catch (error) {
      console.error('❌ Error loading scheduled posts:', error);
    }
  }

  // Schedule a post for publishing
  schedulePost(post) {
    try {
      const jobId = `post_${post._id}`;
      
      // Cancel existing job if it exists
      if (this.jobs.has(jobId)) {
        this.jobs.get(jobId).stop();
      }

      // Create new cron job
      const scheduledDate = new Date(post.scheduledDate);
      const cronExpression = this.dateToCron(scheduledDate);
      
      const job = cron.schedule(cronExpression, async () => {
        await this.publishScheduledPost(post);
      }, {
        scheduled: false
      });

      this.jobs.set(jobId, job);
      job.start();

      console.log(`📝 Scheduled post ${post._id} for ${scheduledDate.toISOString()}`);
    } catch (error) {
      console.error(`❌ Error scheduling post ${post._id}:`, error);
    }
  }

  // Convert date to cron expression
  dateToCron(date) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.getDay();

    return `${minute} ${hour} ${day} ${month} ${dayOfWeek}`;
  }

  // Publish a scheduled post
  async publishScheduledPost(post) {
    try {
      console.log(`🚀 Publishing scheduled post ${post._id}`);
      
      const user = await User.findById(post.user);
      if (!user) {
        throw new Error('User not found');
      }

      const publishResults = [];
      let hasFailures = false;

      // Publish to each platform
      for (const platform of post.platforms) {
        try {
          // Check if user has connected this platform
          if (!user.isSocialConnected(platform.name)) {
            platform.status = 'failed';
            platform.error = 'Platform not connected';
            publishResults.push({
              platform: platform.name,
              success: false,
              error: 'Platform not connected'
            });
            hasFailures = true;
            continue;
          }

          // Publish to platform
          const result = await publishPost(post, platform.name, user);
          
          platform.status = 'published';
          platform.publishedAt = new Date();
          platform.postId = result.postId;
          
          publishResults.push({
            platform: platform.name,
            success: true,
            postId: result.postId,
            url: result.url
          });

          // Create analytics entry
          await this.createAnalyticsEntry(post, platform.name, user);

        } catch (error) {
          console.error(`❌ Failed to publish to ${platform.name}:`, error);
          
          platform.status = 'failed';
          platform.error = error.message;
          
          publishResults.push({
            platform: platform.name,
            success: false,
            error: error.message
          });
          
          hasFailures = true;
        }
      }

      // Update post status
      post.status = hasFailures ? 'failed' : 'published';
      await post.save();

      // Remove job from scheduler
      const jobId = `post_${post._id}`;
      if (this.jobs.has(jobId)) {
        this.jobs.get(jobId).stop();
        this.jobs.delete(jobId);
      }

      console.log(`✅ Post ${post._id} published with ${publishResults.filter(r => r.success).length}/${publishResults.length} successful platforms`);

      return {
        postId: post._id,
        success: !hasFailures,
        results: publishResults
      };

    } catch (error) {
      console.error(`❌ Error publishing scheduled post ${post._id}:`, error);
      
      // Update post status to failed
      post.status = 'failed';
      await post.save();

      // Remove job from scheduler
      const jobId = `post_${post._id}`;
      if (this.jobs.has(jobId)) {
        this.jobs.get(jobId).stop();
        this.jobs.delete(jobId);
      }

      throw error;
    }
  }

  // Create analytics entry for published post
  async createAnalyticsEntry(post, platform, user) {
    try {
      const analytics = new Analytics({
        user: user._id,
        post: post._id,
        platform,
        date: new Date(),
        metrics: {
          reach: 0,
          impressions: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0
        },
        engagement: {
          rate: 0,
          quality: 0
        }
      });

      await analytics.save();
    } catch (error) {
      console.error('❌ Error creating analytics entry:', error);
    }
  }

  // Check for new scheduled posts
  async checkScheduledPosts() {
    try {
      const now = new Date();
      const scheduledPosts = await Post.find({
        status: 'scheduled',
        scheduledDate: { $gt: now }
      }).populate('user');

      // Check if any posts need to be scheduled
      for (const post of scheduledPosts) {
        const jobId = `post_${post._id}`;
        if (!this.jobs.has(jobId)) {
          this.schedulePost(post);
        }
      }
    } catch (error) {
      console.error('❌ Error checking scheduled posts:', error);
    }
  }

  // Cancel a scheduled post
  cancelScheduledPost(postId) {
    const jobId = `post_${postId}`;
    if (this.jobs.has(jobId)) {
      this.jobs.get(jobId).stop();
      this.jobs.delete(jobId);
      console.log(`❌ Cancelled scheduled post ${postId}`);
      return true;
    }
    return false;
  }

  // Update a scheduled post
  async updateScheduledPost(post) {
    // Cancel existing job
    this.cancelScheduledPost(post._id);
    
    // Schedule new job if post is still scheduled
    if (post.status === 'scheduled') {
      this.schedulePost(post);
    }
  }

  // Get all active jobs
  getActiveJobs() {
    const activeJobs = [];
    for (const [jobId, job] of this.jobs) {
      activeJobs.push({
        jobId,
        isRunning: job.running
      });
    }
    return activeJobs;
  }

  // Clean up old analytics data
  async cleanupOldAnalytics() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await Analytics.deleteMany({
        date: { $lt: thirtyDaysAgo }
      });

      console.log(`🧹 Cleaned up ${result.deletedCount} old analytics entries`);
    } catch (error) {
      console.error('❌ Error cleaning up old analytics:', error);
    }
  }

  // Get scheduler statistics
  getStats() {
    return {
      activeJobs: this.jobs.size,
      isInitialized: this.isInitialized,
      uptime: process.uptime()
    };
  }

  // Stop all jobs (for graceful shutdown)
  stopAllJobs() {
    console.log('🛑 Stopping all scheduled jobs...');
    for (const [jobId, job] of this.jobs) {
      job.stop();
    }
    this.jobs.clear();
    console.log('✅ All jobs stopped');
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

export default schedulerService; 