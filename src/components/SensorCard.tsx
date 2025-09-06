import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Thermometer, Droplets, Gauge, Sun as SunIcon, Sparkles, TrendingUp, TrendingDown, AlertTriangle, Leaf, Heart } from 'lucide-react';

interface SensorCardProps {
    title: string;
    value: number | null | undefined;
    unit: string;
    icon: 'temperature' | 'humidity' | 'moisture' | 'light';
    color: string;
    isDarkMode: boolean;
    stats: { min: number; max: number; avg: number };
    optimalRange?: { min: number; max: number }; // Optimal range for alerts
}

const icons = {
    temperature: Thermometer,
    humidity: Droplets,
    moisture: Gauge,
    light: SunIcon,
};

const cardVariants = {
    initial: { scale: 0.8, opacity: 0, y: 20 },
    animate: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 250, damping: 15 } },
    hover: { 
        scale: 1.05, 
        boxShadow: "0 15px 30px rgba(0, 0, 0, 0.25)", 
        transition: { type: "spring", stiffness: 300 } 
    },
    tap: { scale: 0.97 }
};

const SensorCard: React.FC<SensorCardProps> = ({ title, value, unit, icon, color, isDarkMode, stats, optimalRange }) => {
    const Icon = icons[icon] || Thermometer;
    const [showAlert, setShowAlert] = useState(false);

    // Calculate progress within optimal range (if provided)
    const progress = optimalRange && value !== undefined && value !== null 
        ? Math.min(100, Math.max(0, ((value - optimalRange.min) / (optimalRange.max - optimalRange.min)) * 100))
        : 0;

    // Determine trend (mock calculation, can be enhanced with real data)
    const trend = value && stats.avg ? (value > stats.avg ? 'up' : value < stats.avg ? 'down' : 'stable') : 'stable';

    // Check if value is out of optimal range
    const isOutOfRange = optimalRange && value !== undefined && value !== null 
        ? (value < optimalRange.min || value > optimalRange.max)
        : false;

    return (
        <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
            whileTap="tap"
            className={`relative p-4 sm:p-6 rounded-3xl shadow-lg overflow-hidden transition-all duration-500`}
            style={{
                background: isDarkMode 
                    ? `linear-gradient(135deg, #1f2937, ${color.split(' ')[0]}80)` 
                    : `linear-gradient(135deg, #f0fdf4, ${color.split(' ')[0]}60)`,
                color: isDarkMode ? '#e5e7eb' : '#1f2937', // Consistent text color for readability
            }}
        >
            {/* Background Effects */}
            <motion.div
                className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/leaf.png')] animate-[move_12s_linear_infinite]"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 6, repeat: Infinity }}
            />
            <div className={`absolute inset-0 ${isDarkMode ? 'bg-white/5' : 'bg-white/15'} backdrop-blur-sm transition-colors duration-300`} />

            {/* Sparkles and Heart Animation (Cute Touch) */}
            <motion.div
                className="absolute top-2 right-2"
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
                <Sparkles className="w-5 h-5 text-yellow-300" />
            </motion.div>
            <motion.div
                className="absolute bottom-2 left-2"
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
                <Heart className="w-5 h-5 text-pink-300 opacity-50" />
            </motion.div>

            {/* Content */}
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-3 w-full">
                    {/* Title with Cute Leaf */}
                    <motion.p
                        className="text-sm font-semibold tracking-wide opacity-90 flex items-center gap-2"
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 0.9 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Leaf className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} animate-[wiggle_2s_infinite]`} /> 
                        {title}
                    </motion.p>

                    {/* Value Display */}
                    <motion.h3
                        className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-2"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    >
                        {value !== undefined && value !== null ? (
                            <motion.span
                                key={value}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.5, type: "spring" }}
                                className="flex items-center gap-1"
                            >
                                {value.toFixed(1)}
                                <motion.span
                                    animate={{ scale: [1, 1.15, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                    className="text-lg sm:text-xl ml-1"
                                >
                                    {unit}
                                </motion.span>
                            </motion.span>
                        ) : (
                            <motion.span
                                animate={{ rotate: [0, 15, -15, 0] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                                className="text-3xl"
                            >
                                🌱
                            </motion.span>
                        )}
                        {/* Trend Indicator */}
                        {value && (
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 1, repeat: Infinity }}
                            >
                                {trend === 'up' ? (
                                    <TrendingUp className={`w-5 h-5 ${isDarkMode ? 'text-green-300' : 'text-green-500'}`} />
                                ) : trend === 'down' ? (
                                    <TrendingDown className={`w-5 h-5 ${isDarkMode ? 'text-red-300' : 'text-red-500'}`} />
                                ) : (
                                    <Sparkles className={`w-5 h-5 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-500'} animate-[spin_3s_linear_infinite]`} />
                                )}
                            </motion.div>
                        )}
                    </motion.h3>

                    {/* Stats with Progress Bar and Cute Icons */}
                    <motion.div
                        className="text-sm opacity-85 space-y-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        <p className="flex items-center gap-1"><Leaf className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} animate-[wiggle_2s_infinite]`} /> Min: {stats.min.toFixed(1)} {unit}</p>
                        <p className="flex items-center gap-1"><Leaf className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} animate-[wiggle_2s_infinite]`} /> Max: {stats.max.toFixed(1)} {unit}</p>
                        <p className="flex items-center gap-1"><Leaf className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} animate-[wiggle_2s_infinite]`} /> Avg: {stats.avg.toFixed(1)} {unit}</p>
                        {optimalRange && value !== undefined && value !== null && (
                            <div className="mt-2">
                                <div className="text-sm flex justify-between mb-1">
                                    <span>Optimal Progress <Heart className={`w-4 h-4 ${isDarkMode ? 'text-pink-300' : 'text-pink-500'} animate-[pulse_2s_infinite]`} /></span>
                                    <span>{progress.toFixed(0)}%</span>
                                </div>
                                <div className={`w-full h-2 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                    <motion.div
                                        className="h-full rounded-full bg-emerald-400"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                    />
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>

                {/* Icon with Animation */}
                <motion.div
                    className={`${isDarkMode ? 'bg-white/25' : 'bg-white/40'} p-3 rounded-full shadow-inner`}
                    whileHover={{ scale: 1.25, rotate: 360 }}
                    transition={{ type: "spring", stiffness: 400 }}
                >
                    <Icon
                        size={40}
                        className={`${
                            icon === 'moisture' ? 'animate-[pulse_2s_ease-in-out_infinite]' :
                            icon === 'humidity' ? 'animate-[drip_1.5s_ease-in-out_infinite]' :
                            icon === 'temperature' ? 'animate-[wiggle_2s_infinite]' :
                            'animate-[spin_5s_linear_infinite]'
                        } drop-shadow-md`}
                    />
                </motion.div>
            </div>

            {/* Status Indicator with Cute Effect */}
            <motion.div
                className={`absolute bottom-2 right-2 h-3 w-3 rounded-full ${value !== undefined && value !== null ? 'bg-emerald-400' : 'bg-gray-400/50'} shadow-lg`}
                animate={{
                    scale: value !== undefined && value !== null ? [1, 1.4, 1] : [1, 1.2, 1],
                    opacity: value !== undefined && value !== null ? 1 : 0.5,
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
                {isOutOfRange && (
                    <motion.div
                        className="absolute -top-4 -right-4"
                        animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                    >
                        <AlertTriangle className={`w-4 h-4 ${isDarkMode ? 'text-red-300' : 'text-red-500'}`} />
                    </motion.div>
                )}
            </motion.div>

            {/* Alert Toggle Button */}
            {optimalRange && (
                <motion.button
                    className={`absolute top-2 left-2 p-1 rounded-full ${showAlert ? 'bg-red-500' : isDarkMode ? 'bg-gray-700' : 'bg-emerald-200'} shadow-md`}
                    whileHover={{ scale: 1.1 }}
                    onClick={() => setShowAlert(!showAlert)}
                >
                    <AlertTriangle className={`w-4 h-4 ${showAlert ? 'text-white' : isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                </motion.button>
            )}

            {/* Alert Message */}
            <AnimatePresence>
                {showAlert && isOutOfRange && value !== undefined && value !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className={`absolute top-10 left-2 p-2 rounded-lg ${isDarkMode ? 'bg-red-900/80 text-red-200' : 'bg-red-100 text-red-700'} text-sm shadow-lg`}
                    >
                        <p>{value < optimalRange.min ? 'Too low! 😢' : 'Too high! 😯'}</p>
                        <p>Optimal: {optimalRange.min}-{optimalRange.max} {unit} <Heart className={`w-4 h-4 ${isDarkMode ? 'text-pink-300' : 'text-pink-500'} animate-[pulse_2s_infinite]`} /></p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Custom CSS */}
            <style jsx>{`
                @keyframes move { 0% { background-position: 0 0; } 100% { background-position: 60px 60px; } }
                @keyframes drip { 0% { transform: translateY(0); } 50% { transform: translateY(6px); } 100% { transform: translateY(0); } }
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes wiggle { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
            `}</style>
        </motion.div>
    );
};

export default SensorCard;