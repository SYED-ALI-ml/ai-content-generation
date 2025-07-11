import React, { useState, useEffect } from 'react';
import { Play, Video, Sparkles, Download, Share2, Zap, Cpu, Eye, Settings, Clock, CheckCircle, XCircle, RefreshCw, Trash2, Upload, Image, FileText } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

interface VideoParameters {
  aspectRatio: '16:9' | '1:1' | '9:16';
  durationSeconds: number;
  sampleCount: number;
  enhancePrompt: boolean;
  seed?: number;
  videoGenerationConfig: {
    movement: 'slow' | 'medium' | 'fast';
    camera: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'static';
    style: 'cinematic' | 'photorealistic' | 'anime' | 'cartoon' | 'artistic';
    lighting: 'natural' | 'sunset' | 'sunrise' | 'golden_hour' | 'blue_hour' | 'studio';
    colorTone: 'warm' | 'cool' | 'neutral' | 'vibrant' | 'muted';
  };
}

interface GeneratedVideo {
  _id: string;
  title: string;
  prompt: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoType: 'text-to-video' | 'image-to-video';
  parameters: VideoParameters;
  video?: {
    filename: string;
    url: string;
    size: number;
    duration: number;
  };
  operation?: {
    operationName: string;
    done: boolean;
  };
  processingInfo?: {
    errorMessage?: string;
    completedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface VideoStats {
  totalVideos: number;
  completedVideos: number;
  processingVideos: number;
  failedVideos: number;
}

const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [videoType, setVideoType] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [parameters, setParameters] = useState<VideoParameters>({
    aspectRatio: '16:9',
    durationSeconds: 15,
    sampleCount: 1,
    enhancePrompt: true,
    seed: undefined,
    videoGenerationConfig: {
      movement: 'medium',
      camera: 'static',
      style: 'cinematic',
      lighting: 'natural',
      colorTone: 'neutral'
    }
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'info', message: string} | null>(null);
  const [videoErrors, setVideoErrors] = useState<Record<string, number>>({});
  const [lastFetchTime, setLastFetchTime] = useState(0);

  const API_BASE_URL = 'http://localhost:5001/api';
  
  // Function to validate if token is still valid
  const validateToken = async (tokenToValidate: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/videos`, {
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`
        }
      });
      return response.ok;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  };

  // Function to generate video streaming URL with current token
  const getVideoStreamingUrl = async (videoId: string) => {
    // Validate current token first
    if (!token || !(await validateToken(token))) {
      console.error('Invalid or expired token, cannot generate streaming URL');
      return null;
    }
    
    // Check if this video exists in our current video list
    const videoExists = generatedVideos.some(v => v._id === videoId);
    if (!videoExists) {
      console.warn(`Video ${videoId} not found in current user's videos`);
      return null;
    }
    
    return `${API_BASE_URL}/stream/${videoId}?token=${token}`;
  };

  // Fetch user's videos
  const fetchVideos = async () => {
    if (!user || !token) return;
    
    // Rate limiting: don't fetch more than once every 2 seconds
    const now = Date.now();
    if (now - lastFetchTime < 2000) {
      console.log('Rate limited: skipping fetch, last fetch was too recent');
      return;
    }
    setLastFetchTime(now);
    
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/videos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Filter out any invalid videos and log what we're getting
        const validVideos = (data.data.videos || []).filter((video: GeneratedVideo) => {
          const isValid = video._id && video.title && video.status;
          console.log(`Video from API: ${video._id} - ${video.title} - ${video.status} - Valid: ${isValid}`);
          return isValid;
        });
        
        console.log(`Setting ${validVideos.length} valid videos:`, validVideos.map(v => ({ id: v._id, title: v.title, status: v.status })));
        
        // FORCE REPLACE: Don't merge, completely replace the state
        setGeneratedVideos(() => {
          console.log('🔄 Force replacing videos state with:', validVideos.map(v => v._id));
          return validVideos;
        });
        setStats(data.data.stats || null);
      } else {
        console.error('Failed to fetch videos');
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Check video status
  const checkVideoStatus = async (videoId: string) => {
    if (!user || !token) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/videos/${videoId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
    } catch (error) {
      console.error('Error checking video status:', error);
    }
    return null;
  };

  // Poll for video status updates
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      const processingVideos = generatedVideos.filter(v => v.status === 'processing' || v.status === 'pending');
      
      if (processingVideos.length === 0) {
        return; // No videos to poll
      }
      
      console.log(`🔄 Polling ${processingVideos.length} processing videos...`);
      let hasUpdates = false;
      
      for (const video of processingVideos) {
        try {
          const statusData = await checkVideoStatus(video._id);
          if (statusData && (statusData.status !== video.status || (statusData.status === 'completed' && statusData.video && !video.video?.url))) {
            console.log(`📊 Video ${video._id} status changed: ${video.status} → ${statusData.status}`);
            
            setGeneratedVideos(prev => 
              prev.map(v => 
                v._id === video._id 
                  ? { ...v, status: statusData.status, operation: statusData.operation, processingInfo: statusData.processingInfo, video: statusData.video }
                  : v
              )
            );
            
            hasUpdates = true;
            
            if (statusData.status === 'completed') {
              showNotification('success', `Video "${video.title}" completed successfully!`);
              console.log(`✅ Video ${video._id} completed, video URL:`, statusData.video?.url);
              
              // Immediately refresh to get the latest video data
              setTimeout(() => {
                console.log('🔄 Immediately refreshing for completed video...');
                fetchVideos();
              }, 1000);
            } else if (statusData.status === 'failed') {
              showNotification('error', `Video "${video.title}" failed to generate.`);
            }
          }
        } catch (error) {
          console.error(`❌ Error polling video ${video._id}:`, error);
        }
      }
      
      // If any video was completed, refresh the entire list to get the latest data including GCS URLs
      if (hasUpdates) {
        console.log('🔄 Video status changed, refreshing complete video list...');
        setTimeout(() => {
          fetchVideos();
        }, 2000); // Refresh after 2 seconds to get the complete data
      }
    }, 8000); // Poll every 8 seconds

    return () => clearInterval(pollInterval);
  }, [generatedVideos, user, token]);

  // Load videos on component mount
  useEffect(() => {
    // Clear state when user/token changes
    setVideoErrors({});
    setGeneratedVideos([]);
    setStats(null);
    
    // Fetch fresh data
    if (user && token) {
      fetchVideos();
    }
  }, [user, token]);

  // Removed excessive video element clearing as it's no longer needed

  // Removed automatic stale video detection as it was causing confusion

  // Removed stale video element cleanup as it's no longer needed

  // Show notification
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Removed stuck video checking functions as they're no longer needed with direct GCS streaming

  const styles = [
    { id: 'cinematic', label: 'Cinematic', color: 'from-purple-500 to-violet-600', description: 'Hollywood-style production' },
    { id: 'anime', label: 'Anime', color: 'from-pink-500 to-rose-600', description: 'Japanese animation style' },
    { id: 'photorealistic', label: 'Realistic', color: 'from-cyan-500 to-blue-600', description: 'Photorealistic rendering' },
    { id: 'artistic', label: 'Abstract', color: 'from-emerald-500 to-teal-600', description: 'Artistic interpretation' }
  ];

  const durations = [
    { value: 5, label: '5 seconds' },
    { value: 8, label: '8 seconds' },
    { value: 10, label: '10 seconds' },
    { value: 15, label: '15 seconds' }
  ];

  // Handle image selection
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showNotification('error', 'Please select a valid image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showNotification('error', 'Image file must be less than 10MB');
        return;
      }
      
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear image selection
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview('');
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user || !token) {
      showNotification('error', 'Please enter a prompt to generate a video');
      return;
    }

    if (videoType === 'image-to-video' && !selectedImage) {
      showNotification('error', 'Please select an image for image-to-video generation');
      return;
    }

    setIsGenerating(true);
    
    try {
      const formData = new FormData();
      formData.append('title', title || prompt.slice(0, 50));
      formData.append('prompt', prompt);
      formData.append('description', '');
      formData.append('videoType', videoType);
      formData.append('parameters', JSON.stringify(parameters));
      formData.append('tags', 'ai-generated,neural-studio');

      // Add image if it's image-to-video
      if (videoType === 'image-to-video' && selectedImage) {
        formData.append('image', selectedImage);
      }

      const response = await fetch(`${API_BASE_URL}/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        
        showNotification('success', `${videoType === 'image-to-video' ? 'Image-to-video' : 'Text-to-video'} generation started! Your neural creation is being processed.`);
        setPrompt('');
        setTitle('');
        clearImage();
        
        // Refresh videos list
        fetchVideos();
      } else {
        const errorData = await response.json();
        showNotification('error', `Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error generating video:', error);
      showNotification('error', 'Failed to start video generation. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-400';
      case 'processing':
        return 'text-blue-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const downloadVideo = async (videoId: string, filename: string) => {
    try {
      console.log(`📥 Starting download for video: ${videoId}, filename: ${filename}`);
      
      const response = await fetch(`${API_BASE_URL}/videos/${videoId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log(`📥 Download response status: ${response.status}`);

      if (response.ok) {
        const blob = await response.blob();
        console.log(`📥 Downloaded blob size: ${blob.size} bytes`);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('success', 'Video downloaded successfully!');
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('Download failed:', response.status, errorData);
        showNotification('error', `Failed to download video: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      showNotification('error', `Failed to download video: ${error.message}`);
    }
  };

  const shareVideo = async (video: GeneratedVideo) => {
    try {
      const videoUrl = video.video?.url || `${API_BASE_URL}/stream/${video._id}?token=${encodeURIComponent(token || '')}`;
      const shareData = {
        title: `Check out this AI-generated video: ${video.title}`,
        text: `I created this amazing video using NeuraVision AI: "${video.prompt}"`,
        url: videoUrl
      };

      // Try native Web Share API first (mobile/modern browsers)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        showNotification('success', 'Video shared successfully!');
        return;
      }

      // Fallback: Copy to clipboard and show share options
      const shareText = `${shareData.title}\n\n${shareData.text}\n\nWatch here: ${shareData.url}`;
      
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        showNotification('success', 'Video link copied to clipboard!');
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('success', 'Video link copied to clipboard!');
      }

      // Show additional sharing options
      const shareOptions = [
        {
          name: 'Twitter',
          url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`
        },
        {
          name: 'Facebook',
          url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`
        },
        {
          name: 'LinkedIn',
          url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}`
        },
        {
          name: 'WhatsApp',
          url: `https://wa.me/?text=${encodeURIComponent(shareText)}`
        }
      ];

      // Create a temporary modal for sharing options
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <h3 class="text-xl font-bold text-white mb-4">Share Video</h3>
          <p class="text-gray-300 mb-4">Link copied to clipboard! Choose a platform to share:</p>
          <div class="grid grid-cols-2 gap-3">
            ${shareOptions.map(option => `
              <button onclick="window.open('${option.url}', '_blank'); document.body.removeChild(this.closest('.fixed'))" 
                      class="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">
                ${option.name}
              </button>
            `).join('')}
          </div>
          <button onclick="document.body.removeChild(this.closest('.fixed'))" 
                  class="mt-4 w-full p-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white transition-colors">
            Close
          </button>
        </div>
      `;
      
      document.body.appendChild(modal);
      
      // Auto-remove modal after 10 seconds
      setTimeout(() => {
        if (document.body.contains(modal)) {
          document.body.removeChild(modal);
        }
      }, 10000);

    } catch (error) {
      console.error('Error sharing video:', error);
      showNotification('error', 'Failed to share video');
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Remove the video from the local state
        setGeneratedVideos(prev => prev.filter(video => video._id !== videoId));
        showNotification('success', 'Video deleted successfully!');
        
        // Refresh the video list to get updated stats
        fetchVideos();
      } else {
        const errorData = await response.json();
        showNotification('error', errorData.message || 'Failed to delete video');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      showNotification('error', 'Failed to delete video');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 cyber-grid opacity-20"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl floating-animation"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl floating-animation" style={{ animationDelay: '3s' }}></div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg glass-panel-strong neon-glow max-w-md ${
          notification.type === 'success' ? 'border-green-500/50' : 
          notification.type === 'error' ? 'border-red-500/50' : 'border-blue-500/50'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
            {notification.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
            {notification.type === 'info' && <Eye className="w-5 h-5 text-blue-400" />}
            <span className="text-white">{notification.message}</span>
          </div>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-cyber font-bold gradient-text text-glow mb-4">
            Neural Studio
          </h1>
          <p className="text-gray-300 text-lg">
            Transform your imagination into cinematic reality with quantum-powered AI
          </p>
          
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="glass-panel p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-purple-400">{stats.totalVideos}</div>
                <div className="text-sm text-gray-400">Total Videos</div>
              </div>
              <div className="glass-panel p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-green-400">{stats.completedVideos}</div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
              <div className="glass-panel p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.processingVideos}</div>
                <div className="text-sm text-gray-400">Processing</div>
              </div>
              <div className="glass-panel p-4 rounded-xl text-center">
                <div className="text-2xl font-bold text-red-400">{stats.failedVideos}</div>
                <div className="text-sm text-gray-400">Failed</div>
              </div>
            </div>
          )}
        </div>

        {/* Creation Interface */}
        <div className="glass-panel-strong p-8 rounded-3xl mb-12 neon-glow">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Prompt Input */}
            <div className="lg:col-span-2 space-y-6">
              <div>
              <label className="block text-lg font-cyber font-bold text-purple-400 mb-4">
                Neural Input Prompt
              </label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe your vision... e.g., 'A futuristic city at sunset with flying cars and neon lights reflecting on wet streets'"
                  className="w-full h-40 px-6 py-4 glass-panel rounded-2xl text-white placeholder-gray-400 focus:neon-glow focus:outline-none resize-none text-lg border border-white/10 focus:border-purple-500/50 transition-all duration-300"
                />
                <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-400">{prompt.length}/1000</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-cyber font-bold text-cyan-400 mb-2">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for your neural creation"
                  className="w-full px-4 py-3 glass-panel rounded-xl text-white placeholder-gray-400 focus:neon-glow focus:outline-none border border-white/10 focus:border-cyan-500/50 transition-all duration-300"
                />
              </div>

              {/* Video Type Selection */}
              <div>
                <label className="block text-sm font-cyber font-bold text-pink-400 mb-4">
                  Generation Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setVideoType('text-to-video');
                      clearImage();
                    }}
                    className={`p-4 rounded-xl glass-panel hover:glass-panel-strong transition-all duration-300 flex items-center justify-center space-x-2 ${
                      videoType === 'text-to-video' ? 'neon-glow-pink border-pink-500/50' : ''
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                    <span className="text-sm font-medium">Text-to-Video</span>
                  </button>
                  <button
                    onClick={() => setVideoType('image-to-video')}
                    className={`p-4 rounded-xl glass-panel hover:glass-panel-strong transition-all duration-300 flex items-center justify-center space-x-2 ${
                      videoType === 'image-to-video' ? 'neon-glow-pink border-pink-500/50' : ''
                    }`}
                  >
                    <Image className="w-5 h-5" />
                    <span className="text-sm font-medium">Image-to-Video</span>
                  </button>
                </div>
              </div>

              {/* Image Upload for Image-to-Video */}
              {videoType === 'image-to-video' && (
                <div>
                  <label className="block text-sm font-cyber font-bold text-emerald-400 mb-4">
                    Input Image
                  </label>
                  
                  {!selectedImage ? (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center glass-panel hover:glass-panel-strong transition-all duration-300 hover:border-emerald-500/50">
                        <Upload className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                        <p className="text-white font-medium mb-2">Upload Reference Image</p>
                        <p className="text-sm text-gray-400">
                          Drag & drop or click to select<br />
                          JPG, PNG, GIF up to 10MB
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="glass-panel rounded-xl p-4">
                        <img
                          src={imagePreview}
                          alt="Selected image"
                          className="w-full h-48 object-cover rounded-lg mb-3"
                        />
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium text-sm">{selectedImage.name}</p>
                            <p className="text-gray-400 text-xs">
                              {(selectedImage.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                          <button
                            onClick={clearImage}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Parameters */}
              <div className="border-t border-white/10 pt-6">
                <h3 className="text-lg font-cyber font-bold text-orange-400 mb-4">Advanced Neural Parameters</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Seed (Optional)</label>
                    <input
                      type="number"
                      min="1"
                      max="999999999"
                      value={parameters.seed || ''}
                      onChange={(e) => setParameters(prev => ({ 
                        ...prev, 
                        seed: e.target.value ? parseInt(e.target.value) : undefined 
                      }))}
                      placeholder="Random seed"
                      className="w-full px-3 py-2 glass-panel rounded-lg text-white placeholder-gray-400 text-sm border border-white/10 focus:border-orange-500/50 transition-all duration-300"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Movement</label>
                    <select
                      value={parameters.videoGenerationConfig.movement}
                      onChange={(e) => setParameters(prev => ({
                        ...prev,
                        videoGenerationConfig: { ...prev.videoGenerationConfig, movement: e.target.value as any }
                      }))}
                      className="w-full px-3 py-2 glass-panel rounded-lg text-white text-sm border border-white/10 focus:border-orange-500/50 transition-all duration-300"
                    >
                      <option value="slow">Slow</option>
                      <option value="medium">Medium</option>
                      <option value="fast">Fast</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Camera</label>
                    <select
                      value={parameters.videoGenerationConfig.camera}
                      onChange={(e) => setParameters(prev => ({
                        ...prev,
                        videoGenerationConfig: { ...prev.videoGenerationConfig, camera: e.target.value as any }
                      }))}
                      className="w-full px-3 py-2 glass-panel rounded-lg text-white text-sm border border-white/10 focus:border-orange-500/50 transition-all duration-300"
                    >
                      <option value="static">Static</option>
                      <option value="zoom_in">Zoom In</option>
                      <option value="zoom_out">Zoom Out</option>
                      <option value="pan_left">Pan Left</option>
                      <option value="pan_right">Pan Right</option>
                    </select>
                  </div>



                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Lighting</label>
                    <select
                      value={parameters.videoGenerationConfig.lighting}
                      onChange={(e) => setParameters(prev => ({
                        ...prev,
                        videoGenerationConfig: { ...prev.videoGenerationConfig, lighting: e.target.value as any }
                      }))}
                      className="w-full px-3 py-2 glass-panel rounded-lg text-white text-sm border border-white/10 focus:border-orange-500/50 transition-all duration-300"
                    >
                      <option value="natural">Natural</option>
                      <option value="sunset">Sunset</option>
                      <option value="sunrise">Sunrise</option>
                      <option value="golden_hour">Golden Hour</option>
                      <option value="blue_hour">Blue Hour</option>
                      <option value="studio">Studio</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Color Tone</label>
                    <select
                      value={parameters.videoGenerationConfig.colorTone}
                      onChange={(e) => setParameters(prev => ({
                        ...prev,
                        videoGenerationConfig: { ...prev.videoGenerationConfig, colorTone: e.target.value as any }
                      }))}
                      className="w-full px-3 py-2 glass-panel rounded-lg text-white text-sm border border-white/10 focus:border-orange-500/50 transition-all duration-300"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="warm">Warm</option>
                      <option value="cool">Cool</option>
                      <option value="vibrant">Vibrant</option>
                      <option value="muted">Muted</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-cyber font-bold text-purple-400 mb-4">
                  Visual Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {styles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setParameters(prev => ({
                        ...prev,
                        videoGenerationConfig: { ...prev.videoGenerationConfig, style: style.id as any }
                      }))}
                      className={`p-4 rounded-xl glass-panel hover:glass-panel-strong transition-all duration-300 ${
                        parameters.videoGenerationConfig.style === style.id ? 'neon-glow border-purple-500/50' : ''
                      }`}
                    >
                      <div className={`w-full h-20 rounded-lg bg-gradient-to-br ${style.color} mb-3`}></div>
                      <div className="text-sm font-medium text-white">{style.label}</div>
                      <div className="text-xs text-gray-400">{style.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-cyber font-bold text-cyan-400 mb-4">
                  Duration
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {durations.map((duration) => (
                    <button
                      key={duration.value}
                      onClick={() => setParameters(prev => ({ ...prev, durationSeconds: duration.value }))}
                      className={`p-3 rounded-xl glass-panel hover:glass-panel-strong transition-all duration-300 text-sm ${
                        parameters.durationSeconds === duration.value ? 'neon-glow-cyan border-cyan-500/50' : ''
                      }`}
                    >
                      {duration.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-cyber font-bold text-orange-400 mb-4">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['16:9', '1:1', '9:16'].map((ratio) => (
                    <button
                      key={ratio}
                      onClick={() => setParameters(prev => ({ ...prev, aspectRatio: ratio as any }))}
                      className={`p-3 rounded-xl glass-panel hover:glass-panel-strong transition-all duration-300 text-sm ${
                        parameters.aspectRatio === ratio ? 'neon-glow border-orange-500/50' : ''
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
            </div>
          </div>

            <button
              onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white font-cyber font-bold rounded-2xl hover:scale-105 transition-all duration-300 neon-glow cyber-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="md" />
                    <span>Generating Neural Reality...</span>
                </>
              ) : (
                <>
                    <Zap className="w-5 h-5" />
                    <span>Generate Video</span>
                </>
              )}
            </button>
          </div>
        </div>
        </div>

        {/* Video Library */}
        <div className="glass-panel-strong p-8 rounded-3xl neon-glow">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-cyber font-bold gradient-text">Neural Library</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchVideos}
                className="flex items-center space-x-2 px-4 py-2 glass-panel rounded-lg hover:glass-panel-strong transition-all duration-300"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : generatedVideos.length === 0 ? (
            <div className="text-center py-12">
              <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">No videos generated yet. Create your first neural masterpiece!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedVideos.filter(video => {
                // Only render videos that have all required fields
                const isValid = video._id && video.title && video.status;
                
                // Additional check: only render if this video actually exists in our current list
                const existsInList = generatedVideos.some(v => v._id === video._id);
                
                console.log('Rendering video:', video._id, video.title, video.status, 'Valid:', isValid, 'Exists:', existsInList);
                
                return isValid && existsInList;
              }).map((video) => {
                console.log('✅ Actually rendering video:', video._id, video.title);
                return (
                <div key={video._id} className="glass-panel p-6 rounded-2xl hover:glass-panel-strong transition-all duration-300">
                  <div className="aspect-video bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl mb-4 flex items-center justify-center relative overflow-hidden">
                    {video.status === 'completed' && video.video ? (
                      <video
                        className="w-full h-full object-cover rounded-xl"
                        controls
                        preload="metadata"
                        data-video-id={video._id}
                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 225'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%23a855f7;stop-opacity:0.3' /%3E%3Cstop offset='100%25' style='stop-color:%2306b6d4;stop-opacity:0.3' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='225' fill='url(%23grad)' /%3E%3Ctext x='200' y='120' text-anchor='middle' fill='white' font-size='48' font-family='Arial'%3E▶%3C/text%3E%3C/svg%3E"
                        onError={(e) => {
                          console.error('Video playback error for video:', video._id, e);
                        }}
                        onLoadStart={() => {
                          console.log('Video loading started for:', video._id);
                        }}
                        onCanPlay={() => {
                          console.log('Video can play:', video._id);
                        }}
                        key={`${video._id}-${token}`} // Force re-render when token changes
                      >
                        <source 
                          src={video.video?.url || `${API_BASE_URL}/stream/${video._id}?token=${encodeURIComponent(token || '')}`} 
                          type="video/mp4"
                        />
                        Your browser does not support the video tag.
                      </video>
                    ) : null}
                    <div className={`text-center ${video.status === 'completed' && video.video ? 'hidden' : 'flex'} flex-col items-center justify-center w-full h-full`}>
                      {getStatusIcon(video.status)}
                      <p className="text-sm text-gray-300 mt-2 capitalize">{video.status}</p>
                      {video.status === 'processing' && (
                        <p className="text-xs text-blue-400 mt-1">Generating video...</p>
                      )}
                      {video.status === 'pending' && (
                        <p className="text-xs text-yellow-400 mt-1">Queued for processing</p>
                      )}
                      {video.status === 'completed' && video.video && (
                        <button
                          onClick={() => {
                            // Force video reload by updating the src
                            const videoElement = document.querySelector(`video[data-video-id="${video._id}"]`) as HTMLVideoElement;
                            if (videoElement) {
                              const currentSrc = videoElement.src;
                              videoElement.src = '';
                              setTimeout(() => {
                                videoElement.src = currentSrc;
                                videoElement.load();
                              }, 100);
                            }
                          }}
                          className="mt-2 px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-xs"
                        >
                          Retry Playback
                        </button>
                      )}
                          </div>
                        </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white truncate">{video.title}</h3>
                    <span className={`flex items-center space-x-1 text-xs px-2 py-1 rounded-full ${
                      video.videoType === 'image-to-video' 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {video.videoType === 'image-to-video' ? (
                        <Image className="w-3 h-3" />
                      ) : (
                        <FileText className="w-3 h-3" />
                      )}
                      <span>{video.videoType === 'image-to-video' ? 'I2V' : 'T2V'}</span>
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mb-3 line-clamp-2">{video.prompt}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>{video.parameters.durationSeconds}s • {video.parameters.aspectRatio}</span>
                    <span className={`flex items-center space-x-1 ${getStatusColor(video.status)}`}>
                      {getStatusIcon(video.status)}
                      <span className="capitalize">{video.status}</span>
                    </span>
                      </div>

                  {video.status === 'failed' && video.processingInfo?.errorMessage && (
                    <div className="text-xs text-red-400 mb-3 p-2 bg-red-500/10 rounded">
                      {video.processingInfo.errorMessage}
                    </div>
                  )}

                  <div className="flex space-x-2">
                    {video.status === 'completed' && video.video && (
                      <button
                        onClick={() => downloadVideo(video._id, video.video!.filename)}
                        className="flex-1 py-2 px-3 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm flex items-center justify-center space-x-1"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    )}
                    <button 
                      onClick={() => shareVideo(video)}
                      className="flex-1 py-2 px-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm flex items-center justify-center space-x-1"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                    <button 
                      onClick={() => deleteVideo(video._id)}
                      className="flex-1 py-2 px-3 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm flex items-center justify-center space-x-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
              })}
          </div>
        )}
          </div>
      </div>
    </div>
  );
};

export default Dashboard;