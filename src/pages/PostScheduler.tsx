import React, { useState } from 'react';
import { Calendar, Clock, Instagram, Facebook, Linkedin, Youtube, Plus, Edit, Trash2, Zap, Eye, Settings } from 'lucide-react';

interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  scheduledDate: Date;
  status: 'scheduled' | 'published' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
}

const PostScheduler: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([
    {
      id: '1',
      content: 'Futuristic cityscape with neon lights and flying vehicles 🚀',
      platforms: ['instagram', 'facebook', 'linkedin'],
      scheduledDate: new Date(2024, 0, 15, 14, 30),
      status: 'scheduled',
      thumbnailUrl: 'https://images.pexels.com/photos/3944454/pexels-photo-3944454.jpeg?auto=compress&cs=tinysrgb&w=300'
    },
    {
      id: '2',
      content: 'Behind the scenes of neural video generation ✨',
      platforms: ['instagram', 'youtube'],
      scheduledDate: new Date(2024, 0, 16, 10, 0),
      status: 'scheduled',
      thumbnailUrl: 'https://images.pexels.com/photos/2599244/pexels-photo-2599244.jpeg?auto=compress&cs=tinysrgb&w=300'
    }
  ]);

  const platforms = [
    { 
      id: 'instagram', 
      name: 'Instagram', 
      icon: <Instagram className="w-4 h-4" />, 
      color: 'from-purple-500 to-pink-500',
      glow: 'neon-glow-pink'
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      icon: <Facebook className="w-4 h-4" />, 
      color: 'from-blue-500 to-blue-600',
      glow: 'neon-glow-cyan'
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      icon: <Linkedin className="w-4 h-4" />, 
      color: 'from-blue-600 to-blue-700',
      glow: 'neon-glow'
    },
    { 
      id: 'youtube', 
      name: 'YouTube', 
      icon: <Youtube className="w-4 h-4" />, 
      color: 'from-red-500 to-red-600',
      glow: 'neon-glow-pink'
    }
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    
    return days;
  };

  const getPostsForDate = (date: Date) => {
    return scheduledPosts.filter(post => 
      post.scheduledDate.toDateString() === date.toDateString()
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'published': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const days = getDaysInMonth(selectedDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 cyber-grid opacity-20"></div>
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl floating-animation"></div>
      <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl floating-animation" style={{ animationDelay: '2s' }}></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12">
          <h1 className="text-4xl font-cyber font-bold gradient-text text-glow mb-4">
            Neural Timeline
          </h1>
          <p className="text-gray-300 text-lg">
            Schedule and manage your AI-generated content across quantum networks
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="glass-panel-strong p-8 rounded-3xl neon-glow">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-cyber font-bold text-white">
                  {monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                </h2>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}
                    className="p-3 rounded-xl glass-panel hover:neon-glow transition-all duration-300 cyber-button"
                  >
                    <span className="text-purple-400 font-cyber font-bold">←</span>
                  </button>
                  <button
                    onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}
                    className="p-3 rounded-xl glass-panel hover:neon-glow transition-all duration-300 cyber-button"
                  >
                    <span className="text-purple-400 font-cyber font-bold">→</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-6">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                  <div key={day} className="p-3 text-center text-sm font-cyber font-bold text-purple-400">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {days.map((day, index) => {
                  const postsForDay = getPostsForDate(day);
                  const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                  const isToday = day.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] p-3 border rounded-xl transition-all duration-300 ${
                        isCurrentMonth 
                          ? 'glass-panel border-white/10 hover:border-purple-500/30' 
                          : 'bg-white/5 border-white/5 text-gray-500'
                      } ${isToday ? 'border-cyan-500 neon-glow-cyan' : ''}`}
                    >
                      <div className={`text-sm font-cyber font-bold mb-2 ${
                        isToday ? 'text-cyan-400' : isCurrentMonth ? 'text-white' : 'text-gray-500'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {postsForDay.map((post) => (
                          <div
                            key={post.id}
                            className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-lg truncate border border-purple-500/30"
                          >
                            {post.scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Scheduled Posts */}
          <div className="space-y-8">
            <div className="glass-panel-strong p-8 rounded-3xl neon-glow">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-cyber font-bold text-white flex items-center space-x-3">
                  <Eye className="w-6 h-6 text-cyan-400" />
                  <span>Scheduled Posts</span>
                </h2>
                <button className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white px-6 py-3 rounded-xl hover:scale-105 transition-all duration-300 neon-glow cyber-button flex items-center space-x-2">
                  <Plus className="w-4 h-4" />
                  <span className="font-cyber font-bold">New Post</span>
                </button>
              </div>

              <div className="space-y-6">
                {scheduledPosts.map((post) => (
                  <div
                    key={post.id}
                    className="glass-panel p-6 rounded-2xl hover:neon-glow transition-all duration-300 border border-white/10"
                  >
                    {post.thumbnailUrl && (
                      <div className="relative mb-4">
                        <img
                          src={post.thumbnailUrl}
                          alt="Post preview"
                          className="w-full h-32 object-cover rounded-xl"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-xl"></div>
                        <div className="absolute top-3 right-3 glass-panel px-2 py-1 rounded-lg">
                          <Zap className="w-3 h-3 text-purple-400" />
                        </div>
                      </div>
                    )}
                    
                    <p className="text-white mb-4 line-clamp-2 font-medium">
                      {post.content}
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.platforms.map((platformId) => {
                        const platform = platforms.find(p => p.id === platformId);
                        return platform ? (
                          <span
                            key={platformId}
                            className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-cyber font-bold text-white bg-gradient-to-r ${platform.color} ${platform.glow}`}
                          >
                            {platform.icon}
                            <span className="ml-2">{platform.name}</span>
                          </span>
                        ) : null;
                      })}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-4 h-4" />
                          <span>{post.scheduledDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{post.scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-xl text-xs font-cyber font-bold border ${getStatusColor(post.status)}`}>
                          {post.status}
                        </span>
                        <button className="p-2 text-gray-400 hover:text-purple-400 transition-colors cyber-button">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-red-400 transition-colors cyber-button">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Status */}
            <div className="glass-panel-strong p-8 rounded-3xl neon-glow">
              <h3 className="text-xl font-cyber font-bold text-white mb-6 flex items-center space-x-3">
                <Settings className="w-5 h-5 text-pink-400" />
                <span>Neural Networks</span>
              </h3>
              <div className="space-y-4">
                {platforms.map((platform) => (
                  <div key={platform.id} className="flex items-center justify-between p-4 glass-panel rounded-xl border border-white/10">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${platform.color} text-white ${platform.glow}`}>
                        {platform.icon}
                      </div>
                      <span className="font-cyber font-bold text-white">
                        {platform.name}
                      </span>
                    </div>
                    <span className="text-sm text-green-400 font-cyber font-bold">
                      CONNECTED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostScheduler;