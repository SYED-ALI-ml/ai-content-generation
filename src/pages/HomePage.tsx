import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Play, Download, Share2, Cpu, Eye, Layers } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <Cpu className="w-8 h-8" />,
      title: 'Neural Processing',
      description: 'Advanced AI algorithms generate stunning videos from simple text prompts',
      color: 'from-purple-500 to-violet-600'
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: 'Vision Engine',
      description: 'Real-time preview and instant visual feedback for perfect results',
      color: 'from-pink-500 to-rose-600'
    },
    {
      icon: <Layers className="w-8 h-8" />,
      title: 'Multi-Layer Rendering',
      description: 'Complex scene composition with multiple elements and effects',
      color: 'from-cyan-500 to-blue-600'
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Quantum Speed',
      description: 'Lightning-fast generation powered by next-gen processing units',
      color: 'from-emerald-500 to-teal-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 cyber-grid opacity-30"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl floating-animation"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl floating-animation" style={{ animationDelay: '2s' }}></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl floating-animation" style={{ animationDelay: '4s' }}></div>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center">
          <div className="flex justify-center mb-12">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity duration-500 animate-pulse-slow"></div>
              <div className="relative w-32 h-32 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-full flex items-center justify-center neon-glow pulse-glow">
                <Sparkles className="w-16 h-16 text-white animate-bounce-slow" />
              </div>
            </div>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-cyber font-black mb-8 leading-tight">
            <span className="block text-white mb-4">Create Videos with</span>
            <span className="block gradient-text text-glow mb-4">Neural Intelligence</span>
            <span className="block text-3xl sm:text-4xl md:text-5xl text-gray-300 font-normal">
              —Beyond Human Imagination.
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-300 mb-16 max-w-4xl mx-auto leading-relaxed">
            Transform your ideas into cinematic masterpieces using advanced AI technology. 
            Generate, edit, and share professional videos in seconds with our quantum-powered platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link
              to={user ? "/dashboard" : "/signup"}
              className="group relative bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white px-10 py-5 rounded-2xl font-cyber font-bold text-lg hover:scale-105 transition-all duration-300 neon-glow cyber-button flex items-center space-x-3"
            >
              <span>Initialize Neural Engine</span>
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
            </Link>
            
            <Link
              to="/demo"
              className="group glass-panel-strong px-10 py-5 rounded-2xl font-cyber font-bold text-lg text-purple-400 hover:text-white transition-all duration-300 hover:neon-glow cyber-button flex items-center space-x-3"
            >
              <Play className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
              <span>Watch Neural Demo</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-cyber font-bold mb-6">
            <span className="text-white">Advanced </span>
            <span className="gradient-text text-glow">Neural Capabilities</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Powered by quantum processors and neural networks designed for next-generation content creation
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group glass-panel-strong p-8 rounded-2xl hover:neon-glow transition-all duration-500 transform hover:-translate-y-4 scan-line"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 neon-glow-pink`}>
                <div className="text-white">
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-xl font-cyber font-bold text-white mb-4 group-hover:text-glow transition-all duration-300">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Preview Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-cyber font-bold text-white mb-6">
            Neural Interface
            <span className="block gradient-text text-glow">In Action</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Experience the future of video creation with our intuitive neural interface
          </p>
        </div>

        <div className="glass-panel-strong p-12 rounded-3xl neon-glow hologram-effect">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-3xl font-cyber font-bold text-white mb-8">
                Quantum Creation Process
              </h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-6 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center text-white font-cyber font-bold text-lg neon-glow group-hover:scale-110 transition-transform duration-300">1</div>
                  <div>
                    <p className="font-cyber font-bold text-purple-400 text-lg mb-2">Neural Input</p>
                    <p className="text-gray-300">Describe your vision using natural language</p>
                  </div>
                </div>
                <div className="flex items-start space-x-6 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center text-white font-cyber font-bold text-lg neon-glow-pink group-hover:scale-110 transition-transform duration-300">2</div>
                  <div>
                    <p className="font-cyber font-bold text-pink-400 text-lg mb-2">AI Processing</p>
                    <p className="text-gray-300">Advanced algorithms interpret and visualize</p>
                  </div>
                </div>
                <div className="flex items-start space-x-6 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-cyber font-bold text-lg neon-glow-cyan group-hover:scale-110 transition-transform duration-300">3</div>
                  <div>
                    <p className="font-cyber font-bold text-cyan-400 text-lg mb-2">Quantum Render</p>
                    <p className="text-gray-300">High-definition video generation in seconds</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="glass-panel rounded-2xl p-8 border-2 border-dashed border-purple-500/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-cyan-500/5"></div>
              <div className="relative text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500 rounded-3xl mx-auto mb-6 flex items-center justify-center neon-glow pulse-glow">
                  <Play className="w-12 h-12 text-white" />
                </div>
                <h4 className="text-2xl font-cyber font-bold gradient-text mb-4">
                  Neural Preview
                </h4>
                <p className="text-gray-400 mb-6">
                  Interactive holographic preview interface
                </p>
                <div className="flex justify-center space-x-4">
                  <button className="glass-panel px-4 py-2 rounded-xl text-purple-400 hover:neon-glow transition-all duration-300 cyber-button">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="glass-panel px-4 py-2 rounded-xl text-cyan-400 hover:neon-glow-cyan transition-all duration-300 cyber-button">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="glass-panel-strong p-16 rounded-3xl text-center neon-glow relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-cyan-600/10"></div>
          <div className="relative">
            <h2 className="text-4xl sm:text-5xl font-cyber font-bold mb-6">
              <span className="text-white">Ready to Enter the</span>
              <span className="block gradient-text text-glow">Neural Dimension?</span>
            </h2>
            <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
              Join the next generation of creators using quantum-powered AI to revolutionize video content
            </p>
            <Link
              to={user ? "/dashboard" : "/signup"}
              className="inline-flex items-center space-x-4 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 text-white px-12 py-6 rounded-2xl font-cyber font-bold text-xl hover:scale-105 transition-all duration-300 neon-glow cyber-button"
            >
              <span>Activate Neural Engine</span>
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;