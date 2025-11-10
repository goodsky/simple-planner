import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, FolderOpen, FileText } from 'lucide-react';
import type { PlannerData, PlannerEvent, PlannerTask } from './types';

export default function App() {
  // Initialize with current date, adjusted to work week if weekend
  const getInitialDate = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    // If Saturday (6) or Sunday (0), move to next Monday
    if (dayOfWeek === 0) {
      today.setDate(today.getDate() + 1); // Sunday -> Monday
    } else if (dayOfWeek === 6) {
      today.setDate(today.getDate() + 2); // Saturday -> Monday
    }

    return today;
  };

  const [selectedDate, setSelectedDate] = useState(getInitialDate());
  const [workingDirectory, setWorkingDirectory] = useState<string>('~/Documents/work-todos');
  const [fileLoaded, setFileLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [datesWithFiles, setDatesWithFiles] = useState<Set<string>>(new Set());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  // Data for the selected day
  const [scheduleItems, setScheduleItems] = useState<Array<PlannerEvent & { id: number }>>([]);
  const [checklistItems, setChecklistItems] = useState<Array<PlannerTask & { id: number }>>([]);

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

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 7);
    setSelectedDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 7);
    setSelectedDate(newDate);
  };

  const goToDate = (dateString: string) => {
    const newDate = new Date(dateString);
    if (!isNaN(newDate.getTime())) {
      setSelectedDate(newDate);
    }
  };

  const handleDatePickerBlur = (e: React.FocusEvent) => {
    // Only close if we're not clicking within the date picker
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setShowDatePicker(false);
    }
  };

  const goToToday = () => {
    setSelectedDate(getInitialDate());
  };

  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getFilePath = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${workingDirectory}/${year}-${month}-${day}.txt`;
  };

  const getDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const checkWeekFilesExist = async (days: Date[]) => {
    if (!window.electronAPI) return;

    const checks = await Promise.all(
      days.map(async (day) => {
        const filePath = getFilePath(day);
        const exists = await window.electronAPI.checkFileExists(filePath);
        return { date: getDateKey(day), exists };
      })
    );

    const newDatesWithFiles = new Set<string>();
    checks.forEach(({ date, exists }) => {
      if (exists) {
        newDatesWithFiles.add(date);
      }
    });
    setDatesWithFiles(newDatesWithFiles);
  };

  const loadPlannerFile = async (date: Date) => {
    if (!window.electronAPI) return;

    const filePath = getFilePath(date);
    setLoadError(null);

    // First check if file exists
    const exists = await window.electronAPI.checkFileExists(filePath);

    if (!exists) {
      // File doesn't exist - this is expected, not an error
      setScheduleItems([]);
      setChecklistItems([]);
      setFileLoaded(false);
      return;
    }

    // File exists, try to load it
    try {
      const data = await window.electronAPI.readPlannerFile(filePath);

      // Convert to internal format with IDs
      const eventsWithIds = data.events.map((event, idx) => ({
        ...event,
        id: Date.now() + idx,
      }));

      const tasksWithIds = data.tasks.map((task, idx) => ({
        ...task,
        id: Date.now() + 1000 + idx,
      }));

      setScheduleItems(eventsWithIds);
      setChecklistItems(tasksWithIds);
      setFileLoaded(true);
    } catch (error) {
      // File exists but couldn't be read - this is an actual error
      setScheduleItems([]);
      setChecklistItems([]);
      setFileLoaded(false);
      setLoadError(error instanceof Error ? error.message : 'Failed to load file');
    }
  };

  const createPlannerFile = async (date: Date) => {
    if (!window.electronAPI) return;

    const filePath = getFilePath(date);
    const emptyData: PlannerData = {
      date: formatDateFull(date),
      events: [],
      tasks: [],
    };

    try {
      await window.electronAPI.writePlannerFile(filePath, emptyData);
      setScheduleItems([]);
      setChecklistItems([]);
      setFileLoaded(true);
      setLoadError(null);

      // Update the files existence cache
      await checkWeekFilesExist(weekDays);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to create file');
    }
  };

  const savePlannerFile = async () => {
    if (!window.electronAPI || !fileLoaded) return;

    const filePath = getFilePath(selectedDate);
    const data: PlannerData = {
      date: formatDateFull(selectedDate),
      events: scheduleItems.map(({ id, ...event }) => event),
      tasks: checklistItems.map(({ id, ...task }) => task),
    };

    try {
      await window.electronAPI.writePlannerFile(filePath, data);
    } catch (error) {
      console.error('Failed to save planner file:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to save file');
    }
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

  // Load planner file when date changes
  useEffect(() => {
    if (workingDirectory) {
      loadPlannerFile(selectedDate);
    }
  }, [selectedDate, workingDirectory]);

  // Check which dates in the current week have files
  useEffect(() => {
    if (workingDirectory) {
      checkWeekFilesExist(weekDays);
    }
  }, [workingDirectory, selectedDate]);

  // Save planner file whenever schedule or checklist items change
  useEffect(() => {
    if (fileLoaded && (scheduleItems.length > 0 || checklistItems.length > 0)) {
      savePlannerFile();
    }
  }, [scheduleItems, checklistItems]);

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
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Week of {formatDateShort(weekDays[0])}</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <button onClick={goToPreviousWeek} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
              ← Prev
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded font-medium">
              Today
            </button>
            <div className="relative">
              <button onClick={() => setShowDatePicker(!showDatePicker)} className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded">
                Go to Date
              </button>
              {showDatePicker && (
                <div onBlur={handleDatePickerBlur} className="absolute top-full right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-10">
                  <input
                    type="date"
                    defaultValue={formatDateForInput(selectedDate)}
                    onChange={(e) => goToDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setShowDatePicker(false);
                      }
                    }}
                    autoFocus
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            <button onClick={goToNextWeek} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">
              Next →
            </button>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {weekDays.map((day, idx) => {
              const hasFile = datesWithFiles.has(getDateKey(day));
              return (
                <button key={idx} onClick={() => setSelectedDate(day)} className={`p-4 rounded-lg border-2 transition-all relative ${isSameDay(day, selectedDate) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                  <div className="text-xs text-gray-500 mb-1">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className={`text-lg font-semibold ${isSameDay(day, selectedDate) ? 'text-blue-600' : 'text-gray-800'}`}>{day.getDate()}</div>
                  {hasFile && <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" title="File exists"></div>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day Content */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">{formatDateFull(selectedDate)}</h2>

          {/* Show create file option if file doesn't exist */}
          {!fileLoaded ? (
            <div className="text-center py-12">
              <FileText size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No planner file found</h3>
              <p className="text-gray-500 mb-6">Create a new planner file for {formatDateFull(selectedDate)}</p>
              {loadError && <p className="text-sm text-red-500 mb-4">{loadError}</p>}
              <button onClick={() => createPlannerFile(selectedDate)} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto">
                <Plus size={20} />
                Create Planner File
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
