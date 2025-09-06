import React, { useState, useMemo } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { Timer, Droplets, Thermometer, Gauge, ChevronDown, ChevronRight, Leaf, Search, Download, ArrowUp, ArrowDown, Filter, Sun as SunIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

interface Session {
    startTime: Date;
    endTime: Date;
    avgTemp: number;
    avgHumidity: number;
    avgSoilMoisture6cm: number;
    avgSoilMoisture15cm: number;
    avgLightIntensity?: number;
    irrigation: boolean;
}

interface DailySession {
    date: Date;
    sessions: Session[];
    avgTemp: number;
    avgHumidity: number;
    avgSoilMoisture6cm: number;
    avgSoilMoisture15cm: number;
    avgLightIntensity: number;
    hasIrrigation: boolean;
    duration: number;
}

interface SessionHistoryProps {
    sessions: Session[];
    isDarkMode: boolean;
    crop?: string;
    stage?: string;
}

function splitSessionByDate(session: Session): Session[] {
    const sessions = [];
    let currentStart = new Date(session.startTime);
    const end = new Date(session.endTime);

    while (currentStart < end) {
        const nextMidnight = new Date(currentStart);
        nextMidnight.setHours(24, 0, 0, 0);

        const sessionEnd = nextMidnight > end ? end : nextMidnight;
        sessions.push({
            ...session,
            startTime: new Date(currentStart),
            endTime: new Date(sessionEnd),
        });

        currentStart = sessionEnd;
    }

    return sessions;
}

const calculateTrend = (current: number, previous: number): 'up' | 'down' | 'stable' => {
    const diff = current - previous;
    return diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable';
};

export const SessionHistory: React.FC<SessionHistoryProps> = ({ sessions, isDarkMode, crop = 'Unknown', stage = 'Unknown' }) => {
    const [expandedDay, setExpandedDay] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortBy, setSortBy] = useState<'date' | 'temp' | 'humidity' | 'soil6cm' | 'soil15cm' | 'light' | 'duration'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterIrrigation, setFilterIrrigation] = useState<'all' | 'yes' | 'no'>('all');

    const dailySessions = useMemo(() => {
        const adjustedSessions = sessions.flatMap(splitSessionByDate);

        const sessionsByDay = adjustedSessions.reduce((acc: { [key: string]: Session[] }, session) => {
            const midnight = new Date(session.startTime);
            midnight.setHours(0, 0, 0, 0);
            const dayKey = midnight.toISOString();

            if (!acc[dayKey]) acc[dayKey] = [];
            acc[dayKey].push(session);
            return acc;
        }, {});

        return Object.entries(sessionsByDay).map(([day, daySessions]): DailySession => {
            const totalSessions = daySessions.length;
            const duration = daySessions.reduce((sum, s) => sum + differenceInMinutes(s.endTime, s.startTime), 0);
            return {
                date: new Date(day),
                sessions: daySessions,
                avgTemp: daySessions.reduce((sum, s) => sum + s.avgTemp, 0) / totalSessions,
                avgHumidity: daySessions.reduce((sum, s) => sum + s.avgHumidity, 0) / totalSessions,
                avgSoilMoisture6cm: daySessions.reduce((sum, s) => sum + s.avgSoilMoisture6cm, 0) / totalSessions,
                avgSoilMoisture15cm: daySessions.reduce((sum, s) => sum + s.avgSoilMoisture15cm, 0) / totalSessions,
                avgLightIntensity: daySessions.reduce((sum, s) => sum + (s.avgLightIntensity || 0), 0) / totalSessions,
                hasIrrigation: daySessions.some(s => s.irrigation),
                duration,
            };
        });
    }, [sessions]);

    const filteredAndSortedSessions = useMemo(() => {
        let result = [...dailySessions];

        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            result = result.filter(daySession => {
                const formattedDate = format(daySession.date, 'MMMM d, yyyy').toLowerCase();
                return (
                    formattedDate.includes(searchLower) ||
                    daySession.sessions.some(session =>
                        [
                            session.avgTemp.toFixed(1),
                            session.avgHumidity.toFixed(1),
                            session.avgSoilMoisture6cm.toFixed(1),
                            session.avgSoilMoisture15cm.toFixed(1),
                            session.avgLightIntensity?.toFixed(0) || '',
                            session.irrigation ? 'irrigation' : '',
                        ].join(' ').toLowerCase().includes(searchLower)
                    )
                );
            });
        }

        if (filterIrrigation !== 'all') {
            result = result.filter(daySession => daySession.hasIrrigation === (filterIrrigation === 'yes'));
        }

        result.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'date': comparison = a.date.getTime() - b.date.getTime(); break;
                case 'temp': comparison = a.avgTemp - b.avgTemp; break;
                case 'humidity': comparison = a.avgHumidity - b.avgHumidity; break;
                case 'soil6cm': comparison = a.avgSoilMoisture6cm - b.avgSoilMoisture6cm; break;
                case 'soil15cm': comparison = a.avgSoilMoisture15cm - b.avgSoilMoisture15cm; break;
                case 'light': comparison = a.avgLightIntensity - b.avgLightIntensity; break;
                case 'duration': comparison = a.duration - b.duration; break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [dailySessions, searchQuery, sortBy, sortOrder, filterIrrigation]);

    const toggleSort = (key: 'date' | 'temp' | 'humidity' | 'soil6cm' | 'soil15cm' | 'light' | 'duration') => {
        if (sortBy === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('desc');
        }
    };

    const downloadDailyData = () => {
        const data = filteredAndSortedSessions.map(day => ({
            Date: format(day.date, 'yyyy-MM-dd'),
            'Avg Temperature (°C)': day.avgTemp.toFixed(1),
            'Avg Humidity (%)': day.avgHumidity.toFixed(1),
            'Avg Soil Moisture 6cm (cb)': day.avgSoilMoisture6cm.toFixed(1),
            'Avg Soil Moisture 15cm (cb)': day.avgSoilMoisture15cm.toFixed(1),
            'Avg Light Intensity (lux)': day.avgLightIntensity.toFixed(0),
            'Has Irrigation': day.hasIrrigation ? 'Yes' : 'No',
            'Total Duration (min)': day.duration,
            'Session Count': day.sessions.length,
            Crop: crop,
            Stage: stage,
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DailySessions");
        XLSX.writeFile(wb, `SessionHistory_${crop}_${stage}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    };

    return (
        <div className={`space-y-4 ${isDarkMode ? 'bg-gray-800/80' : 'bg-white/80'} backdrop-blur-none rounded-2xl p-4 sm:p-6 shadow-xl transition-all duration-500`}>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row gap-4 items-center justify-between"
            >
                <div className="relative w-full sm:w-1/3">
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} w-5 h-5 animate-[pulse_2s_infinite]`} />
                    <input
                        type="text"
                        placeholder="Search your plant’s story..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 border rounded-full focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm ${isDarkMode ? 'bg-gray-700 border-emerald-700 text-gray-200 placeholder-emerald-400/50' : 'bg-emerald-100 border-emerald-200 text-gray-900 placeholder-emerald-600/50'} shadow-md transition-all duration-300 hover:shadow-lg`}
                    />
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                    <motion.select
                        whileHover={{ scale: 1.05 }}
                        value={filterIrrigation}
                        onChange={(e) => setFilterIrrigation(e.target.value as 'all' | 'yes' | 'no')}
                        className={`p-2 rounded-full text-sm ${isDarkMode ? 'bg-gray-700 text-emerald-400 border-emerald-700' : 'bg-emerald-100 text-emerald-600 border-emerald-200'} border shadow-md transition-all duration-300`}
                    >
                        <option value="all">All Sessions</option>
                        <option value="yes">With Water</option>
                        <option value="no">Dry Days</option>
                    </motion.select>
                    <motion.button
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={downloadDailyData}
                        className={`p-2 rounded-full shadow-md flex items-center gap-1 text-sm ${isDarkMode ? 'bg-emerald-900/80 text-emerald-400 hover:bg-emerald-800' : 'bg-emerald-200/80 text-emerald-600 hover:bg-emerald-300'} transition-all duration-300`}
                    >
                        <Download className="w-4 h-4 animate-[bounce_2s_infinite]" /> Save
                    </motion.button>
                </div>
            </motion.div>

            {sessions.length === 0 ? (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`text-center py-12 ${isDarkMode ? 'bg-gray-900/50' : 'bg-emerald-50/50'} rounded-2xl border-2 border-dashed ${isDarkMode ? 'border-emerald-800' : 'border-emerald-200'} shadow-md transition-colors duration-300`}
                >
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <Leaf className={`w-12 h-12 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} mx-auto mb-4 animate-bounce`} />
                    </motion.div>
                    <p className={`font-medium text-lg ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>No plant adventures yet!</p>
                    <p className={`text-sm mt-2 ${isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'}`}>Let’s grow some memories for {crop}!</p>
                </motion.div>
            ) : filteredAndSortedSessions.length === 0 ? (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`text-center py-12 ${isDarkMode ? 'bg-gray-900/50' : 'bg-emerald-50/50'} rounded-2xl border-2 border-dashed ${isDarkMode ? 'border-emerald-800' : 'border-emerald-200'} shadow-md transition-colors duration-300`}
                >
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <Leaf className={`w-12 h-12 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} mx-auto mb-4`} />
                    </motion.div>
                    <p className={`font-medium text-lg ${isDarkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>Oops, no matches!</p>
                    <p className={`text-sm mt-2 ${isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'}`}>Try a new search or filter!</p>
                </motion.div>
            ) : (
                <div className="space-y-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`grid grid-cols-3 sm:grid-cols-7 gap-2 text-xs font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} p-2 rounded-full ${isDarkMode ? 'bg-gray-800/50' : 'bg-emerald-100/50'} shadow-md`}
                    >
                        {['date', 'temp', 'humidity', 'soil6cm', 'soil15cm', 'light', 'duration'].map(key => (
                            <motion.button
                                key={key}
                                whileHover={{ scale: 1.1, color: isDarkMode ? '#34d399' : '#059669' }}
                                onClick={() => toggleSort(key as any)}
                                className="flex items-center gap-1 justify-center"
                            >
                                {key === 'date' ? 'Date' : key === 'temp' ? 'Temp' : key === 'humidity' ? 'Humid' : key === 'soil6cm' ? 'Soil 6' : key === 'soil15cm' ? 'Soil 15' : key === 'light' ? 'Light' : 'Time'}
                                {sortBy === key && (sortOrder === 'asc' ? <ArrowUp className="w-3 h-3 animate-bounce" /> : <ArrowDown className="w-3 h-3 animate-bounce" />)}
                            </motion.button>
                        ))}
                    </motion.div>

                    {filteredAndSortedSessions.map((daySession) => {
                        const prevDay = filteredAndSortedSessions.find(d => d.date < daySession.date);
                        return (
                            <motion.div
                                key={daySession.date.toISOString()}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className={`border rounded-2xl overflow-hidden ${isDarkMode ? 'border-emerald-800 bg-gray-800/80 hover:shadow-xl hover:shadow-emerald-900/30' : 'border-emerald-200 bg-white/80 hover:shadow-xl hover:shadow-emerald-300/30'} transition-all duration-300`}
                            >
                                <button
                                    onClick={() => setExpandedDay(curr => curr === daySession.date.toISOString() ? null : daySession.date.toISOString())}
                                    className={`w-full text-left p-4 focus:outline-none focus:ring-2 ${isDarkMode ? 'focus:ring-emerald-600' : 'focus:ring-emerald-300'} rounded-2xl`}
                                >
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <motion.div
                                                animate={{ rotate: expandedDay === daySession.date.toISOString() ? 180 : 0 }}
                                                transition={{ duration: 0.3 }}
                                            >
                                                {expandedDay === daySession.date.toISOString() ? (
                                                    <ChevronDown className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                                ) : (
                                                    <ChevronRight className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                                )}
                                            </motion.div>
                                            <motion.div
                                                whileHover={{ scale: 1.1 }}
                                                className="flex items-center gap-2"
                                            >
                                                <Leaf className={`w-5 h-5 ${isDarkMode ? 'text-emerald-400 animate-[spin_3s_linear_infinite]' : 'text-emerald-600 animate-[spin_3s_linear_infinite]'}`} />
                                                <span className={`font-semibold text-sm sm:text-base ${isDarkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>
                                                    {format(daySession.date, 'MMMM d, yyyy')}
                                                </span>
                                            </motion.div>
                                            <span className={`text-xs sm:text-sm ${isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>
                                                ({daySession.sessions.length} 🌱, {daySession.duration} min)
                                            </span>
                                        </div>
                                        {daySession.hasIrrigation && (
                                            <motion.div
                                                whileHover={{ scale: 1.1, rotate: 10 }}
                                                className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium flex items-center gap-1 ${isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'} shadow-md`}
                                            >
                                                <Droplets className="w-4 h-4 animate-[drip_1s_infinite]" /> Watered!
                                            </motion.div>
                                        )}
                                    </div>
                                    <motion.div
                                        className="grid grid-cols-2 sm:grid-cols-6 gap-2 sm:gap-4 mt-4 text-xs sm:text-sm"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        {[
                                            { icon: Thermometer, color: 'orange', label: 'Temp', value: daySession.avgTemp, unit: '°C', prev: prevDay?.avgTemp },
                                            { icon: Droplets, color: 'blue', label: 'Humid', value: daySession.avgHumidity, unit: '%', prev: prevDay?.avgHumidity },
                                            { icon: Gauge, color: 'green', label: 'Soil 6', value: daySession.avgSoilMoisture6cm, unit: 'cb', prev: prevDay?.avgSoilMoisture6cm },
                                            { icon: Gauge, color: 'emerald', label: 'Soil 15', value: daySession.avgSoilMoisture15cm, unit: 'cb', prev: prevDay?.avgSoilMoisture15cm },
                                            { icon: SunIcon, color: 'yellow', label: 'Light', value: daySession.avgLightIntensity, unit: 'lux', prev: prevDay?.avgLightIntensity },
                                            { icon: Timer, color: 'gray', label: 'Time', value: daySession.duration, unit: 'min', prev: null },
                                        ].map((item, idx) => (
                                            <motion.div
                                                key={idx}
                                                whileHover={{ scale: 1.05 }}
                                                className={`flex items-center gap-2 p-2 rounded-lg ${isDarkMode ? `bg-${item.color}-900/20` : `bg-${item.color}-50`}`}
                                            >
                                                <item.icon className={`w-4 h-4 ${isDarkMode ? `text-${item.color}-400` : `text-${item.color}-500`} animate-[pulse_2s_infinite]`} />
                                                <div>
                                                    <div className={isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600/70'}>{item.label}</div>
                                                    <div className={`font-semibold flex items-center gap-1 ${isDarkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>
                                                        {item.value.toFixed(item.unit === 'min' ? 0 : 1)} {item.unit}
                                                        {item.prev && calculateTrend(item.value, item.prev) !== 'stable' && (
                                                            calculateTrend(item.value, item.prev) === 'up' ? (
                                                                <ArrowUp className="w-3 h-3 text-green-500 animate-bounce" />
                                                            ) : (
                                                                <ArrowDown className="w-3 h-3 text-red-500 animate-bounce" />
                                                            )
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </motion.div>
                                </button>

                                <AnimatePresence>
                                    {expandedDay === daySession.date.toISOString() && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.5, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                        >
                                            <div className={`border-t p-4 space-y-3 ${isDarkMode ? 'border-emerald-800 bg-emerald-950/30' : 'border-emerald-100 bg-emerald-50/30'}`}>
                                                {daySession.sessions.map((session, idx) => (
                                                    <motion.div
                                                        key={session.startTime.getTime()}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: idx * 0.1 }}
                                                        className={`p-3 rounded-lg border shadow-md ${isDarkMode ? 'bg-gray-800/90 border-emerald-800' : 'bg-white border-emerald-200'} hover:shadow-lg transition-all duration-300`}
                                                    >
                                                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <Timer className={`w-4 h-4 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} animate-[spin_5s_linear_infinite]`} />
                                                                <span className={`text-xs sm:text-sm ${isDarkMode ? 'text-emerald-400/80' : 'text-emerald-600/80'}`}>
                                                                    {format(session.startTime, 'p')} - {format(session.endTime, 'p')} ({differenceInMinutes(session.endTime, session.startTime)} min)
                                                                </span>
                                                            </div>
                                                            {session.irrigation && (
                                                                <motion.div
                                                                    whileHover={{ scale: 1.1 }}
                                                                    className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'} shadow-md`}
                                                                >
                                                                    <Droplets className="w-4 h-4 animate-[drip_1s_infinite]" /> Watered!
                                                                </motion.div>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-xs sm:text-sm">
                                                            <div>
                                                                <span className={isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600/70'}>Temp:</span>
                                                                <span className={`ml-1 font-medium ${isDarkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>{session.avgTemp.toFixed(1)}°C</span>
                                                            </div>
                                                            <div>
                                                                <span className={isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600/70'}>Humid:</span>
                                                                <span className={`ml-1 font-medium ${isDarkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>{session.avgHumidity.toFixed(1)}%</span>
                                                            </div>
                                                            <div>
                                                                <span className={isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600/70'}>Soil 6:</span>
                                                                <span className={`ml-1 font-medium ${isDarkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>{session.avgSoilMoisture6cm.toFixed(1)} cb</span>
                                                            </div>
                                                            <div>
                                                                <span className={isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600/70'}>Soil 15:</span>
                                                                <span className={`ml-1 font-medium ${isDarkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>{session.avgSoilMoisture15cm.toFixed(1)} cb</span>
                                                            </div>
                                                            <div>
                                                                <span className={isDarkMode ? 'text-emerald-400/70' : 'text-emerald-600/70'}>Light:</span>
                                                                <span className={`ml-1 font-medium ${isDarkMode ? 'text-emerald-200' : 'text-emerald-900'}`}>{session.avgLightIntensity?.toFixed(0) || '--'} lux</span>
                                                            </div>
                                                        </div>
                                                        <motion.div
                                                            className={`mt-2 text-xs ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} flex items-center gap-1`}
                                                            whileHover={{ scale: 1.05 }}
                                                        >
                                                            <Sparkles className="w-4 h-4 animate-[spin_3s_linear_infinite]" />
                                                            Insight: {session.avgSoilMoisture6cm > 50 ? `Happy ${crop}!` : `Thirsty ${crop}!`}
                                                        </motion.div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })}
                </div>
            )}
            <style jsx>{`
                @keyframes drip { 0% { transform: translateY(0); } 50% { transform: translateY(4px); } 100% { transform: translateY(0); } }
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};