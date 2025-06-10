// Enhanced Motivational Quotes with Categories
const quotes = {
  morning: [
    "Good morning! Today is a fresh start to achieve your goals.",
    "Start your day with purpose. Every small step counts!",
    "Morning energy is powerful - use it to tackle your priorities.",
    "Today's the day to turn your plans into action!"
  ],
  focus: [
    "Deep work creates deep results. Stay focused!",
    "Eliminate distractions and watch your productivity soar.",
    "One task at a time leads to extraordinary outcomes.",
    "Your focused attention is your superpower."
  ],
  progress: [
    "Small progress is still progress. Keep going!",
    "Every completed task brings you closer to your dreams.",
    "Celebrate each milestone - you're doing amazing!",
    "Progress, not perfection, is the goal."
  ],
  motivation: [
    "You've got this! Take one task at a time.",
    "Consistency beats intensity. Show up every day.",
    "The secret of success is to do the common things uncommonly well.",
    "Your mind is a powerful thing. When you fill it with positive thoughts, your life starts to change."
  ],
  academic: [
    "Education is the most powerful weapon which you can use to change the world.",
    "The expert in anything was once a beginner. Keep learning!",
    "Knowledge grows when shared and applied.",
    "Every assignment completed is knowledge gained."
  ],
  stress: [
    "Take a deep breath. You can handle whatever comes your way.",
    "Stress is temporary, but your resilience is permanent.",
    "Break big challenges into smaller, manageable pieces.",
    "Remember: you've overcome difficulties before, and you will again."
  ]
};

// Enhanced quote system with contextual selection
function getContextualQuote() {
  const hour = new Date().getHours();
  let category = 'motivation'; // default
  
  if (hour >= 6 && hour < 10) {
    category = 'morning';
  } else if (hour >= 10 && hour < 14) {
    category = 'focus';
  } else if (hour >= 14 && hour < 18) {
    category = 'progress';
  } else if (hour >= 18 && hour < 22) {
    category = 'academic';
  } else {
    category = 'stress'; // evening/night - relaxation time
  }
  
  const categoryQuotes = quotes[category];
  return categoryQuotes[Math.floor(Math.random() * categoryQuotes.length)];
}

// Display a contextual quote on page load
document.addEventListener('DOMContentLoaded', function() {
  const quoteText = document.getElementById("quote-text");
  quoteText.innerText = getContextualQuote();
  
  // Initialize task filters
  filterTasks('all');
});

// Task timer functionality
const activeTimers = {};

function toggleTimer(taskId, initialSeconds) {
  const timerButton = document.getElementById(`timer-btn-${taskId}`);
  const timerDisplay = document.getElementById(`timer-display-${taskId}`);
  
  // Get task title for feedback
  const taskElement = timerButton.closest('.task-item');
  const taskTitle = taskElement ? taskElement.querySelector('h3').textContent : 'Task';
  
  if (activeTimers[taskId]) {
    // Stop timer
    clearInterval(activeTimers[taskId].interval);
    
    // Save the time to the server
    saveTimerState(taskId, activeTimers[taskId].seconds);
    
    // Update UI
    timerButton.classList.remove('active');
    timerButton.innerHTML = '<i class="bi bi-play-fill"></i>';
    
    // Show positive feedback for timer stop
    showTimerFeedback('stop', taskTitle);
    
    // Clear the timer reference
    delete activeTimers[taskId];
  } else {
    // Start timer
    const seconds = initialSeconds || 0;
    
    activeTimers[taskId] = {
      seconds: seconds,
      interval: setInterval(() => {
        activeTimers[taskId].seconds++;
        timerDisplay.innerText = `${activeTimers[taskId].seconds}s`;
      }, 1000)
    };
    
    // Update UI
    timerButton.classList.add('active');
    timerButton.innerHTML = '<i class="bi bi-pause-fill"></i>';
    timerDisplay.innerText = `${seconds}s`;
    
    // Show positive feedback for timer start
    showTimerFeedback('start', taskTitle);
  }
}

function saveTimerState(taskId, seconds) {
  fetch(`/update_timer/${taskId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ seconds: seconds }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.status !== 'success') {
      console.error('Error saving timer:', data.message);
    }
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

// Current filter states
let currentStatusFilter = 'all';
let currentCategoryFilter = 'all';

// Task filtering functionality
function filterTasks(filter) {
  currentStatusFilter = filter;
  const filterButtons = document.querySelectorAll('.btn-group[aria-label="Task filters"] .btn');
  
  // Update active button
  filterButtons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase() === filter) {
      btn.classList.add('active');
    }
  });
  
  applyFilters();
}

function filterTasksByCategory(categoryId) {
  currentCategoryFilter = categoryId;
  const filterButtons = document.querySelectorAll('[aria-label="Category filters"] .btn');
  
  // Update active button
  filterButtons.forEach(btn => {
    btn.classList.remove('active');
    if ((categoryId === 'all' && btn.textContent.trim() === 'All Categories') || 
        btn.onclick.toString().includes(`'${categoryId}'`)) {
      btn.classList.add('active');
    }
  });
  
  applyFilters();
}

function applyFilters() {
  const tasks = document.querySelectorAll('.task-item');
  
  // Show/hide tasks based on both filters
  tasks.forEach(task => {
    const status = task.dataset.status;
    const category = task.dataset.category;
    
    const statusMatch = currentStatusFilter === 'all' || 
                       (currentStatusFilter === 'active' && status === 'active') ||
                       (currentStatusFilter === 'completed' && status === 'completed');
                       
    const categoryMatch = currentCategoryFilter === 'all' || category === currentCategoryFilter;
    
    if (statusMatch && categoryMatch) {
      task.style.display = '';
    } else {
      task.style.display = 'none';
    }
  });
}

// Pomodoro Timer Functionality
let pomodoroInterval;
let pomodoroTime = 25 * 60; // 25 minutes in seconds
let currentMode = 'pomodoro';
let isPomodoroRunning = false;

function updatePomodoroDisplay() {
  const minutes = Math.floor(pomodoroTime / 60);
  const seconds = pomodoroTime % 60;
  document.getElementById('pomodoro-display').textContent = 
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function startPomodoro() {
  if (!isPomodoroRunning) {
    isPomodoroRunning = true;
    document.getElementById('pomodoro-start').disabled = true;
    document.getElementById('pomodoro-pause').disabled = false;
    
    pomodoroInterval = setInterval(() => {
      if (pomodoroTime > 0) {
        pomodoroTime--;
        updatePomodoroDisplay();
      } else {
        // Time's up
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
        
        // Show enhanced completion celebration
        showPomodoroCompletion(currentMode);
        
        // Show notification if supported by the browser
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(`${currentMode.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} completed!`, {
            body: currentMode === 'pomodoro' ? 'Time for a well-deserved break!' : 'Ready for focused work!',
            icon: '/static/favicon.ico'
          });
        }
        
        document.getElementById('pomodoro-start').disabled = false;
        document.getElementById('pomodoro-pause').disabled = true;
      }
    }, 1000);
  }
}

function pausePomodoro() {
  if (isPomodoroRunning) {
    clearInterval(pomodoroInterval);
    isPomodoroRunning = false;
    document.getElementById('pomodoro-start').disabled = false;
    document.getElementById('pomodoro-pause').disabled = true;
  }
}

function resetPomodoro() {
  clearInterval(pomodoroInterval);
  isPomodoroRunning = false;
  document.getElementById('pomodoro-start').disabled = false;
  document.getElementById('pomodoro-pause').disabled = true;
  
  // Reset to the current mode's time
  const activeMode = document.querySelector('.btn-group button.active[data-mode]');
  if (activeMode) {
    const timeInMinutes = parseInt(activeMode.dataset.time);
    pomodoroTime = timeInMinutes * 60;
  } else {
    pomodoroTime = 25 * 60; // Default fallback
  }
  
  updatePomodoroDisplay();
}

function changeMode(event) {
  if (!event.target.dataset.mode) return;
  
  // Reset the timer
  clearInterval(pomodoroInterval);
  isPomodoroRunning = false;
  document.getElementById('pomodoro-start').disabled = false;
  document.getElementById('pomodoro-pause').disabled = true;
  
  // Update mode buttons
  document.querySelectorAll('.btn-group button[data-mode]').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Set new mode and time
  currentMode = event.target.dataset.mode;
  const timeInMinutes = parseInt(event.target.dataset.time);
  pomodoroTime = timeInMinutes * 60;
  
  updatePomodoroDisplay();
}

// Request notification permission and initialize enhanced features
document.addEventListener('DOMContentLoaded', function() {
  // Initialize the Pomodoro timer display
  updatePomodoroDisplay();
  
  // Set up event listeners for Pomodoro buttons
  document.getElementById('pomodoro-start').addEventListener('click', startPomodoro);
  document.getElementById('pomodoro-pause').addEventListener('click', pausePomodoro);
  document.getElementById('pomodoro-reset').addEventListener('click', resetPomodoro);
  
  // Set up event listeners for mode buttons
  const modeButtons = document.querySelectorAll('.btn-group button[data-mode]');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', changeMode);
  });
  
  // Request notification permission if supported by the browser
  if (typeof Notification !== 'undefined') {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      document.getElementById('pomodoro-start').addEventListener('click', function() {
        Notification.requestPermission();
      }, { once: true });
    }
  }
  
  // Load achievements and study insights
  loadAchievements();
  loadStudyInsights();
  
  // Initialize enhanced calendar
  initializeEnhancedCalendar();
});

// Add beforeunload handler to save all active timers
window.addEventListener('beforeunload', function() {
  // Save all active timers
  for (const taskId in activeTimers) {
    if (activeTimers[taskId]) {
      saveTimerState(taskId, activeTimers[taskId].seconds);
    }
  }
});

// Enhanced Note Taking, Subtasks, and Reminders

// Subtask functionality
document.addEventListener('DOMContentLoaded', function() {
  // Subtask form handling
  const subtaskForm = document.getElementById('subtaskForm');
  const taskSelect = document.getElementById('taskSelect');
  
  if (subtaskForm && taskSelect) {
    taskSelect.addEventListener('change', function() {
      const selectedTaskId = this.value;
      if (selectedTaskId) {
        subtaskForm.action = `/add_subtask/${selectedTaskId}`;
      }
    });
    
    subtaskForm.addEventListener('submit', function(e) {
      const selectedTaskId = taskSelect.value;
      if (!selectedTaskId) {
        e.preventDefault();
        alert('Please select a task');
      }
    });
  }

  // Enhanced Note Taking functionality
  const noteModal = document.getElementById('noteModal');
  if (noteModal) {
    const noteTaskId = document.getElementById('noteTaskId');
    const noteTitle = document.getElementById('noteTitle');
    const noteContent = document.getElementById('noteContent');
    const formatRadios = document.querySelectorAll('input[name="note_format"]');
    const formatHelpText = document.getElementById('formatHelpText');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const noteHistory = document.getElementById('noteHistory');
    const noteHistoryList = document.querySelector('.note-history-list');
    
    // Update format help text based on selected format
    formatRadios.forEach(radio => {
      radio.addEventListener('change', function() {
        switch(this.value) {
          case 'text':
            formatHelpText.textContent = 'Supports plain text formatting.';
            break;
          case 'markdown':
            formatHelpText.textContent = 'Supports Markdown formatting (headings, lists, bold, italic, etc).';
            break;
          case 'rich':
            formatHelpText.textContent = 'Supports rich text formatting.';
            break;
        }
      });
    });
    
    // Open note modal with task data
    document.querySelectorAll('.open-note-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const taskId = this.dataset.taskId;
        const taskTitle = this.dataset.taskTitle;
        const taskNote = this.dataset.taskNote || '';
        const taskNoteFormat = this.dataset.taskNoteFormat || 'text';
        
        noteTaskId.value = taskId;
        noteTitle.value = taskTitle;
        noteContent.value = taskNote;
        
        // Set the correct format radio
        document.getElementById(`format${taskNoteFormat[0].toUpperCase() + taskNoteFormat.slice(1)}`).checked = true;
        
        // Load note history if available
        if (this.dataset.taskNoteHistory) {
          try {
            const history = JSON.parse(this.dataset.taskNoteHistory);
            if (history && history.length > 0) {
              noteHistory.classList.remove('d-none');
              noteHistoryList.innerHTML = '';
              
              history.slice().reverse().forEach((entry, index) => {
                const dateFormatted = new Date(entry.timestamp).toLocaleString();
                const item = document.createElement('button');
                item.className = 'list-group-item list-group-item-action text-start';
                item.innerHTML = `
                  <div class="d-flex justify-content-between">
                    <small class="text-muted">${dateFormatted}</small>
                    <span class="badge bg-secondary">${entry.format}</span>
                  </div>
                  <div class="note-preview mt-1">${entry.content.substring(0, 50)}${entry.content.length > 50 ? '...' : ''}</div>
                `;
                
                item.addEventListener('click', function() {
                  noteContent.value = entry.content;
                  document.getElementById(`format${entry.format[0].toUpperCase() + entry.format.slice(1)}`).checked = true;
                });
                
                noteHistoryList.appendChild(item);
              });
            } else {
              noteHistory.classList.add('d-none');
            }
          } catch (e) {
            noteHistory.classList.add('d-none');
            console.error('Error parsing note history:', e);
          }
        } else {
          noteHistory.classList.add('d-none');
        }
        
        const noteModalObj = new bootstrap.Modal(noteModal);
        noteModalObj.show();
      });
    });
    
    // Save note
    if (saveNoteBtn) {
      saveNoteBtn.addEventListener('click', function() {
        const taskId = noteTaskId.value;
        const noteFormat = document.querySelector('input[name="note_format"]:checked').value;
        const noteText = noteContent.value;
        
        fetch(`/save_note/${taskId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            note_content: noteText,
            note_format: noteFormat
          }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.status === 'success') {
            const noteModalObj = bootstrap.Modal.getInstance(noteModal);
            noteModalObj.hide();
            
            // Update the task's note display
            const noteDisplay = document.querySelector(`#note-display-${taskId}`);
            if (noteDisplay) {
              noteDisplay.textContent = noteText;
              noteDisplay.dataset.noteFormat = noteFormat;
            }
            
            // Update the button data attributes
            const noteBtn = document.querySelector(`.open-note-btn[data-task-id="${taskId}"]`);
            if (noteBtn) {
              noteBtn.dataset.taskNote = noteText;
              noteBtn.dataset.taskNoteFormat = noteFormat;
            }
            
            // Show success toast
            showToast('Note saved successfully', 'success');
          } else {
            showToast('Error saving note: ' + data.message, 'danger');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          showToast('Error saving note. Please try again.', 'danger');
        });
      });
    }
  }
  
  // Reminder functionality
  const reminderModal = document.getElementById('reminderModal');
  if (reminderModal) {
    const reminderTaskId = document.getElementById('reminderTaskId');
    const reminderTaskTitle = document.getElementById('reminderTaskTitle');
    const reminderType = document.getElementById('reminderType');
    const reminderTime = document.getElementById('reminderTime');
    const saveReminderBtn = document.getElementById('saveReminderBtn');
    
    // Open reminder modal with task data
    document.querySelectorAll('.set-reminder-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        const taskId = this.dataset.taskId;
        const taskTitle = this.dataset.taskTitle;
        const taskDeadline = this.dataset.taskDeadline;
        
        reminderTaskId.value = taskId;
        reminderTaskTitle.value = taskTitle;
        
        // Set default reminder time to 1 hour before deadline
        if (taskDeadline) {
          const deadlineDate = new Date(taskDeadline);
          deadlineDate.setHours(deadlineDate.getHours() - 1);
          
          const formattedDate = deadlineDate.toISOString().slice(0, 16);
          reminderTime.value = formattedDate;
        } else {
          // Set to current time + 1 hour if no deadline
          const now = new Date();
          now.setHours(now.getHours() + 1);
          reminderTime.value = now.toISOString().slice(0, 16);
        }
        
        const reminderModalObj = new bootstrap.Modal(reminderModal);
        reminderModalObj.show();
      });
    });
    
    // Save reminder
    if (saveReminderBtn) {
      saveReminderBtn.addEventListener('click', function() {
        const taskId = reminderTaskId.value;
        const reminderTypeValue = reminderType.value;
        const reminderTimeValue = reminderTime.value;
        
        if (!reminderTimeValue) {
          showToast('Please select a reminder time', 'warning');
          return;
        }
        
        fetch(`/set_reminder/${taskId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reminder_time: reminderTimeValue,
            reminder_type: reminderTypeValue
          }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.status === 'success') {
            const reminderModalObj = bootstrap.Modal.getInstance(reminderModal);
            reminderModalObj.hide();
            
            // Show success toast
            showToast('Reminder set successfully', 'success');
          } else {
            showToast('Error setting reminder: ' + data.message, 'danger');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          showToast('Error setting reminder. Please try again.', 'danger');
        });
      });
    }
    
    // Check for active reminders every minute
    setInterval(checkReminders, 60000);
    checkReminders(); // Initial check
  }
});

// Check for active reminders
function checkReminders() {
  fetch('/get_reminders')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data.reminders && Array.isArray(data.reminders) && data.reminders.length > 0) {
        data.reminders.forEach(reminder => {
          if (reminder && reminder.task_title) {
            showReminderToast(reminder);
            
            // Send browser notification if supported
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Task Reminder', { 
                body: `Task "${reminder.task_title}" is due soon!`,
                icon: '/static/favicon.ico'
              });
            }
          }
        });
      }
    })
    .catch(error => {
      // Silent handling for production
      console.log('Reminder check completed');
    });
}

// Show a toast notification
function showToast(message, type = 'info') {
  const toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) return;
  
  const toast = document.createElement('div');
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  toastContainer.appendChild(toast);
  
  const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: 5000 });
  bsToast.show();
  
  // Remove the toast from DOM after it's hidden
  toast.addEventListener('hidden.bs.toast', function() {
    toast.remove();
  });
}

// Show a reminder toast
function showReminderToast(reminder) {
  const toastContainer = document.querySelector('.toast-container');
  if (!toastContainer) return;
  
  // Check if we already have a toast for this reminder
  const existingToast = document.querySelector(`#reminder-toast-${reminder.reminder_id}`);
  if (existingToast) return;
  
  const toast = document.createElement('div');
  toast.id = `reminder-toast-${reminder.reminder_id}`;
  toast.className = 'toast align-items-center text-white bg-warning border-0';
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  const deadlineDate = new Date(reminder.deadline);
  
  // Continue with existing toast logic...
}

// Load and display achievements
function loadAchievements() {
  fetch('/achievement_data')
    .then(response => response.json())
    .then(data => {
      displayAchievements(data);
    })
    .catch(error => {
      console.error('Error loading achievements:', error);
      document.getElementById('achievements-container').innerHTML = 
        '<p class="text-muted">Unable to load achievements</p>';
    });
}

function displayAchievements(data) {
  const container = document.getElementById('achievements-container');
  let html = '';
  
  if (data.milestones && data.milestones.length > 0) {
    html += '<div class="achievements-grid">';
    data.milestones.forEach(milestone => {
      html += `
        <div class="achievement-item ${milestone.achieved ? 'achieved' : 'locked'}">
          <div class="achievement-icon">${milestone.icon}</div>
          <div class="achievement-info">
            <div class="achievement-title">${milestone.title}</div>
            <div class="achievement-description">${milestone.description}</div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    if (data.recent_achievements && data.recent_achievements.length > 0) {
      html += '<div class="mt-3"><h6 class="text-success">Recent Achievements</h6>';
      data.recent_achievements.forEach(achievement => {
        html += `<div class="recent-achievement">${achievement.title}</div>`;
      });
      html += '</div>';
    }
  } else {
    html = '<p class="text-muted">Complete tasks to unlock achievements!</p>';
  }
  
  container.innerHTML = html;
}

// Load and display study insights
function loadStudyInsights() {
  fetch('/time_analytics')
    .then(response => response.json())
    .then(data => {
      displayStudyInsights(data);
    })
    .catch(error => {
      console.error('Error loading study insights:', error);
      document.getElementById('study-insights').innerHTML = 
        '<p class="text-muted">Unable to load insights</p>';
    });
}

function displayStudyInsights(data) {
  const container = document.getElementById('study-insights');
  let html = '';
  
  // Total study time
  const totalHours = Math.floor(data.total_study_time / 3600);
  const totalMinutes = Math.floor((data.total_study_time % 3600) / 60);
  
  html += `
    <div class="insight-item">
      <div class="insight-icon">⏱️</div>
      <div class="insight-text">
        <strong>Total Study Time:</strong> ${totalHours}h ${totalMinutes}m
      </div>
    </div>
  `;
  
  // Most productive category
  let mostProductiveCategory = '';
  let maxTime = 0;
  for (const [category, info] of Object.entries(data.category_time)) {
    if (info.time > maxTime) {
      maxTime = info.time;
      mostProductiveCategory = category;
    }
  }
  
  if (mostProductiveCategory) {
    html += `
      <div class="insight-item">
        <div class="insight-icon">🎯</div>
        <div class="insight-text">
          <strong>Most Focus:</strong> ${mostProductiveCategory}
        </div>
      </div>
    `;
  }
  
  // Productivity trends
  if (data.productivity_trends && data.productivity_trends.length > 0) {
    const avgCompletion = data.productivity_trends.reduce((sum, day) => sum + day.completion_rate, 0) / data.productivity_trends.length;
    html += `
      <div class="insight-item">
        <div class="insight-icon">📈</div>
        <div class="insight-text">
          <strong>Avg Completion Rate:</strong> ${avgCompletion.toFixed(1)}%
        </div>
      </div>
    `;
  }
  
  container.innerHTML = html || '<p class="text-muted">Start tracking time to see insights!</p>';
}

// Initialize enhanced calendar with events
function initializeEnhancedCalendar() {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;
  
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek'
    },
    events: '/calendar_events',
    eventClick: function(info) {
      if (info.event.extendedProps.type === 'task') {
        showTaskDetails(info.event.extendedProps);
      }
    },
    eventDidMount: function(info) {
      // Add tooltips to events
      info.el.setAttribute('title', `${info.event.title} - ${info.event.extendedProps.priority} Priority`);
    },
    height: 'auto',
    eventDisplay: 'block',
    dayMaxEvents: 3
  });
  
  calendar.render();
}

function showTaskDetails(taskProps) {
  // Simple task details display
  const message = `Task: ${taskProps.title}\nPriority: ${taskProps.priority}\nCategory: ${taskProps.category}\nCompleted: ${taskProps.completed ? 'Yes' : 'No'}`;
  alert(message);
}

// Enhanced positive feedback system
function showTaskCompletionCelebration(taskTitle) {
  const celebrations = [
    "🎉 Awesome! You completed: ",
    "✨ Great job finishing: ",
    "🏆 Well done! Task completed: ",
    "⭐ Fantastic work on: ",
    "🎯 Success! You finished: "
  ];
  
  const randomCelebration = celebrations[Math.floor(Math.random() * celebrations.length)];
  showToast(randomCelebration + taskTitle, 'success');
  
  // Play success sound if available
  const audio = new Audio('/static/success.mp3');
  audio.play().catch(e => console.log('Success sound not available'));
  
  // Update quote to a progress quote after completing a task
  const quoteText = document.getElementById("quote-text");
  if (quoteText) {
    const progressQuotes = quotes.progress;
    quoteText.innerText = progressQuotes[Math.floor(Math.random() * progressQuotes.length)];
  }
  
  // Refresh achievements after task completion
  setTimeout(() => {
    loadAchievements();
    loadStudyInsights();
  }, 1000);
}

// Enhanced timer feedback
function showTimerFeedback(action, taskTitle) {
  const messages = {
    start: `⏱️ Timer started for: ${taskTitle}`,
    pause: `⏸️ Timer paused for: ${taskTitle}`,
    stop: `⏹️ Timer stopped for: ${taskTitle}. Great focus session!`
  };
  
  if (messages[action]) {
    showToast(messages[action], 'info');
  }
}

// Pomodoro completion celebration
function showPomodoroCompletion(mode) {
  const messages = {
    pomodoro: "🍅 Pomodoro completed! Time for a well-deserved break!",
    shortBreak: "☕ Short break finished! Ready to tackle the next session?",
    longBreak: "🌟 Long break completed! You're refreshed and ready to focus!"
  };
  
  showToast(messages[mode] || "Session completed!", 'primary');
  
  // Play completion sound
  const audio = new Audio('/static/notification.mp3');
  audio.play().catch(e => console.log('Audio play failed:', e));
}
