import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizeClasses[size]} ${className} relative`}>
      <div className="absolute inset-0 rounded-full border-2 border-purple-200/30"></div>
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 border-r-pink-500 animate-spin"></div>
      <div className="absolute inset-1 rounded-full border border-transparent border-t-cyan-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1s' }}></div>
    </div>
  );
};

export default LoadingSpinner;