import React, { useEffect, useState, useMemo, useRef, forwardRef, createContext, useContext } from 'react';
import { db } from './firebase';
import { ref, onValue, set } from 'firebase/database';

import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import {
    Sprout, Droplets, Wheat, Sun, Moon, History, Download, AlertTriangle, Cpu, BarChart3,
    Pencil, X, Menu, Plus, Trash, Thermometer, Cloud, Zap, Leaf, Wifi, LayoutGrid,
    HardDrive, Activity, Power, ChevronsUpDown, Check, SlidersHorizontal, BookOpen, Calendar as CalendarIcon, FileText, FileSpreadsheet, Target, Edit, Save,
    CheckCircle, XCircle, Globe, Users, Camera, Sparkles, Settings, Bell, Heart, Star, Award,
    Lightbulb, Scale, Compass, GitCommit, Waves, LocateFixed, Smile, Frown, Meh, Wind // New icons for light, weight, GPS, tilt, etc.
} from 'lucide-react';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Dot } from 'recharts';
import DatePicker from 'react-datepicker';
"react-datepicker/dist/react-datepicker.css";
import { format, formatDistanceToNow, fromUnixTime, startOfDay, endOfDay, isValid } from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid'; // For creating unique IDs for new profiles

// Add new interfaces for enhanced features
interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    unlocked: boolean;
    progress: number;
    maxProgress: number;
}

interface PlantMood {
    mood: 'happy' | 'neutral' | 'sad' | 'excited';
    message: string;
    icon: React.ElementType;
}

// SECTION: TRANSLATIONS & CONTEXT
const translations = {
    en: { dashboard: "Dashboard", live_status: "Live Status", historical_analysis: "Historical Analysis", connecting: "Connecting...", awaiting_signal: "Awaiting Signal", no_data: "No Data Found", device_selection: "Device Selection", select_master: "Select Master...", select_slave: "Select Slave...", fleet_overview: "Fleet Overview", crop_profile: "Crop Profile", manage_profiles: "Manage Profiles", tools: "Tools & Actions", scan_plant: "Scan Plant Health", light_mode: "Light Mode", dark_mode: "Dark Mode", live: "Live", irrigation_on: "Irrigation ON", irrigation_off: "Irrigation OFF", export_excel: "Export to Excel", export_pdf: "Export to PDF", temperature: "Temperature", humidity: "Humidity", soil_moisture_6cm: "Soil Moisture (6cm)", soil_moisture_15cm: "Soil Moisture (15cm)", signal_strength: "Signal Strength", light_intensity: "Light Intensity", weight: "Weight", tilt_angle: "Tilt Angle", latitude: "Latitude", longitude: "Longitude", altitude: "Altitude", gps_accuracy: "GPS Accuracy", acceleration: "Acceleration", gyroscope: "Gyroscope", avg: "Avg", ideal: "Ideal", low: "Low", high: "High", ai_advisor: "AI Crop Advisor", health_score: "Health Score", irrigation_history: "Irrigation History", event_log_notes: "Event Log & Notes", save: "Save", cancel: "Cancel", add_new: "Add New", edit: "Edit", delete: "Delete", scan: "Analyze Plant" },
    hi: { dashboard: "डैशबोर्ड", live_status: "लाइव स्थिति", historical_analysis: "ऐतिहासिक विश्लेषण", connecting: "कनेक्ट हो रहा है...", awaiting_signal: "सिग्नल की प्रतीक्षा है", no_data: "कोई डेटा नहीं मिला", device_selection: "डिवाइस चयन", select_master: "मास्टर चुनें...", select_slave: "स्लेव चुनें...", fleet_overview: "सभी डिवाइस", crop_profile: "फ़सल प्रोफ़ाइल", manage_profiles: "प्रोफाइल प्रबंधित करें", tools: "उपकरण और क्रियाएं", scan_plant: "पौधे का स्वास्थ्य स्कैन करें", light_mode: "लाइट मोड", dark_mode: "डार्क मोड", live: "लाइव", irrigation_on: "सिंचाई चालू", irrigation_off: "सिंचाई बंद", export_excel: "एक्सेल में निर्यात करें", export_pdf: "पीडीएफ में निर्यात करें", temperature: "तापमान", humidity: "नमी", soil_moisture_6cm: "मिट्टी की नमी (6सेमी)", soil_moisture_15cm: "मिट्टी की नमी (15सेमी)", signal_strength: "सिग्नल शक्ति", light_intensity: "प्रकाश की तीव्रता", weight: "वजन", tilt_angle: "झुकाव कोण", latitude: "अक्षांश", longitude: "देशांतर", altitude: "ऊंचाई", gps_accuracy: "जीपीएस सटीकता", acceleration: "त्वरण", gyroscope: "जाइरोस्कोप", avg: "औसत", ideal: "आदर्श", low: "कम", high: "अधिक", ai_advisor: "AI फसल सलाहकार", health_score: "स्वास्थ्य स्कोर", irrigation_history: "सिंचाई इतिहास", event_log_notes: "इवेंट लॉग और नोट्स", save: "सहेजें", cancel: "रद्द करें", add_new: "नया जोड़ें", edit: "संपादित करें", delete: "हटाएं", scan: "विश्लेषण करें" },
};
type Language = 'en' | 'hi';
const LanguageContext = createContext((key: string) => key);
const useTranslation = () => useContext(LanguageContext);

// SECTION: INTERFACES (UPDATED)
// Generic SensorData interface that can hold any number of key-value pairs
interface SensorData {
    [key: string]: number | boolean;
}
interface DataPoint extends SensorData { timestamp: number; }

// Raw data from Firebase is now just a collection of epoch-keyed sensor data under the slave
interface DeviceRawData {
    [epoch: string]: SensorData;
}

interface Stats { min: number; max: number; avg: number; current: number; }
// DeviceStats will now have dynamic keys based on what's received
interface DeviceStats {
    [sensorKey: string]: Stats;
}
interface AnomalyData { [key: string]: number[]; }
interface ProcessedDeviceData { fullData: DataPoint[]; current: DataPoint | null; stats: DeviceStats; anomalyData: AnomalyData; }
interface OverviewDeviceData { mac: string; latest: DataPoint | null; }
interface CropProfile {
    id: string;
    name: string;
    temperature: { min: number; max: number };
    humidity: { min: number; max: number };
    moisture6cm: { min: number; max: number }; // Renamed from soilMoisture6cm
    moisture15cm: { min: number; max: number }; // Renamed from soilMoisture15cm
    lightIntensity: { min: number; max: number };
}
interface IrrigationSession { startTime: number; endTime: number; duration: number; startMoisture: number; endMoisture: number; moistureChange: number; avgTemp: number; }
interface Note { id: string; timestamp: number; content: string; }

// SECTION: CUSTOM HOOK
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try { const item = window.localStorage.getItem(key); return item ? JSON.parse(item) : initialValue; }
        catch (error) { console.error(error); return initialValue; }
    });
    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) { console.error(error); }
    };
    return [storedValue, setValue];
};

// SECTION: HELPER COMPONENTS & STYLES
const inputStyles = (isDarkMode: boolean, hasError = false) => clsx('w-full p-2 text-sm rounded-lg border bg-white dark:bg-slate-800 focus:ring-2 outline-none transition-all', isDarkMode ? 'border-slate-700 placeholder-slate-500' : 'border-slate-300 placeholder-slate-400', hasError ? 'border-red-500 ring-red-500/50' : 'focus:ring-emerald-500 border-slate-300 dark:border-slate-700');
const SidebarSection: React.FC<{ title: string, icon: React.ElementType, children: React.ReactNode }> = ({ title, icon: Icon, children }) => (<div className="space-y-3"><h2 className='text-sm font-semibold text-slate-400 flex items-center gap-2 tracking-wider'><Icon size={14} /> {title.toUpperCase()}</h2>{children}</div>);
const parseDeviceString = (deviceString: string) => { const match = deviceString.match(/\((.*?)\)/); return match ? match[1] : deviceString; };
const LoadingSprout = () => (
    <div className="w-full h-[60vh] flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
        >
            <motion.div
                className="relative w-16 h-16"
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                <Sprout className="w-16 h-16 text-emerald-500" />
                <motion.div
                    className="absolute top-0 left-0 w-full h-full"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                >
                    <Sparkles className="w-16 h-16 text-yellow-400" />
                </motion.div>
            </motion.div>
            <p className="mt-4 font-medium tracking-widest text-sm uppercase">Growing Data...</p>
        </motion.div>
    </div>
);
const EmptyState: React.FC<{ title: string, message: string }> = ({ title, message }) => (<div className="w-full h-[60vh] flex flex-col items-center justify-center text-center p-6 rounded-2xl bg-slate-200/30 dark:bg-slate-800/30"><div className="w-16 h-16 flex items-center justify-center rounded-full bg-slate-200/50 dark:bg-slate-700/50 text-slate-500 mb-4"><Activity size={32} /></div><h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">{title}</h3><p className="max-w-sm mt-2 text-slate-500 dark:text-slate-400">{message}</p></div>);
const TabButton: React.FC<{ onClick: () => void, active: boolean, children: React.ReactNode }> = ({ onClick, active, children }) => (<button onClick={onClick} className={clsx("px-4 py-2 -mb-px text-sm font-semibold border-b-2 transition-colors", active ? "border-emerald-500 text-emerald-500" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200")}>{children}</button>);
const Panel: React.FC<{ title: string, icon: React.ElementType, children: React.ReactNode, className?: string }> = ({ title, icon: Icon, children, className }) => (
    <motion.section
        className={clsx("p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/20", className)}
        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
    >
        <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400"><Icon size={20} /></div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h3>
        </div>
        {children}
    </motion.section>
);

// SECTION: MODAL COMPONENTS

const ModalWrapper: React.FC<{ isOpen: boolean; onClose: () => void; children: React.ReactNode; title: string; }> = ({ isOpen, onClose, children, title }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
                            <h2 className="text-xl font-bold">{title}</h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">{children}</div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const PlantScannerModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Scan Plant Health">
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-center">
                <Camera size={48} className="text-slate-400 mb-4" />
                <h3 className="font-semibold text-lg mb-1">Camera Feed Placeholder</h3>
                <p className="text-sm text-slate-500 mb-6">Drag & drop an image or open your camera to analyze plant health and detect diseases.</p>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-6 py-2 bg-emerald-500 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-600 transition-colors">
                    Analyze Plant
                </motion.button>
            </div>
        </ModalWrapper>
    );
};

const CropProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; profiles: CropProfile[]; setProfiles: React.Dispatch<React.SetStateAction<CropProfile[]>> }> = ({ isOpen, onClose, profiles, setProfiles }) => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const initialFormState: CropProfile = { id: '', name: '', temperature: { min: 0, max: 0 }, humidity: { min: 0, max: 0 }, moisture6cm: { min: 0, max: 0 }, moisture15cm: { min: 0, max: 0 }, lightIntensity: { min: 0, max: 0 } };

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [formData, setFormData] = useState<CropProfile>(initialFormState);

    useEffect(() => {
        if (selectedId) {
            const selectedProfile = profiles.find(p => p.id === selectedId);
            if (selectedProfile) setFormData(selectedProfile);
        } else {
            setFormData(initialFormState);
        }
    }, [selectedId, profiles]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const [field, subfield] = name.split('.');

        if (subfield) {
            setFormData(prev => ({ ...prev, [field]: { ...(prev as any)[field], [subfield]: parseFloat(value) || 0 } }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = () => {
        if (!formData.name) {
            alert("Profile name is required.");
            return;
        }

        if (selectedId) {
            // Update existing profile
            setProfiles(profiles.map(p => p.id === selectedId ? formData : p));
        } else {
            // Add new profile
            const newProfile = { ...formData, id: uuidv4() };
            setProfiles([...profiles, newProfile]);
            setSelectedId(newProfile.id);
        }
    };

    const handleDelete = () => {
        if (selectedId && window.confirm("Are you sure you want to delete this profile?")) {
            setProfiles(profiles.filter(p => p.id !== selectedId));
            setSelectedId(null);
        }
    };

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Manage Crop Profiles">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Profile List */}
                <div className="w-full md:w-1/3 space-y-2">
                    <h3 className="font-semibold mb-2">Profiles</h3>
                    {profiles.map(profile => (
                        <button key={profile.id} onClick={() => setSelectedId(profile.id)} className={clsx("w-full text-left p-2 rounded-lg text-sm transition-colors", selectedId === profile.id ? "bg-emerald-500 text-white" : "hover:bg-slate-100 dark:hover:bg-slate-700")}>
                            {profile.name}
                        </button>
                    ))}
                    <button onClick={() => setSelectedId(null)} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors mt-4">
                        <Plus size={16} /> Add New
                    </button>
                </div>

                {/* Profile Form */}
                <div className="w-full md:w-2/3 space-y-4">
                    <h3 className="font-semibold">{selectedId ? 'Edit Profile' : 'Create New Profile'}</h3>
                    <div>
                        <label className="text-sm font-medium">Profile Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} className={inputStyles(isDarkMode)} placeholder="e.g., Cherry Tomatoes" />
                    </div>

                    {Object.entries({
                        temperature: { label: 'Temperature (°C)', icon: Thermometer },
                        humidity: { label: 'Humidity (%)', icon: Cloud },
                        moisture6cm: { label: 'Soil Moisture 6cm (cb)', icon: Sprout },
                        moisture15cm: { label: 'Soil Moisture 15cm (cb)', icon: Leaf },
                        lightIntensity: { label: 'Light (lux)', icon: Lightbulb }
                    }).map(([key, { label }]) => (
                        <div key={key}>
                            <label className="text-sm font-medium">{label}</label>
                            <div className="flex items-center gap-4 mt-1">
                                <input type="number" name={`${key}.min`} value={(formData as any)[key].min} onChange={handleInputChange} className={inputStyles(isDarkMode)} placeholder="Min" />
                                <input type="number" name={`${key}.max`} value={(formData as any)[key].max} onChange={handleInputChange} className={inputStyles(isDarkMode)} placeholder="Max" />
                            </div>
                        </div>
                    ))}

                    <div className="flex items-center gap-4 pt-4">
                        <motion.button onClick={handleSave} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full px-6 py-2 bg-emerald-500 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2">
                            <Save size={16} /> Save
                        </motion.button>
                        {selectedId && (
                            <motion.button onClick={handleDelete} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full px-6 py-2 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                                <Trash size={16} /> Delete
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </ModalWrapper>
    );
};


// SECTION: PLACEHOLDER COMPONENTS (to make App runnable)
const AIAdvisor: React.FC<{ stats: DeviceStats, cropProfile: CropProfile }> = ({ stats, cropProfile }) => (
    <Panel title="AI Crop Advisor" icon={Sparkles}>
        <div className="text-center text-slate-500 p-4">
            <Lightbulb size={32} className="mx-auto mb-2 text-yellow-400" />
            <p>AI-powered insights and recommendations about your crop will appear here based on live data.</p>
        </div>
    </Panel>
);

const ChartCard: React.FC<any> = ({ title, data, dataKey, color, isDarkMode, unit, cropProfile, anomalyData, notes }) => {
    // This is a placeholder, the original charting logic can be re-inserted here
    return (
        <Panel title={title} icon={BarChart3}>
            <div className="h-64 flex items-center justify-center bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                <p className="text-slate-400">Chart Placeholder for {title}</p>
            </div>
        </Panel>
    );
};

const IrrigationCard: React.FC<{ session: IrrigationSession }> = ({ session }) => (
    <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-700/50 space-y-2">
        <p className="font-semibold">Irrigation Session</p>
        <p className="text-sm"><strong>Started:</strong> {format(session.startTime, 'MMM d, h:mm a')}</p>
        <p className="text-sm"><strong>Duration:</strong> {session.duration} minutes</p>
    </div>
);

const NotesManager: React.FC<{ notes: Note[], setNotes: React.Dispatch<React.SetStateAction<Note[]>> }> = ({ notes, setNotes }) => {
    return (
        <div>
            <div className="space-y-2 mb-4">
                {notes.length > 0 ? notes.map(note => (
                    <div key={note.id} className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-sm">
                        <p className="font-semibold">{format(note.timestamp, 'MMM d, yyyy')}</p>
                        <p>{note.content}</p>
                    </div>
                )) : <p className="text-slate-500 text-sm">No notes added yet.</p>}
            </div>
            <textarea className={clsx(inputStyles(document.documentElement.classList.contains('dark')), 'min-h-[60px]')} placeholder="Add a new note..."></textarea>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="mt-2 px-4 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg">
                Save Note
            </motion.button>
        </div>
    );
};


// SECTION: CORE UI COMPONENTS

const Sidebar: React.FC<any> = ({ isOpen, isDarkMode, setIsDarkMode, language, setLanguage, masterNodes, selectedMaster, setSelectedMaster, slaveNodes, activeView, setActiveView, onOpenScanner, onOpenCropModal, onClose }) => {
    const t = useTranslation();
    const sidebarRef = useRef<HTMLElement>(null);

    // Close sidebar on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node) && isOpen) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.aside
                        ref={sidebarRef}
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className='fixed top-0 left-0 h-full w-80 flex-shrink-0 z-50 flex flex-col border-r bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 backdrop-blur-md lg:relative lg:translate-x-0'
                    >
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
                            <div className='p-3 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/30'><Wheat size={28} /></div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-800 dark:text-white">AgroSense</h1>
                                <p className="text-xs text-slate-400">Smart Farming Dashboard</p>
                            </div>
                            <button onClick={onClose} className="lg:hidden p-2 ml-auto rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                            <SidebarSection title={t('device_selection')} icon={HardDrive}>
                                <select value={selectedMaster} onChange={(e) => { setSelectedMaster(e.target.value); setActiveView('overview'); onClose(); }} className={inputStyles(isDarkMode)}>
                                    <option disabled value="">{t('select_master')}</option>
                                    {masterNodes.map((node: string) => <option key={node} value={node}>{parseDeviceString(node)}</option>)}
                                </select>
                                <button onClick={() => { setActiveView('overview'); onClose(); }} className={clsx("w-full text-sm font-semibold flex items-center gap-2 p-2 rounded-lg transition-colors", activeView === 'overview' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50')}>
                                    <Users size={14} /> {t('fleet_overview')}
                                </button>
                                <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-1">
                                    {slaveNodes.map((nodeKey: string) => (
                                        <button key={nodeKey} onClick={() => { setActiveView(nodeKey); onClose(); }} className={clsx("w-full text-left text-sm font-medium flex items-center gap-2 p-2 rounded-lg transition-colors", activeView === nodeKey ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50")}>
                                            <div className="w-2 h-2 rounded-full bg-slate-400" />{parseDeviceString(nodeKey).substring(0, 12)}...
                                        </button>
                                    ))}
                                </div>
                            </SidebarSection>
                            <SidebarSection title={t('tools')} icon={Zap}>
                                <button onClick={() => { onOpenCropModal(); onClose(); }} className="w-full text-sm font-semibold flex items-center gap-2 p-2 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"><SlidersHorizontal size={14} />{t('manage_profiles')}</button>
                                <button onClick={() => { onOpenScanner(); onClose(); }} className="w-full text-sm font-semibold flex items-center gap-2 p-2 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50"><Camera size={14} /> {t('scan_plant')}</button>
                            </SidebarSection>
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex gap-2">
                            <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">{isDarkMode ? <Sun size={16} /> : <Moon size={16} />}</button>
                            <button onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"><Globe size={16} /><span>{language === 'en' ? 'हिन्दी' : 'English'}</span></button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
            {/* Overlay for mobile when sidebar is open */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

// Moved this component outside of Header to prevent re-declaration on every render
const CustomDatePickerInput = forwardRef<HTMLButtonElement, { value?: string; onClick?: () => void }>(
    ({ value, onClick }, ref) => (
        <button
            onClick={onClick}
            ref={ref}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-200/50 dark:bg-slate-800/50 px-3 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
            <CalendarIcon size={16} />
            {value}
        </button>
    )
);
CustomDatePickerInput.displayName = 'CustomDatePickerInput';


const Header: React.FC<any> = ({ onMenuClick, currentData, activeView, irrigationState, onIrrigationToggle, onExport, isExporting, dateRange, setDateRange, cropProfile }) => {
    const t = useTranslation();
    const title = activeView === 'overview' ? t('fleet_overview') : cropProfile?.name ? `${t('dashboard')}: ${cropProfile.name}` : t('dashboard');
    const startDate = Array.isArray(dateRange) ? dateRange[0] : null;
    const endDate = Array.isArray(dateRange) ? dateRange[1] : null;

    return (
        <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-2 sm:gap-4">
                <button onClick={onMenuClick} className="p-2 rounded-lg text-slate-500 dark:hover:bg-slate-800 hover:bg-slate-200 transition-colors lg:hidden"><Menu size={24} /></button>
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">{title}</h2>
                    {currentData?.timestamp && (<div className="flex items-center gap-1.5"><motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }} className="w-2 h-2 rounded-full bg-emerald-500" /><p className="text-xs sm:text-sm text-slate-500">{t('live')}</p></div>)}
                </div>
            </div>
            {activeView !== 'overview' && (
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4 ml-auto">
                    <div className="hidden lg:block">
                        <DatePicker selectsRange={true} startDate={startDate} endDate={endDate} onChange={(update: [Date | null, Date | null]) => setDateRange(update)} customInput={<CustomDatePickerInput />} dateFormat="MMM d, yyyy" />
                    </div>
                    <div className="flex items-center gap-2">
                        <button title={t('export_excel')} onClick={() => onExport('excel')} disabled={isExporting} className="p-2 rounded-lg text-slate-500 dark:hover:bg-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"><FileSpreadsheet size={18} /></button>
                        <button title={t('export_pdf')} onClick={() => onExport('pdf')} disabled={isExporting} className="p-2 rounded-lg text-slate-500 dark:hover:bg-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50">{isExporting ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Download size={18} /></motion.div> : <FileText size={18} />}</button>
                    </div>
                    <motion.button onClick={onIrrigationToggle} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} animate={{ backgroundColor: irrigationState ? '#0ea5e9' : (localStorage.getItem('agroSenseDarkMode_v4') === 'true' ? '#334155' : '#e2e8f0') }} className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-colors', irrigationState && 'text-white')}><Droplets size={16} /><span className="hidden sm:inline">{irrigationState ? t('irrigation_on') : t('irrigation_off')}</span></motion.button>
                </div>
            )}
        </header>
    );
};

const DetailView: React.FC<any> = ({ deviceData, cropProfile, notes, setNotes, isDarkMode }) => {
    const [activePanel, setActivePanel] = useState('live');
    const t = useTranslation();

    const SENSOR_CONFIG: { [key: string]: { label: string; unit: string; icon: React.ElementType; color: string; } } = {
        temperature: { label: t('temperature'), unit: "°C", icon: Thermometer, color: "amber" },
        humidity: { label: t('humidity'), unit: "%", icon: Cloud, color: "sky" },
        soilMoisture6cm: { label: t('soil_moisture_6cm'), unit: "cb", icon: Sprout, color: "emerald" },
        soilMoisture15cm: { label: t('soil_moisture_15cm'), unit: "cb", icon: Leaf, color: "teal" },
        lightIntensity: { label: t('light_intensity'), unit: "lux", icon: Lightbulb, color: "yellow" },
        weight: { label: t('weight'), unit: "g", icon: Scale, color: "slate" },
        tilt: { label: t('tilt_angle'), unit: "°", icon: GitCommit, color: "blue" },
        latitude: { label: t('latitude'), unit: "°", icon: Compass, color: "purple" },
        longitude: { label: t('longitude'), unit: "°", icon: Compass, color: "purple" },
        altitude: { label: t('altitude'), unit: "m", icon: Waves, color: "indigo" },
        gpsAccuracy: { label: t('gps_accuracy'), unit: "m", icon: LocateFixed, color: "pink" },
        RSSI: { label: t('signal_strength'), unit: "dBm", icon: Wifi, color: "violet" }
        // New sensors will be handled by the default case in SensorCard
    };
    const sessions: IrrigationSession[] = []; // Placeholder for session detection logic

    if (!deviceData || !deviceData.current || !cropProfile) {
        return <EmptyState title={t('no_data')} message="Awaiting device data or crop profile selection." />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center border-b border-slate-200 dark:border-slate-700">
                <TabButton onClick={() => setActivePanel('live')} active={activePanel === 'live'}>{t('live_status')}</TabButton>
                <TabButton onClick={() => setActivePanel('history')} active={activePanel === 'history'}>{t('historical_analysis')}</TabButton>
            </div>
            <AnimatePresence mode="wait">
                <motion.div key={activePanel} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                    {activePanel === 'live' && (<LiveDashboard stats={deviceData.stats} sensorConfig={SENSOR_CONFIG} cropProfile={cropProfile} isDarkMode={isDarkMode} data={deviceData.fullData} anomalyData={deviceData.anomalyData} notes={notes} />)}
                    {activePanel === 'history' && (<HistoricalDashboard sessions={sessions} notes={notes} setNotes={setNotes} />)}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const FleetOverview: React.FC<any> = ({ data, setActiveView, cropProfiles, selectedCropId }) => {
    const t = useTranslation();
    const activeCropProfile = useMemo(() => cropProfiles.find((c: CropProfile) => c.id === selectedCropId), [cropProfiles, selectedCropId]);
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{t('fleet_overview')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.map((device: OverviewDeviceData) => (<DeviceCard key={device.mac} device={device} onClick={() => setActiveView(device.mac)} cropProfile={activeCropProfile} />))}
            </div>
        </motion.div>
    );
};

const DeviceCard: React.FC<{ device: OverviewDeviceData, onClick: () => void, cropProfile?: CropProfile }> = React.memo(({ device, onClick, cropProfile }) => {
    const t = useTranslation();
    const getStatus = (value: number, key: keyof CropProfile) => {
        if (!cropProfile || !device.latest || typeof value !== 'number') return 'ideal';
        const limits = cropProfile[key];
        if (!limits || !('min' in limits)) return 'ideal';
        if (value < limits.min) return 'low'; if (value > limits.max) return 'high'; return 'ideal';
    };
    const STATUS_COLORS: { [key: string]: string } = { low: 'bg-blue-500', high: 'bg-red-500', ideal: 'bg-emerald-500' };

    return (
        <motion.div
            onClick={onClick}
            whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
            className="p-5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/20 border border-transparent dark:hover:border-emerald-500 transition-all duration-300 cursor-pointer"
        >
            <div className="flex justify-between items-start">
                <p className="font-bold text-slate-800 dark:text-white">Slave-{parseDeviceString(device.mac).substring(0, 8)}...</p>
                {device.latest ? <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-xs text-slate-400">Online</span></div> : <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-400" /><span className="text-xs text-slate-400">Offline</span></div>}
            </div>
            {device.latest ? (
                <>
                    <p className="text-xs text-slate-400 mb-4">{isValid(new Date(device.latest.timestamp)) ? formatDistanceToNow(device.latest.timestamp, { addSuffix: true }) : 'Unknown time'}</p>
                    <div className="space-y-3">
                        {[
                            { key: 'temperature', label: t('temperature'), unit: '°C' },
                            { key: 'humidity', label: t('humidity'), unit: '%' },
                            { key: 'soilMoisture6cm', label: t('soil_moisture_6cm'), unit: 'cb', type: 'moisture6cm' },
                            { key: 'lightIntensity', label: t('light_intensity'), unit: 'lux' },
                        ].map((item: any) => (
                            <div key={item.key} className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">{item.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{Number(device.latest?.[item.key] ?? '--').toFixed(1)} {item.unit}</span>
                                    <div className={clsx("w-2.5 h-2.5 rounded-full", STATUS_COLORS[getStatus(device.latest[item.key] as number, item.type || item.key)])} />
                                </div>
                            </div>
                        ))}
                        {device.latest.latitude && device.latest.longitude && (
                            <div className="flex justify-between items-center text-sm text-slate-500">
                                <span>GPS</span>
                                <span className="font-semibold">{Number(device.latest.latitude).toFixed(4)}, {Number(device.latest.longitude).toFixed(4)}</span>
                            </div>
                        )}
                    </div>
                </>
            ) : <p className="text-sm text-slate-400 mt-4 h-full flex items-center justify-center">No data received.</p>
            }
        </motion.div>
    );
});
// New Components for extra sensor data
const LocationCard: React.FC<{ latest: DataPoint | null }> = ({ latest }) => {
    if (!latest || !latest.latitude || !latest.longitude) {
        return (
            <Panel title="Device Location" icon={LocateFixed}>
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    Awaiting location data...
                </div>
            </Panel>
        );
    }
    const { latitude, longitude, altitude, gpsAccuracy } = latest;

    return (
        <Panel title="Device Location" icon={LocateFixed}>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Coordinates</span>
                    <a
                        href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold hover:text-emerald-500 transition-colors"
                    >
                        {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
                    </a>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Altitude</span>
                    <span className="font-semibold">{Number(altitude ?? 0).toFixed(1)} m</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Accuracy</span>
                    <span className="font-semibold">{Number(gpsAccuracy ?? 0).toFixed(1)} m</span>
                </div>
            </div>
        </Panel>
    );
};
const IMUCard: React.FC<{ latest: DataPoint | null }> = ({ latest }) => {
    if (!latest || typeof latest.tilt !== 'number') {
        return null;
    }
    const { tilt, accelerationX, accelerationY, accelerationZ, gyroX, gyroY, gyroZ } = latest;
    return (
        <Panel title="Inertial Measurement" icon={Compass}>
            <div className="text-center mb-4">
                <p className="text-slate-500 text-sm">Tilt Angle</p>
                <p className="text-4xl font-bold">{Number(tilt).toFixed(1)}°</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs text-center">
                <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <p className="font-semibold">Acceleration (G)</p>
                    <p>X: {Number(accelerationX).toFixed(2)}, Y: {Number(accelerationY).toFixed(2)}, Z: {Number(accelerationZ).toFixed(2)}</p>
                </div>
                <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                    <p className="font-semibold">Gyroscope (°/s)</p>
                    <p>X: {Number(gyroX).toFixed(2)}, Y: {Number(gyroY).toFixed(2)}, Z: {Number(gyroZ).toFixed(2)}</p>
                </div>
            </div>
        </Panel>
    );
}

const PlantMoodComponent: React.FC<{ stats?: DeviceStats, cropProfile?: CropProfile }> = ({ stats, cropProfile }) => {
    const plantMood = useMemo((): PlantMood => {
        if (!stats || !cropProfile) {
            return { mood: 'neutral', message: "Awaiting data...", icon: Meh };
        }

        let happyPoints = 0;
        let sadPoints = 0;
        let totalChecks = 0;

        const checkStat = (key: keyof DeviceStats, profileKey: keyof CropProfile) => {
            if (stats[key] && cropProfile[profileKey]) {
                totalChecks++;
                const current = stats[key]!.current;
                const { min, max } = cropProfile[profileKey] as { min: number, max: number };
                if (current >= min && current <= max) {
                    happyPoints++;
                } else {
                    sadPoints++;
                }
            }
        };

        checkStat('temperature', 'temperature');
        checkStat('humidity', 'humidity');
        checkStat('soilMoisture6cm', 'moisture6cm');
        checkStat('soilMoisture15cm', 'moisture15cm');
        checkStat('lightIntensity', 'lightIntensity');

        if (totalChecks === 0) return { mood: 'neutral', message: "No profile data to compare.", icon: Meh };
        if (sadPoints > totalChecks / 2) return { mood: 'sad', message: "I'm feeling a bit under the weather. Please check my stats!", icon: Frown };
        if (sadPoints > 0) return { mood: 'neutral', message: "I'm okay, but some things could be better.", icon: Meh };
        if (happyPoints === totalChecks) return { mood: 'excited', message: "Everything is perfect! I'm thriving!", icon: Sparkles };
        return { mood: 'happy', message: "I'm feeling great! Conditions are just right.", icon: Smile };
    }, [stats, cropProfile]);

    const MOOD_COLORS = {
        happy: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
        neutral: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
        sad: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400",
        excited: "bg-yellow-100 dark:bg-yellow-500/20 text-yellow-500 dark:text-yellow-400",
    }

    return (
        <Panel title="Plant Personality" icon={Heart} className="col-span-1 md:col-span-2 lg:col-span-4">
            <motion.div
                key={plantMood.mood}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4"
            >
                <div className={clsx("p-4 rounded-full", MOOD_COLORS[plantMood.mood])}>
                    <plantMood.icon size={32} />
                </div>
                <div>
                    <p className="font-bold text-lg text-slate-800 dark:text-white capitalize">{plantMood.mood}</p>
                    <p className="text-slate-500 dark:text-slate-400">{plantMood.message}</p>
                </div>
            </motion.div>
        </Panel>
    );
};

const LiveDashboard: React.FC<any> = ({ stats, sensorConfig, cropProfile, isDarkMode, data, anomalyData, notes }) => (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.05 } } }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <PlantMoodComponent stats={stats} cropProfile={cropProfile} />

            {/* Dynamically render a SensorCard for every stat available */}
            {Object.keys(stats).map(key => {
                const config = sensorConfig[key] || {
                    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), // Auto-format label
                    unit: "",
                    icon: Activity, // Default icon
                    color: "slate"
                };

                // Do not render cards for raw IMU/GPS data here as they have dedicated components
                if (['accelerationX', 'accelerationY', 'accelerationZ', 'gyroX', 'gyroY', 'gyroZ', 'latitude', 'longitude', 'altitude', 'gpsAccuracy'].includes(key)) {
                    return null;
                }

                return (
                    <motion.div key={key} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                        <SensorCard label={config.label} stats={stats[key]} unit={config.unit} icon={config.icon} color={config.color} cropProfile={cropProfile} dataKey={key} />
                    </motion.div>
                );
            })}
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="md:col-span-1 lg:col-span-2"><LocationCard latest={data[data.length - 1]} /></motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="md:col-span-1 lg:col-span-2"><IMUCard latest={data[data.length - 1]} /></motion.div>
        </div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
            <AIAdvisor stats={stats} cropProfile={cropProfile} />
        </motion.div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.keys(stats).map((key) => {
                const config = sensorConfig[key] || {
                    label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                    color: "slate",
                    unit: ""
                };
                return (
                    <motion.div key={key} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                        <ChartCard title={`${config.label} Trend`} data={data} dataKey={key} color={config.color} isDarkMode={isDarkMode} unit={config.unit} cropProfile={cropProfile} anomalyData={anomalyData?.[key]} notes={notes} />
                    </motion.div>
                )
            })}
        </div>
    </motion.div>
);
const HistoricalDashboard: React.FC<any> = ({ sessions, notes, setNotes }) => {
    const t = useTranslation();
    return (
        <motion.div className="space-y-8" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <Panel title={t('irrigation_history')} icon={History}>
                    {sessions.length === 0 ? <p className="text-slate-500 text-sm">No irrigation sessions were automatically detected in the selected time range.</p> :
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {sessions.map((s: IrrigationSession) => <IrrigationCard key={s.startTime} session={s} />)}
                        </div>
                    }
                </Panel>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <Panel title={t('event_log_notes')} icon={BookOpen}>
                    <NotesManager notes={notes} setNotes={setNotes} />
                </Panel>
            </motion.div>
        </motion.div>
    )
};
const SensorCard: React.FC<{ label: string, stats?: Stats, unit: string, icon: React.ElementType, color: string, cropProfile?: CropProfile, dataKey: string }> = React.memo(({ label, stats, unit, icon: Icon, color, cropProfile, dataKey }) => {
    const t = useTranslation();
    const getStatus = (value: number) => {
        const profileKeyMap: { [key: string]: keyof CropProfile } = {
            temperature: 'temperature',
            humidity: 'humidity',
            soilMoisture6cm: 'moisture6cm',
            soilMoisture15cm: 'moisture15cm',
            lightIntensity: 'lightIntensity'
        };
        const profileKey = profileKeyMap[dataKey];
        if (!profileKey || !cropProfile || !(profileKey in cropProfile)) return 'ideal';
        const limits = cropProfile[profileKey] as { min: number; max: number };
        if (value < limits.min) return 'low'; if (value > limits.max) return 'high'; return 'ideal';
    };

    const STATUS_CONFIG = {
        low: { text: t('low'), color: "text-blue-500", bg: "bg-blue-500/10 dark:bg-blue-500/20" },
        ideal: { text: t('ideal'), color: "text-emerald-500", bg: "bg-emerald-500/10 dark:bg-emerald-500/20" },
        high: { text: t('high'), color: "text-red-500", bg: "bg-red-500/10 dark:bg-red-500/20" },
    };
    const status = stats ? getStatus(stats.current) : 'ideal';

    const COLOR_CLASSES = {
        amber: `bg-amber-100 dark:bg-amber-500/20 text-amber-500 dark:text-amber-400`,
        sky: `bg-sky-100 dark:bg-sky-500/20 text-sky-500 dark:text-sky-400`,
        emerald: `bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 dark:text-emerald-400`,
        violet: `bg-violet-100 dark:bg-violet-500/20 text-violet-500 dark:text-violet-400`,
        yellow: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-500 dark:text-yellow-400',
        slate: 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
        blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400',
        purple: 'bg-purple-100 dark:bg-purple-500/20 text-purple-500 dark:text-purple-400',
        indigo: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500 dark:text-indigo-400',
        pink: 'bg-pink-100 dark:bg-pink-500/20 text-pink-500 dark:text-pink-400',
        teal: 'bg-teal-100 dark:bg-teal-500/20 text-teal-500 dark:text-teal-400'
    } as const;

    return (
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-black/20 border border-transparent dark:hover:border-slate-700 h-full">
            <div className="flex items-start justify-between">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                <div className={clsx(`p-3 rounded-lg`, COLOR_CLASSES[color as keyof typeof COLOR_CLASSES])}><Icon size={20} /></div>
            </div>
            <div className="mt-2">
                <p className="text-3xl font-bold text-slate-800 dark:text-white">{stats?.current?.toFixed(1) ?? '--'}
                    <span className="text-xl font-medium text-slate-400 dark:text-slate-500 ml-1">{unit}</span>
                </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{t('avg')}: {stats?.avg?.toFixed(1) ?? '--'}</span>
                {dataKey !== 'RSSI' && (<span className={clsx("font-semibold px-2 py-0.5 rounded-full", STATUS_CONFIG[status].bg, STATUS_CONFIG[status].color)}>{STATUS_CONFIG[status].text}</span>)}
            </div>
        </div>
    );
});
// SECTION: MAIN APP COMPONENT
function App() {
    const [language, setLanguage] = useLocalStorage<Language>('agroSenseLang_v4', 'en');
    const [allDevicesData, setAllDevicesData] = useState<{ [mac: string]: DeviceRawData }>({});
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024); // Open by default on larger screens
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [masterNodes, setMasterNodes] = useState<string[]>([]);
    const [selectedMaster, setSelectedMaster] = useState<string>('');
    const [slaveNodes, setSlaveNodes] = useState<string[]>([]);
    const [activeView, setActiveView] = useState<'overview' | string>('overview');
    // Updated CropProfiles with new sensor ranges
    const [cropProfiles, setCropProfiles] = useLocalStorage<CropProfile[]>('agroSenseCrops_v4', [
        {
            id: 'tomato-default', name: "Tomato (Default)",
            temperature: { min: 18, max: 29 }, humidity: { min: 60, max: 80 },
            moisture6cm: { min: 50, max: 75 }, moisture15cm: { min: 45, max: 70 },
            lightIntensity: { min: 8000, max: 15000 }
        },
        // ... other profiles
    ]);
    const [selectedCropId, setSelectedCropId] = useLocalStorage<string>('agroSenseSelectedCrop_v4', cropProfiles[0]?.id || '');
    const [isScannerOpen, setScannerOpen] = useState(false);
    const [isCropModalOpen, setCropModalOpen] = useState(false);
    const [isDarkMode, setIsDarkMode] = useLocalStorage<boolean>('agroSenseDarkMode_v4', false);
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([startOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)), endOfDay(new Date())]);
    const [notes, setNotes] = useLocalStorage<Note[]>(`notes_${activeView}`, []);
    const [activeIrrigationState, setActiveIrrigationState] = useState<boolean>(false);

    // ... other states like achievements, etc.
    const [totalDataPoints, setTotalDataPoints] = useState(0);

    const t = (key: string) => translations[language]?.[key as keyof typeof translations.en] || key;

    // Fetch master nodes
    useEffect(() => {
        const mastersRef = ref(db, 'DHARA');
        const unsub = onValue(mastersRef, (snapshot) => {
            const data = snapshot.val();
            const masters = data ? Object.keys(data) : [];
            setMasterNodes(masters);
            if (masters.length > 0 && !selectedMaster) {
                setSelectedMaster(masters[0]);
            }
        });
        return () => unsub();
    }, []); // Removed selectedMaster dependency to prevent re-fetch loop

    // Fetch data for the selected master node
    useEffect(() => {
        if (!selectedMaster) {
            setSlaveNodes([]); setAllDevicesData({}); setIsLoading(false); return;
        }
        setIsLoading(true);
        const masterRef = ref(db, `DHARA/${selectedMaster}`);
        const unsub = onValue(masterRef, (snapshot) => {
            const masterData = snapshot.val() || {};
            // Filter for slave nodes and also 'Control' if it exists.
            const slaves = Object.keys(masterData).filter(key => key.startsWith('Slave('));
            setSlaveNodes(slaves);
            setAllDevicesData(masterData);
            setIsLoading(false);
        }, { onlyOnce: false });
        return () => unsub();
    }, [selectedMaster]);

    // irrigation state subscription
    useEffect(() => {
        if (!selectedMaster || activeView === 'overview') return;
        // The path to Irrigation control may be directly under the Master
        const irrigationRef = ref(db, `DHARA/${selectedMaster}/Control/Irrigation`);
        const unsub = onValue(irrigationRef, (snapshot) => {
            setActiveIrrigationState(snapshot.val() === 1);
        });
        return () => unsub();
    }, [selectedMaster, activeView]);

    // ** REWRITTEN DYNAMIC DATA PROCESSING HOOK **
    const activeData: ProcessedDeviceData | null = useMemo(() => {
        if (activeView === 'overview' || !allDevicesData[activeView]) return null;

        // 1. Get raw data directly from the slave node object. It no longer has a 'sensorData' property.
        const rawDeviceData: DeviceRawData = allDevicesData[activeView];
        if (!rawDeviceData || typeof rawDeviceData !== 'object') {
            return { fullData: [], current: null, stats: {}, anomalyData: {} };
        }

        // 2. Convert the epoch-keyed object into a sorted array of data points.
        const sorted = Object.entries(rawDeviceData)
            .filter(([key, value]) => !isNaN(parseInt(key, 10)) && typeof value === 'object' && value !== null)
            .map(([epoch, data]) => ({
                timestamp: parseInt(epoch, 10) * 1000,
                ...(data as SensorData),
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        if (sorted.length === 0) return { fullData: [], current: null, stats: {}, anomalyData: {} };

        setTotalDataPoints(sorted.length);

        // 3. Dynamically discover all unique sensor keys from the entire dataset.
        const allKeys = new Set<string>();
        sorted.forEach(dataPoint => {
            Object.keys(dataPoint).forEach(key => {
                // Only consider keys with numeric values for stats
                if (key !== 'timestamp' && typeof dataPoint[key] === 'number') {
                    allKeys.add(key);
                }
            });
        });
        const dynamicSensorKeys = Array.from(allKeys);

        // 4. Calculate statistics for each dynamically discovered key.
        const stats: DeviceStats = {};
        dynamicSensorKeys.forEach(key => {
            const values = sorted.map(d => d[key]).filter((v): v is number => typeof v === 'number' && isFinite(v));
            if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                stats[key] = {
                    current: values[values.length - 1],
                    min: Math.min(...values),
                    max: Math.max(...values),
                    avg: avg
                };
            }
        });

        return { fullData: sorted, current: sorted[sorted.length - 1] ?? null, stats, anomalyData: {} };
    }, [allDevicesData, activeView]);


    const overviewData: OverviewDeviceData[] = useMemo(() => {
        return slaveNodes.map(slaveKey => {
            const deviceData = allDevicesData[slaveKey];
            if (!deviceData) return { mac: slaveKey, latest: null };

            const sortedEpochs = Object.keys(deviceData).filter(key => !isNaN(parseInt(key))).sort((a, b) => parseInt(a) - parseInt(b));
            if (sortedEpochs.length === 0) return { mac: slaveKey, latest: null };
            const latestEpoch = sortedEpochs[sortedEpochs.length - 1];

            return {
                mac: slaveKey,
                latest: {
                    timestamp: parseInt(latestEpoch) * 1000,
                    ...(deviceData[latestEpoch] as SensorData)
                }
            };
        });
    }, [allDevicesData, slaveNodes]);

    useEffect(() => { document.documentElement.classList.toggle('dark', isDarkMode); }, [isDarkMode]);

    const activeCropProfile = useMemo(() => cropProfiles.find(c => c.id === selectedCropId), [cropProfiles, selectedCropId]);

    const handleIrrigationToggle = () => {
        if (selectedMaster) {
            const irrigationRef = ref(db, `DHARA/${selectedMaster}/Control/Irrigation`);
            set(irrigationRef, activeIrrigationState ? 0 : 1);
        }
    }

    const handleExport = (formatType: 'excel' | 'pdf') => {
        if (!activeData) return;
        setIsExporting(true);

        if (formatType === 'excel') {
            const exportData = activeData.fullData.map(d => {
                const { timestamp, ...rest } = d;
                return {
                    timestamp: format(timestamp, 'yyyy-MM-dd HH:mm:ss'),
                    ...rest
                }
            });
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sensor Data');
            XLSX.writeFile(wb, `agrosense-data-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
        }
        // PDF logic can be added here if needed

        setIsExporting(false);
    };

    return (
        <LanguageContext.Provider value={t}>
            <div className={clsx('min-h-screen font-sans antialiased flex', isDarkMode ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800')}>
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} language={language} setLanguage={setLanguage} masterNodes={masterNodes} selectedMaster={selectedMaster} setSelectedMaster={setSelectedMaster} slaveNodes={slaveNodes} activeView={activeView} setActiveView={setActiveView} onOpenCropModal={() => setCropModalOpen(true)} onOpenScanner={() => setScannerOpen(true)} />
                <main className="flex-1 transition-all duration-300 w-full overflow-y-auto">
                    <div className="p-4 sm:p-6 md:p-8">
                        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} currentData={activeData?.current} activeView={activeView} irrigationState={activeIrrigationState} onIrrigationToggle={handleIrrigationToggle} onExport={handleExport} isExporting={isExporting} dateRange={dateRange} setDateRange={setDateRange} cropProfile={activeCropProfile} />
                        {isLoading ? <LoadingSprout /> : (
                            activeView === 'overview'
                                ? <FleetOverview data={overviewData} setActiveView={setActiveView} cropProfiles={cropProfiles} selectedCropId={selectedCropId} />
                                : <DetailView deviceData={activeData} cropProfile={activeCropProfile} isDarkMode={isDarkMode} notes={notes} setNotes={setNotes} />
                        )}
                    </div>
                </main>

                <PlantScannerModal isOpen={isScannerOpen} onClose={() => setScannerOpen(false)} />
                <CropProfileModal isOpen={isCropModalOpen} onClose={() => setCropModalOpen(false)} profiles={cropProfiles} setProfiles={setCropProfiles} />

            </div>
        </LanguageContext.Provider>
    );
}
export default App;