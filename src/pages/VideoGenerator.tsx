import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { ThemeContext } from '../contexts/ThemeContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Navigation from '../components/Navigation';

interface VideoParameters {
  aspectRatio: '16:9' | '1:1' | '9:16';
  durationSeconds: number;
  sampleCount: number;
  enhancePrompt: boolean;
  seed?: number;
  videoGenerationConfig?: {
    movement: 'slow' | 'medium' | 'fast';
    camera: 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'static';
    style: 'cinematic' | 'photorealistic' | 'anime' | 'cartoon' | 'artistic';
    lighting: 'natural' | 'sunset' | 'sunrise' | 'golden_hour' | 'blue_hour' | 'studio';
    colorTone: 'warm' | 'cool' | 'neutral' | 'vibrant' | 'muted';
  };
}

interface Video {
  _id: string;
  title: string;
  prompt: string;
  description?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoType: 'text-to-video' | 'image-to-video';
  parameters: VideoParameters;
  video?: {
    filename: string;
    size: number;
    duration?: number;
  };
  processingInfo?: {
    startedAt?: string;
    completedAt?: string;
    errorMessage?: string;
  };
  createdAt: string;
  tags: string[];
  isPrivate: boolean;
}

interface VideoStats {
  total: number;
  byStatus: {
    pending?: number;
    processing?: number;
    completed?: number;
    failed?: number;
  };
}

const VideoGenerator: React.FC = () => {
  const { user, token } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const [activeTab, setActiveTab] = useState<'generate' | 'library'>('generate');
  const [videoType, setVideoType] = useState<'text-to-video' | 'image-to-video'>('text-to-video');
  const [formData, setFormData] = useState({
    title: '',
    prompt: '',
    description: '',
    tags: ''
  });
  const [parameters, setParameters] = useState<VideoParameters>({
    aspectRatio: '16:9',
    durationSeconds: 5,
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [videoTypeFilter, setVideoTypeFilter] = useState<string>('');

  const API_BASE_URL = 'http://localhost:5001/api';

  useEffect(() => {
    if (user && token) {
      fetchVideos();
      fetchStats();
    }
  }, [user, token, currentPage, statusFilter, videoTypeFilter]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10'
      });
      if (statusFilter) params.append('status', statusFilter);
      if (videoTypeFilter) params.append('videoType', videoTypeFilter);

      const response = await fetch(`${API_BASE_URL}/videos?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setVideos(data.data.videos);
        setTotalPages(data.data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/videos/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !token) return;

    try {
      setIsGenerating(true);
      const formDataToSend = new FormData();
      
      formDataToSend.append('title', formData.title);
      formDataToSend.append('prompt', formData.prompt);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('videoType', videoType);
      formDataToSend.append('parameters', JSON.stringify(parameters));
      formDataToSend.append('tags', formData.tags);

      if (videoType === 'image-to-video' && selectedImage) {
        formDataToSend.append('image', selectedImage);
      }

      const response = await fetch(`${API_BASE_URL}/videos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        const data = await response.json();
        alert('Video generation started! Check the library for updates.');
        setFormData({ title: '', prompt: '', description: '', tags: '' });
        setSelectedImage(null);
        setImagePreview('');
        fetchVideos();
        fetchStats();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error generating video:', error);
      alert('Failed to start video generation');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadVideo = async (videoId: string, filename: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/videos/${videoId}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading video:', error);
      alert('Failed to download video');
    }
  };

  const deleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchVideos();
        fetchStats();
      } else {
        alert('Failed to delete video');
      }
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!user) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please log in to access video generation</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">AI Video Generator</h1>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'generate'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Generate Video
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeTab === 'library'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Video Library
            </button>
          </div>
        </div>

        {activeTab === 'generate' && (
          <div className="max-w-6xl mx-auto">
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8`}>
              <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Neural Studio
              </h2>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
                Transform your imagination into cinematic reality with quantum-powered AI
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Video Type Selection */}
                <div className="text-center">
                  <label className="block text-lg font-semibold mb-4 text-purple-600 dark:text-purple-400">Generation Mode</label>
                  <div className="flex justify-center space-x-4">
                    <button
                      type="button"
                      onClick={() => setVideoType('text-to-video')}
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                        videoType === 'text-to-video'
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Text to Video
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoType('image-to-video')}
                      className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                        videoType === 'image-to-video'
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      Image to Video
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Left Column - Input */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-lg font-semibold mb-3 text-purple-600 dark:text-purple-400">
                        Neural Input Prompt
                      </label>
                      <div className="relative">
                        <textarea
                          value={formData.prompt}
                          onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                          className={`w-full h-32 px-4 py-3 border-2 rounded-xl resize-none transition-all duration-300 ${
                            theme === 'dark' 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                          placeholder="Describe your vision... e.g., 'A futuristic city at sunset with flying cars and neon lights reflecting on wet streets'"
                          required
                        />
                        <div className="absolute bottom-3 right-3 text-sm text-gray-400">
                          {formData.prompt.length}/500
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Title</label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 ${
                            theme === 'dark' 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                          placeholder="Enter video title"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Tags</label>
                        <input
                          type="text"
                          value={formData.tags}
                          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                          className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 ${
                            theme === 'dark' 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                          } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                          placeholder="nature, cinematic, 4k"
                        />
                      </div>
                    </div>

                    {/* Image Upload for Image-to-Video */}
                    {videoType === 'image-to-video' && (
                      <div>
                        <label className="block text-sm font-medium mb-2">Input Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 ${
                            theme === 'dark' 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                          } focus:outline-none`}
                          required
                        />
                        {imagePreview && (
                          <div className="mt-4">
                            <img src={imagePreview} alt="Preview" className="max-w-full h-48 object-cover rounded-xl" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Column - Parameters */}
                  <div className="space-y-6">
                    <div>
                      <label className="block text-lg font-semibold mb-4 text-blue-600 dark:text-blue-400">
                        Visual Style
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: 'cinematic', label: 'Cinematic', desc: 'Hollywood-style production' },
                          { value: 'anime', label: 'Anime', desc: 'Japanese animation style' },
                          { value: 'photorealistic', label: 'Realistic', desc: 'Photorealistic rendering' },
                          { value: 'artistic', label: 'Artistic', desc: 'Creative interpretation' }
                        ].map((style) => (
                          <button
                            key={style.value}
                            type="button"
                            onClick={() => setParameters({ 
                              ...parameters, 
                              videoGenerationConfig: { 
                                ...parameters.videoGenerationConfig!, 
                                style: style.value as any 
                              } 
                            })}
                            className={`p-4 rounded-xl border-2 transition-all duration-300 text-left ${
                              parameters.videoGenerationConfig?.style === style.value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                            }`}
                          >
                            <div className="font-medium">{style.label}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{style.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-lg font-semibold mb-4 text-green-600 dark:text-green-400">
                        Duration
                      </label>
                      <div className="flex space-x-2">
                        {[5, 8, 10, 15].map((duration) => (
                          <button
                            key={duration}
                            type="button"
                            onClick={() => setParameters({ ...parameters, durationSeconds: duration })}
                            className={`flex-1 py-3 rounded-xl font-medium transition-all duration-300 ${
                              parameters.durationSeconds === duration
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {duration}s
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Aspect Ratio</label>
                        <select
                          value={parameters.aspectRatio}
                          onChange={(e) => setParameters({ ...parameters, aspectRatio: e.target.value as any })}
                          className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 ${
                            theme === 'dark' 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                          } focus:outline-none`}
                        >
                          <option value="16:9">16:9 (Landscape)</option>
                          <option value="1:1">1:1 (Square)</option>
                          <option value="9:16">9:16 (Portrait)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Sample Count</label>
                        <input
                          type="number"
                          min="1"
                          max="4"
                          value={parameters.sampleCount}
                          onChange={(e) => setParameters({ ...parameters, sampleCount: parseInt(e.target.value) })}
                          className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 ${
                            theme === 'dark' 
                              ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                              : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                          } focus:outline-none`}
                        />
                      </div>
                    </div>

                    {/* Advanced Parameters */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4 text-orange-600 dark:text-orange-400">Advanced Parameters</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">Seed (Optional)</label>
                          <input
                            type="number"
                            min="1"
                            max="999999999"
                            value={parameters.seed || ''}
                            onChange={(e) => setParameters({ 
                              ...parameters, 
                              seed: e.target.value ? parseInt(e.target.value) : undefined 
                            })}
                            placeholder="Random seed for reproducibility"
                            className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 ${
                              theme === 'dark' 
                                ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500 placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500 placeholder-gray-500'
                            } focus:outline-none`}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Movement</label>
                            <select
                              value={parameters.videoGenerationConfig?.movement || 'medium'}
                              onChange={(e) => setParameters({ 
                                ...parameters, 
                                videoGenerationConfig: { 
                                  ...parameters.videoGenerationConfig!, 
                                  movement: e.target.value as any 
                                } 
                              })}
                              className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 ${
                                theme === 'dark' 
                                  ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                                  : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                              } focus:outline-none`}
                            >
                              <option value="slow">Slow</option>
                              <option value="medium">Medium</option>
                              <option value="fast">Fast</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">Camera</label>
                            <select
                              value={parameters.videoGenerationConfig?.camera || 'static'}
                              onChange={(e) => setParameters({ 
                                ...parameters, 
                                videoGenerationConfig: { 
                                  ...parameters.videoGenerationConfig!, 
                                  camera: e.target.value as any 
                                } 
                              })}
                              className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 ${
                                theme === 'dark' 
                                  ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                                  : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                              } focus:outline-none`}
                            >
                              <option value="static">Static</option>
                              <option value="zoom_in">Zoom In</option>
                              <option value="zoom_out">Zoom Out</option>
                              <option value="pan_left">Pan Left</option>
                              <option value="pan_right">Pan Right</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-2">Lighting</label>
                            <select
                              value={parameters.videoGenerationConfig?.lighting || 'natural'}
                              onChange={(e) => setParameters({ 
                                ...parameters, 
                                videoGenerationConfig: { 
                                  ...parameters.videoGenerationConfig!, 
                                  lighting: e.target.value as any 
                                } 
                              })}
                              className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 ${
                                theme === 'dark' 
                                  ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                                  : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                              } focus:outline-none`}
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
                            <label className="block text-sm font-medium mb-2">Color Tone</label>
                            <select
                              value={parameters.videoGenerationConfig?.colorTone || 'neutral'}
                              onChange={(e) => setParameters({ 
                                ...parameters, 
                                videoGenerationConfig: { 
                                  ...parameters.videoGenerationConfig!, 
                                  colorTone: e.target.value as any 
                                } 
                              })}
                              className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 ${
                                theme === 'dark' 
                                  ? 'bg-gray-700 border-gray-600 text-white focus:border-purple-500' 
                                  : 'bg-white border-gray-300 text-gray-900 focus:border-purple-500'
                              } focus:outline-none`}
                            >
                              <option value="neutral">Neutral</option>
                              <option value="warm">Warm</option>
                              <option value="cool">Cool</option>
                              <option value="vibrant">Vibrant</option>
                              <option value="muted">Muted</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id="enhancePrompt"
                            checked={parameters.enhancePrompt}
                            onChange={(e) => setParameters({ ...parameters, enhancePrompt: e.target.checked })}
                            className="mr-3 w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <label htmlFor="enhancePrompt" className="text-sm font-medium">
                            Auto-enhance prompt with AI
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-6">
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className={`px-12 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                      isGenerating
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    {isGenerating ? (
                      <div className="flex items-center space-x-3">
                        <LoadingSpinner size="sm" />
                        <span>Neural Processing...</span>
                      </div>
                    ) : (
                      'Generate Neural Video'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="max-w-6xl mx-auto">
            {/* Stats */}
            {stats && (
              <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8`}>
                <h2 className="text-2xl font-semibold mb-4">Video Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Videos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{stats.byStatus.pending || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.byStatus.processing || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{stats.byStatus.completed || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.byStatus.failed || 0}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8`}>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`px-3 py-2 border rounded-md ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Type</label>
                  <select
                    value={videoTypeFilter}
                    onChange={(e) => setVideoTypeFilter(e.target.value)}
                    className={`px-3 py-2 border rounded-md ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">All Types</option>
                    <option value="text-to-video">Text to Video</option>
                    <option value="image-to-video">Image to Video</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Videos List */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6`}>
              <h2 className="text-2xl font-semibold mb-6">Your Videos</h2>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                  No videos found. Start by generating your first video!
                </div>
              ) : (
                <div className="space-y-4">
                  {videos.map((video) => (
                    <div
                      key={video._id}
                      className={`border rounded-lg p-4 ${
                        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">{video.title}</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-2">{video.prompt}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status)} bg-opacity-10`}>
                              {video.status}
                            </span>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              {video.videoType}
                            </span>
                            {video.tags.map((tag, index) => (
                              <span key={index} className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                {tag}
                              </span>
                            ))}
                          </div>

                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span>Created: {new Date(video.createdAt).toLocaleDateString()}</span>
                            {video.video && (
                              <>
                                <span className="mx-2">•</span>
                                <span>Size: {formatFileSize(video.video.size)}</span>
                              </>
                            )}
                          </div>

                          {video.processingInfo?.errorMessage && (
                            <div className="mt-2 text-sm text-red-600">
                              Error: {video.processingInfo.errorMessage}
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          {video.status === 'completed' && video.video && (
                            <button
                              onClick={() => downloadVideo(video._id, video.video!.filename)}
                              className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 transition-colors"
                            >
                              Download
                            </button>
                          )}
                          <button
                            onClick={() => deleteVideo(video._id)}
                            className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-2 rounded-md ${
                        currentPage === 1
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      Previous
                    </button>
                    <span className="px-3 py-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-2 rounded-md ${
                        currentPage === totalPages
                          ? 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoGenerator; 