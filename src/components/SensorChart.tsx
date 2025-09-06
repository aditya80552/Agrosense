import React from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    TimeScale
);

interface DataPoint {
    timestamp: number;
    value: number;
}

interface SensorChartProps {
    data: DataPoint[];
    label: string;
    color: string;
    isDarkMode: boolean;
    showAnomalies?: boolean;
    onPointClick?: (timestamp: number) => void;
}

const chartVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

export const SensorChart: React.FC<SensorChartProps> = ({ data, label, color, isDarkMode, showAnomalies, onPointClick }) => {
    const chartData = {
        datasets: [
            {
                label,
                data: data.map(point => ({
                    x: point.timestamp,
                    y: point.value,
                })),
                borderColor: color,
                backgroundColor: `${color}33`,
                fill: {
                    target: 'origin',
                    above: `${color}22`,
                },
                tension: 0.4,
                pointRadius: showAnomalies ? (d => Math.abs(d.raw.y - data.reduce((a, b) => a + b.value, 0) / data.length) > 10 ? 6 : 3) : 3,
                pointHoverRadius: 8,
                pointBackgroundColor: showAnomalies ? (d => Math.abs(d.raw.y - data.reduce((a, b) => a + b.value, 0) / data.length) > 10 ? '#ef4444' : color) : color,
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
        animation: {
            duration: 1200,
            easing: 'easeOutCubic' as const,
        },
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    font: { size: 14, weight: '600' as const },
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle',
                },
            },
            tooltip: {
                backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                titleColor: isDarkMode ? '#fff' : '#111827',
                bodyColor: isDarkMode ? '#d1d5db' : '#374151',
                borderColor: color,
                borderWidth: 1,
                cornerRadius: 8,
                padding: 12,
                callbacks: {
                    title: (context: any) => format(new Date(context[0].parsed.x), 'PPp'),
                    label: (context: any) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`,
                },
            },
            title: {
                display: true,
                text: `${label} Over Time`,
                color: isDarkMode ? '#e5e7eb' : '#1f2937',
                font: { size: 18, weight: 'bold' as const },
                padding: { top: 0, bottom: 20 },
            },
        },
        scales: {
            x: {
                type: 'time' as const,
                time: {
                    unit: 'hour' as const,
                    displayFormats: { hour: 'MMM d, HH:mm' },
                    tooltipFormat: 'PPp',
                },
                title: {
                    display: true,
                    text: 'Time',
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    font: { size: 14, weight: '600' as const },
                },
                grid: {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    maxTicksLimit: 10,
                    font: { size: 12 },
                },
            },
            y: {
                title: {
                    display: true,
                    text: label,
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    font: { size: 14, weight: '600' as const },
                },
                beginAtZero: true,
                grid: {
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                },
                ticks: {
                    color: isDarkMode ? '#d1d5db' : '#374151',
                    font: { size: 12 },
                    padding: 10,
                },
            },
        },
        onClick: (event: any, elements: any) => {
            if (elements.length > 0 && onPointClick) {
                const timestamp = elements[0].element.$context.raw.x;
                onPointClick(timestamp);
            }
        },
    };

    return (
        <motion.div variants={chartVariants} initial="hidden" animate="visible" className="relative p-4 sm:p-6 rounded-2xl shadow-xl transition-all duration-500 overflow-hidden" style={{ height: '400px' }}>
            <div className={`absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/leaf.png')] animate-[move_20s_linear_infinite] ${isDarkMode ? 'bg-emerald-900/20' : 'bg-emerald-100/20'}`} />
            <div className="relative z-10 h-full">
                <Line data={chartData} options={options} />
            </div>
            <style jsx>{`
                @keyframes move { 0% { background-position: 0 0; } 100% { background-position: 60px 60px; } }
            `}</style>
        </motion.div>
    );
};