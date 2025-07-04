import React, { useState } from 'react';
import { Play, Video, Sparkles, Download, Share2, Zap, Cpu, Eye, Settings } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

interface GeneratedVideo {
  id: string;
  title: string;
  prompt: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: string;
  resolution: string;
  status: 'generating' | 'completed' | 'failed';
  createdAt: Date;
}

const Dashboard: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [selectedDuration, setSelectedDuration] = useState('30');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>([]);

  const styles = [
    { id: 'cinematic', label: 'Cinematic', color: 'from-purple-500 to-violet-600', description: 'Hollywood-style production' },
    { id: 'anime', label: 'Anime', color: 'from-pink-500 to-rose-600', description: 'Japanese animation style' },
    { id: 'realistic', label: 'Realistic', color: 'from-cyan-500 to-blue-600', description: 'Photorealistic rendering' },
    { id: 'abstract', label: 'Abstract', color: 'from-emerald-500 to-teal-600', description: 'Artistic interpretation' }
  ];

  const durations = [
    { value: '15', label: '15 seconds' },
    { value: '30', label: '30 seconds' },
    { value: '60', label: '1 minute' },
    { value: '120', label: '2 minutes' }
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 5000));

    const newVideo: GeneratedVideo = {
      id: Date.now().toString(),
      title: prompt.slice(0, 50) + (prompt.length > 50 ? '...' : ''),
      prompt,
      thumbnailUrl: 'https://images.pexels.com/photos/3944454/pexels-photo-3944454.jpeg?auto=compress&cs=tinysrgb&w=500',
      duration: `${selectedDuration}s`,
      resolution: '4K',
      status: 'completed',
      createdAt: new Date()
    };

    setGeneratedVideos(prev => [newVideo, ...prev]);
    setPrompt('');
    setIsGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 cyber-grid opacity-20"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl floating-animation"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl floating-animation" style={{ animationDelay: '3s' }}></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-cyber font-bold gradient-text text-glow mb-4">
            Neural Studio
          </h1>
          <p className="text-gray-300 text-lg">
            Transform your imagination into cinematic reality with quantum-powered AI
          </p>
        </div>

        {/* Creation Interface */}
        <div className="glass-panel-strong p-8 rounded-3xl mb-12 neon-glow">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Prompt Input */}
            <div className="lg:col-span-2">
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
                  <span className="text-sm text-gray-400">{prompt.length}/500</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <div>
                <label className="block text-lg font-cyber font-bold text-cyan-400 mb-4">
                  Visual Style
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {styles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        selectedStyle === style.id
                          ? 'border-purple-500 neon-glow bg-purple-500/20'
                          : 'border-white/10 glass-panel hover:border-purple-500/50'
                      }`}
                    >
                      <div className={`w-8 h-8 bg-gradient-to-br ${style.color} rounded-lg mb-2 mx-auto`}></div>
                      <p className="text-white font-cyber font-bold text-sm">{style.label}</p>
                      <p className="text-gray-400 text-xs">{style.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-lg font-cyber font-bold text-pink-400 mb-4">
                  Duration
                </label>
                <div className="space-y-2">
                  {durations.map((duration) => (
                    <button
                      key={duration.value}
                      onClick={() => setSelectedDuration(duration.value)}
                      className={`w-full p-3 rounded-xl border transition-all duration-300 ${
                        selectedDuration === duration.value
                          ? 'border-pink-500 bg-pink-500/20 text-pink-400'
                          : 'border-white/10 glass-panel text-gray-300 hover:border-pink-500/50'
                      }`}
                    >
                      {duration.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="group bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white py-4 px-12 rounded-2xl font-cyber font-bold text-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 neon-glow cyber-button flex items-center space-x-4"
            >
              {isGenerating ? (
                <>
                  <LoadingSpinner size="md" />
                  <span>Neural Processing...</span>
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
                  <span>Generate Neural Video</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Videos */}
        {generatedVideos.length > 0 && (
          <div>
            <h2 className="text-3xl font-cyber font-bold text-white mb-8 flex items-center space-x-3">
              <Eye className="w-8 h-8 text-cyan-400" />
              <span>Neural Creations</span>
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {generatedVideos.map((video) => (
                <div
                  key={video.id}
                  className="glass-panel-strong rounded-2xl overflow-hidden hover:neon-glow transition-all duration-500 transform hover:-translate-y-2 group"
                >
                  {video.thumbnailUrl && (
                    <div className="relative">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      <div className="absolute top-4 right-4 glass-panel px-3 py-1 rounded-lg">
                        <span className="text-cyan-400 font-cyber font-bold text-sm">{video.duration}</span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center justify-between">
                          <span className="text-purple-400 font-cyber font-bold text-sm">{video.resolution}</span>
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center neon-glow-pink group-hover:scale-110 transition-transform duration-300">
                            <Play className="w-6 h-6 text-white ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-cyber font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                        <Cpu className="w-3 h-3 mr-1" />
                        {video.status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {video.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="font-cyber font-bold text-white mb-3 group-hover:text-glow transition-all duration-300">
                      {video.title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm mb-6 line-clamp-2">
                      {video.prompt}
                    </p>

                    <div className="flex space-x-3">
                      <button className="flex-1 glass-panel text-purple-400 px-4 py-3 rounded-xl hover:neon-glow transition-all duration-300 flex items-center justify-center space-x-2 cyber-button">
                        <Download className="w-4 h-4" />
                        <span className="font-cyber font-bold text-sm">Download</span>
                      </button>
                      <button className="flex-1 glass-panel text-cyan-400 px-4 py-3 rounded-xl hover:neon-glow-cyan transition-all duration-300 flex items-center justify-center space-x-2 cyber-button">
                        <Share2 className="w-4 h-4" />
                        <span className="font-cyber font-bold text-sm">Share</span>
                      </button>
                      <button className="glass-panel text-pink-400 px-4 py-3 rounded-xl hover:neon-glow-pink transition-all duration-300 cyber-button">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {generatedVideos.length === 0 && !isGenerating && (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-3xl mx-auto mb-8 flex items-center justify-center neon-glow pulse-glow">
              <Video className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-cyber font-bold gradient-text mb-4">
              Neural Studio Ready
            </h3>
            <p className="text-gray-400 max-w-md mx-auto">
              Enter your creative vision above and watch as our quantum AI transforms it into stunning video content
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;