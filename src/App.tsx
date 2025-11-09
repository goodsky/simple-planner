import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, FolderOpen } from 'lucide-react';

export default function App() {
  const [selectedDate, setSelectedDate] = useState(new Date(2025, 10, 10)); // Nov 10, 2025 (Monday)
  const [workingDirectory, setWorkingDirectory] = useState<string>('~/Documents/work-todos');

  // Mock data for the selected day
  const [scheduleItems, setScheduleItems] = useState([
    { id: 1, time: '09:00am', description: 'Team Sync' },
    { id: 2, time: '11:00am', description: 'Chelsea/Skyler 1:1' },
  ]);

  const [checklistItems, setChecklistItems] = useState([
    { id: 1, text: 'Review PRs', completed: false },
    { id: 2, text: 'Write a fix for the Bug', completed: false },
    { id: 3, text: 'Update documentation', completed: true },
  ]);

  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [newScheduleDesc, setNewScheduleDesc] = useState('');
  const [newChecklistText, setNewChecklistText] = useState('');

  // Generate week days (Mon-Fri)
  const getWeekDays = (date: Date) => {
    const curr = new Date(date);
    const monday = new Date(curr.setDate(curr.getDate() - curr.getDay() + 1));
    const days = [];
    for (let i = 0; i < 5; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const weekDays = getWeekDays(selectedDate);

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateFull = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.toDateString() === d2.toDateString();
  };

  const toggleCheckbox = (id: number) => {
    setChecklistItems((items) => items.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  const addScheduleItem = () => {
    if (newScheduleTime && newScheduleDesc) {
      setScheduleItems([
        ...scheduleItems,
        {
          id: Date.now(),
          time: newScheduleTime,
          description: newScheduleDesc,
        },
      ]);
      setNewScheduleTime('');
      setNewScheduleDesc('');
    }
  };

  const addChecklistItem = () => {
    if (newChecklistText) {
      setChecklistItems([
        ...checklistItems,
        {
          id: Date.now(),
          text: newChecklistText,
          completed: false,
        },
      ]);
      setNewChecklistText('');
    }
  };

  const deleteScheduleItem = (id: number) => {
    setScheduleItems((items) => items.filter((item) => item.id !== id));
  };

  const deleteChecklistItem = (id: number) => {
    setChecklistItems((items) => items.filter((item) => item.id !== id));
  };

  // Load working directory from settings on mount
  useEffect(() => {
    const loadDirectory = async () => {
      if (window.electronAPI) {
        const savedDirectory = await window.electronAPI.getSetting('workingDirectory');
        if (savedDirectory) {
          setWorkingDirectory(savedDirectory);
        }
      }
    };
    loadDirectory();
  }, []);

  // Handle folder selection
  const handleSelectFolder = async () => {
    if (window.electronAPI) {
      const selectedFolder = await window.electronAPI.selectFolder();
      if (selectedFolder) {
        setWorkingDirectory(selectedFolder);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Daily Todo</h1>
          <div className="flex items-center gap-3">
            <p className="text-gray-600">Folder: {workingDirectory}</p>
            <button onClick={handleSelectFolder} className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors">
              <FolderOpen size={16} />
              Change
            </button>
          </div>
        </div>

        {/* Week Calendar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Week of {formatDateShort(weekDays[0])}</h2>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">← Prev</button>
              <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">Next →</button>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {weekDays.map((day, idx) => (
              <button key={idx} onClick={() => setSelectedDate(day)} className={`p-4 rounded-lg border-2 transition-all ${isSameDay(day, selectedDate) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <div className="text-xs text-gray-500 mb-1">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div className={`text-lg font-semibold ${isSameDay(day, selectedDate) ? 'text-blue-600' : 'text-gray-800'}`}>{day.getDate()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Day Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">{formatDateFull(selectedDate)}</h2>

          {/* Schedule Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Schedule</h3>
            </div>

            <div className="space-y-2 mb-4">
              {scheduleItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="text-blue-600 font-mono text-sm font-medium w-20">{item.time}</span>
                  <span className="flex-1 text-gray-800">{item.description}</span>
                  <button onClick={() => deleteScheduleItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Schedule Item */}
            <div className="flex gap-2">
              <input type="text" placeholder="09:00am" value={newScheduleTime} onChange={(e) => setNewScheduleTime(e.target.value)} className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <input type="text" placeholder="Meeting description..." value={newScheduleDesc} onChange={(e) => setNewScheduleDesc(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addScheduleItem()} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={addScheduleItem} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>

          {/* Checklist Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">Checklist</h3>
            </div>

            <div className="space-y-2 mb-4">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                  <button onClick={() => toggleCheckbox(item.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${item.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-500'}`}>
                    {item.completed && <Check size={14} className="text-white" />}
                  </button>
                  <span className={`flex-1 ${item.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>{item.text}</span>
                  <button onClick={() => deleteChecklistItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Checklist Item */}
            <div className="flex gap-2">
              <input type="text" placeholder="New task..." value={newChecklistText} onChange={(e) => setNewChecklistText(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && addChecklistItem()} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={addChecklistItem} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2">
                <Plus size={16} />
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
