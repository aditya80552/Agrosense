import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Thermometer, 
  Droplets, 
  Gauge, 
  Sun as SunIcon, 
  Weight, 
  Compass,
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle,
  Leaf, 
  Heart, 
  Star,
  Sparkles,
  Zap,
  Activity,
  Eye,
  EyeOff
} from 'lucide-react';

interface ModernSensorCardProps {
  title: string;
  value: number | null | undefined;
  unit: string;
  icon: 'temperature' | 'humidity' | 'moisture' | 'light' | 'weight' | 'tilt';
  color: string;
  isDarkMode: boolean;
  stats: { min: number; max: number; avg: number };
  optimalRange?: { min: number; max: number };
  trend?: 'up' | 'down' | 'stable';
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const icons = {
  temperature: Thermometer,
  humidity: Droplets,
  moisture: Gauge,
  light: SunIcon,
  weight: Weight,
  tilt: Compass,
};

const getStatusColor = (value: number | null | undefined, optimalRange?: { min: number; max: number }, isDarkMode?: boolean) => {
  if (!value || !optimalRange) return isDarkMode ? 'text-gray-400' : 'text-gray-500';
  
  if (value >= optimalRange.min && value <= optimalRange.max) {
    return isDarkMode ? 'text-emerald-400' : 'text-emerald-600';
  } else if (value < optimalRange.min * 0.8 || value > optimalRange.max * 1.2) {
    return isDarkMode ? 'text-red-400' : 'text-red-600';
  } else {
    return isDarkMode ? 'text-yellow-400' : 'text-yellow-600';
  }
};

const getStatusIcon = (value: number | null | undefined, optimalRange?: { min: number; max: number }) => {
  if (!value || !optimalRange) return AlertTriangle;
  
  if (value >= optimalRange.min && value <= optimalRange.max) {
    return CheckCircle;
  } else {
    return AlertTriangle;
  }
};

const cardVariants = {
  initial: { scale: 0.9, opacity: 0, y: 20 },
  animate: { 
    scale: 1, 
    opacity: 1, 
    y: 0,
    transition: { 
      type: 'spring', 
      stiffness: 200, 
      damping: 20,
      duration: 0.6
    }
  },
  hover: { 
    scale: 1.03,
    y: -5,
    transition: { 
      type: "spring", 
      stiffness: 400,
      damping: 25
    }
  },
  tap: { scale: 0.97 }
};

const iconVariants = {
  idle: { rotate: 0, scale: 1 },
  hover: { rotate: 360, scale: 1.1 },
  pulse: { scale: [1, 1.2, 1] }
};

export const ModernSensorCard: React.FC<ModernSensorCardProps> = ({ 
  title, 
  value, 
  unit, 
  icon, 
  color, 
  isDarkMode, 
  stats, 
  optimalRange,
  trend = 'stable',
  isExpanded = false,
  onToggleExpand
}) => {
  const Icon = icons[icon] || Thermometer;
  const StatusIcon = getStatusIcon(value, optimalRange);
  const statusColor = getStatusColor(value, optimalRange, isDarkMode);
  const [showDetails, setShowDetails] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Trigger animation when value changes
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [value]);

  // Calculate progress within optimal range
  const progress = optimalRange && value !== undefined && value !== null 
    ? Math.min(100, Math.max(0, ((value - optimalRange.min) / (optimalRange.max - optimalRange.min)) * 100))
    : 0;

  // Get cute messages based on sensor type and value
  const getCuteMessage = () => {
    if (!value) return "Waiting for data... 🌱";
    
    switch (icon) {
      case 'temperature':
        if (value > 30) return "Feeling toasty! 🔥";
        if (value < 15) return "Brrr, chilly! ❄️";
        return "Perfect temperature! 🌡️";
      case 'humidity':
        if (value > 80) return "So humid! 💧";
        if (value < 30) return "Dry as a desert! 🏜️";
        return "Just right! 💨";
      case 'moisture':
        if (value < 20) return "Thirsty plant! 🥤";
        if (value > 80) return "Well hydrated! 💦";
        return "Happy roots! 🌿";
      case 'light':
        if (value > 40000) return "Bright sunshine! ☀️";
        if (value < 1000) return "Cozy shade! 🌙";
        return "Perfect lighting! ✨";
      case 'weight':
        return `Weighing ${value.toFixed(1)}kg! ⚖️`;
      case 'tilt':
        if (Math.abs(value) > 20) return "Leaning tower! 🗼";
        return "Standing tall! 🏛️";
      default:
        return "Looking good! 👍";
    }
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
      whileTap="tap"
      className={`relative overflow-hidden rounded-3xl backdrop-blur-xl border transition-all duration-500 cursor-pointer group ${
        isDarkMode 
          ? 'bg-gray-900/60 border-emerald-800/30 hover:border-emerald-600/50' 
          : 'bg-white/60 border-emerald-200/30 hover:border-emerald-400/50'
      }`}
      onClick={onToggleExpand}
    >
      {/* Animated Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`} />
      
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -20, 0],
              x: [0, Math.random() * 10 - 5, 0],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
            className={`absolute w-1 h-1 rounded-full ${isDarkMode ? 'bg-emerald-400/40' : 'bg-emerald-500/40'}`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <motion.div
              variants={iconVariants}
              animate={value ? "pulse" : "idle"}
              transition={{ duration: 2, repeat: Infinity }}
              className={`p-3 rounded-2xl ${isDarkMode ? 'bg-emerald-900/30' : 'bg-emerald-100/50'} backdrop-blur-sm`}
            >
              <Icon className={`w-6 h-6 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
            </motion.div>
            <div>
              <h3 className={`font-semibold text-sm ${isDarkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                {title}
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {getCuteMessage()}
              </p>
            </div>
          </div>
          
          {/* Status Indicator */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center space-x-1"
          >
            <StatusIcon className={`w-4 h-4 ${statusColor}`} />
            {onToggleExpand && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
              >
                {isExpanded ? (
                  <EyeOff className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                ) : (
                  <Eye className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                )}
              </motion.button>
            )}
          </motion.div>
        </div>

        {/* Value Display */}
        <div className="mb-4">
          <motion.div
            key={animationKey}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="flex items-baseline space-x-2"
          >
            <span className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {value !== undefined && value !== null ? value.toFixed(1) : '--'}
            </span>
            <span className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {unit}
            </span>
            {/* Trend Indicator */}
            {trend !== 'stable' && value && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {trend === 'up' ? (
                  <TrendingUp className={`w-5 h-5 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
                ) : (
                  <TrendingDown className={`w-5 h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} />
                )}
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Progress Bar */}
        {optimalRange && value !== undefined && value !== null && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Optimal Range
              </span>
              <span className={statusColor}>
                {progress.toFixed(0)}%
              </span>
            </div>
            <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={`h-full rounded-full ${
                  progress >= 80 ? 'bg-emerald-500' :
                  progress >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
              />
            </div>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className={`text-center p-2 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Min</div>
            <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.min.toFixed(1)}
            </div>
          </div>
          <div className={`text-center p-2 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Avg</div>
            <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.avg.toFixed(1)}
            </div>
          </div>
          <div className={`text-center p-2 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
            <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Max</div>
            <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {stats.max.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 pt-4 border-t border-emerald-200/20"
            >
              <div className="space-y-3">
                {optimalRange && (
                  <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-50'}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Leaf className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                        Optimal Range
                      </span>
                    </div>
                    <p className={`text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {optimalRange.min} - {optimalRange.max} {unit}
                    </p>
                  </div>
                )}
                
                <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className={`w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-800'}`}>
                      Recent Activity
                    </span>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Range: {(stats.max - stats.min).toFixed(1)} {unit}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative Elements */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className={`absolute -top-2 -right-2 w-8 h-8 rounded-full ${isDarkMode ? 'bg-emerald-400/10' : 'bg-emerald-500/10'} blur-sm`}
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
        className={`absolute -bottom-1 -left-1 w-6 h-6 rounded-full ${isDarkMode ? 'bg-emerald-400/5' : 'bg-emerald-500/5'} blur-sm`}
      />
    </motion.div>
  );
};

export default ModernSensorCard;