import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from datetime import datetime, date, timedelta
import uuid

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev_secret_key")

# Define Jinja filters
@app.template_filter('to_date')
def to_date_filter(value):
    """Convert a string to a date object."""
    if isinstance(value, str):
        try:
            return datetime.strptime(value, '%Y-%m-%d').date()
        except ValueError:
            return date.today()
    return date.today()

# In-memory storage for tasks, timers, and categories
tasks = []
timers = {}
categories = [
    {"id": "academic", "name": "Academic", "color": "#007bff"},
    {"id": "personal", "name": "Personal", "color": "#28a745"},
    {"id": "social", "name": "Social", "color": "#dc3545"},
    {"id": "health", "name": "Health & Wellness", "color": "#6f42c1"},
    {"id": "career", "name": "Career", "color": "#fd7e14"}
]

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        title = request.form["title"]
        note = request.form.get("note", "")
        deadline = request.form["deadline"]
        priority = request.form["priority"]
        category_id = request.form.get("category", "academic")
        
        # Get the color from the category
        category_color = next((cat["color"] for cat in categories if cat["id"] == category_id), "#007bff")
        color = request.form.get("color", category_color)

        # Create a new task with unique ID (using timestamp)
        task_id = str(datetime.now().timestamp())
        task = {
            "id": task_id,
            "title": title,
            "note": note,
            "note_format": "text",  # Default format
            "deadline": deadline,
            "priority": priority,
            "category": category_id,
            "color": color,
            "completed": False,
            "completed_subtasks": 0,
            "subtasks": [],
            "reminders": [],
            "created": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "time_spent": 0  # Track time spent in seconds
        }
        tasks.append(task)
        return redirect(url_for("index"))

    # Calculate progress percentage
    progress = int((sum(1 for t in tasks if t["completed"]) / len(tasks)) * 100) if tasks else 0
    
    # Sort tasks by deadline and priority
    sorted_tasks = sorted(tasks, key=lambda x: (x["deadline"], {"High": 0, "Medium": 1, "Low": 2}[x["priority"]]))
    
    # Calculate stats by category
    category_stats = {}
    for cat in categories:
        cat_tasks = [t for t in tasks if t.get("category") == cat["id"]]
        total_tasks = len(cat_tasks)
        completed_tasks = sum(1 for t in cat_tasks if t["completed"])
        progress_percent = int((completed_tasks / total_tasks) * 100) if total_tasks > 0 else 0
        time_spent = sum(t.get("time_spent", 0) for t in cat_tasks)
        
        category_stats[cat["id"]] = {
            "name": cat["name"],
            "color": cat["color"],
            "total": total_tasks,
            "completed": completed_tasks,
            "progress": progress_percent,
            "time_spent": time_spent
        }
    
    # Calculate time distribution data for charts
    labels = []
    values = []
    colors = []
    
    # Populate time data if there are tasks with time spent
    for cat in categories:
        if category_stats[cat["id"]]["time_spent"] > 0:
            labels.append(cat["name"])
            values.append(category_stats[cat["id"]]["time_spent"])
            colors.append(cat["color"])
    
    time_data = {
        "labels": labels,
        "values": values,
        "colors": colors
    }
    
    # Add current datetime for Gantt chart
    current_datetime = datetime.now()
    
    return render_template("index.html", tasks=sorted_tasks, progress=progress, 
                           categories=categories, category_stats=category_stats,
                           time_data=time_data, now=current_datetime)

@app.route("/complete_task/<task_id>")
def complete_task(task_id):
    for task in tasks:
        if task["id"] == task_id:
            task["completed"] = not task["completed"]  # Toggle completed status
            break
    return redirect(url_for("index"))

@app.route("/delete_task/<task_id>")
def delete_task(task_id):
    global tasks
    tasks = [task for task in tasks if task["id"] != task_id]
    return redirect(url_for("index"))

@app.route("/update_timer/<task_id>", methods=["POST"])
def update_timer(task_id):
    data = request.get_json()
    seconds = data.get("seconds", 0)
    
    for task in tasks:
        if task["id"] == task_id:
            task["time_spent"] = seconds
            return jsonify({"status": "success"})
    
    return jsonify({"status": "error", "message": "Task not found"}), 404

@app.route("/add_subtask/<task_id>", methods=["POST"])
def add_subtask(task_id):
    """Add a subtask to a main task."""
    title = request.form.get("subtask_title")
    due_date = request.form.get("subtask_due_date")
    
    if not title:
        return redirect(url_for("index"))
    
    # Find the parent task
    for task in tasks:
        if task["id"] == task_id:
            # Initialize subtasks list if it doesn't exist
            if "subtasks" not in task:
                task["subtasks"] = []
                task["completed_subtasks"] = 0
                
            # Create the subtask
            subtask_id = str(uuid.uuid4())
            subtask = {
                "id": subtask_id,
                "title": title,
                "due_date": due_date,
                "completed": False,
                "created": datetime.now().strftime("%Y-%m-%d %H:%M")
            }
            
            task["subtasks"].append(subtask)
            break
            
    return redirect(url_for("index"))

@app.route("/complete_subtask/<task_id>/<subtask_id>")
def complete_subtask(task_id, subtask_id):
    """Mark a subtask as complete or incomplete."""
    for task in tasks:
        if task["id"] == task_id and "subtasks" in task:
            for subtask in task["subtasks"]:
                if subtask["id"] == subtask_id:
                    # Toggle completion status
                    subtask["completed"] = not subtask.get("completed", False)
                    
                    # Update completed subtasks count
                    task["completed_subtasks"] = sum(1 for s in task["subtasks"] if s.get("completed", False))
                    break
            break
            
    return redirect(url_for("index"))

@app.route("/delete_subtask/<task_id>/<subtask_id>")
def delete_subtask(task_id, subtask_id):
    """Delete a subtask from a main task."""
    for task in tasks:
        if task["id"] == task_id and "subtasks" in task:
            # Remove the subtask
            task["subtasks"] = [s for s in task["subtasks"] if s["id"] != subtask_id]
            
            # Update completed subtasks count
            task["completed_subtasks"] = sum(1 for s in task["subtasks"] if s.get("completed", False))
            break
            
    return redirect(url_for("index"))

@app.route("/save_note/<task_id>", methods=["POST"])
def save_note(task_id):
    """Save or update a task note with enhanced formatting."""
    data = request.get_json()
    note_content = data.get("note_content", "")
    note_format = data.get("note_format", "text")  # text, markdown, or rich
    
    for task in tasks:
        if task["id"] == task_id:
            task["note"] = note_content
            task["note_format"] = note_format
            
            # Create a note history if it doesn't exist
            if "note_history" not in task:
                task["note_history"] = []
                
            # Add the current note to history
            history_entry = {
                "content": note_content,
                "format": note_format,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
            
            task["note_history"].append(history_entry)
            
            # Limit history to last 10 entries
            if len(task["note_history"]) > 10:
                task["note_history"] = task["note_history"][-10:]
                
            return jsonify({"status": "success"})
    
    return jsonify({"status": "error", "message": "Task not found"}), 404

@app.route("/set_reminder/<task_id>", methods=["POST"])
def set_reminder(task_id):
    """Set a reminder for a task."""
    reminder_time = request.form.get("reminder_time")
    reminder_type = request.form.get("reminder_type", "deadline")  # deadline, start, custom
    
    for task in tasks:
        if task["id"] == task_id:
            if not "reminders" in task:
                task["reminders"] = []
                
            reminder = {
                "id": str(uuid.uuid4()),
                "time": reminder_time,
                "type": reminder_type,
                "active": True,
                "created": datetime.now().strftime("%Y-%m-%d %H:%M")
            }
            
            task["reminders"].append(reminder)
            return jsonify({"status": "success"})
            
    return jsonify({"status": "error", "message": "Task not found"}), 404

@app.route("/get_reminders", methods=["GET"])
def get_reminders():
    """Get all active reminders."""
    try:
        current_time = datetime.now().strftime("%Y-%m-%d %H:%M")
        active_reminders = []
        
        for task in tasks:
            if "reminders" in task and isinstance(task["reminders"], list):
                for reminder in task["reminders"]:
                    if (reminder.get("active") and 
                        reminder.get("time") and 
                        reminder.get("time") <= current_time):
                        active_reminders.append({
                            "task_id": task["id"],
                            "task_title": task["title"],
                            "reminder_id": reminder["id"],
                            "reminder_time": reminder["time"],
                            "deadline": task["deadline"]
                        })
        
        return jsonify({"reminders": active_reminders})
    except Exception as e:
        return jsonify({"reminders": [], "error": str(e)})

@app.route("/calendar_events", methods=["GET"])
def calendar_events():
    """Get calendar events for FullCalendar integration."""
    events = []
    
    for task in tasks:
        # Add task deadline as event
        events.append({
            "id": f"task-{task['id']}",
            "title": task["title"],
            "start": task["deadline"],
            "backgroundColor": task["color"],
            "borderColor": task["color"],
            "className": "task-event",
            "extendedProps": {
                "type": "task",
                "priority": task["priority"],
                "category": task["category"],
                "completed": task["completed"]
            }
        })
        
        # Add reminders as events
        if "reminders" in task:
            for reminder in task["reminders"]:
                if reminder.get("active"):
                    events.append({
                        "id": f"reminder-{reminder['id']}",
                        "title": f"Reminder: {task['title']}",
                        "start": reminder["time"],
                        "backgroundColor": "#ffc107",
                        "borderColor": "#ffc107",
                        "className": "reminder-event",
                        "extendedProps": {
                            "type": "reminder",
                            "taskId": task["id"]
                        }
                    })
    
    return jsonify(events)

@app.route("/time_analytics", methods=["GET"])
def time_analytics():
    """Get comprehensive time analytics data."""
    analytics = {
        "daily_time": {},
        "category_time": {},
        "productivity_trends": [],
        "total_study_time": 0
    }
    
    # Calculate category time distribution
    for cat in categories:
        cat_time = sum(t.get("time_spent", 0) for t in tasks if t.get("category") == cat["id"])
        analytics["category_time"][cat["name"]] = {
            "time": cat_time,
            "color": cat["color"],
            "percentage": 0
        }
        analytics["total_study_time"] += cat_time
    
    # Calculate percentages
    if analytics["total_study_time"] > 0:
        for cat_name in analytics["category_time"]:
            time_spent = analytics["category_time"][cat_name]["time"]
            analytics["category_time"][cat_name]["percentage"] = round(
                (time_spent / analytics["total_study_time"]) * 100, 1
            )
    
    # Generate productivity trends (last 7 days)
    for i in range(7):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_tasks = [t for t in tasks if t.get("created", "").startswith(date)]
        completed_tasks = sum(1 for t in daily_tasks if t.get("completed"))
        
        analytics["productivity_trends"].append({
            "date": date,
            "tasks_created": len(daily_tasks),
            "tasks_completed": completed_tasks,
            "completion_rate": round((completed_tasks / len(daily_tasks)) * 100, 1) if daily_tasks else 0
        })
    
    return jsonify(analytics)

@app.route("/achievement_data", methods=["GET"])
def achievement_data():
    """Get achievement and progress data for positive feedback."""
    achievements = {
        "streaks": {
            "current_streak": 0,
            "longest_streak": 0
        },
        "milestones": [],
        "recent_achievements": []
    }
    
    # Calculate completion streaks
    completed_tasks = [t for t in tasks if t.get("completed")]
    total_tasks = len(tasks)
    completion_rate = round((len(completed_tasks) / total_tasks) * 100, 1) if total_tasks > 0 else 0
    
    # Add milestones based on completion
    if completion_rate >= 25:
        achievements["milestones"].append({
            "title": "Getting Started",
            "description": "Completed 25% of tasks",
            "achieved": True,
            "icon": "🎯"
        })
    
    if completion_rate >= 50:
        achievements["milestones"].append({
            "title": "Halfway Hero",
            "description": "Completed 50% of tasks",
            "achieved": True,
            "icon": "🏆"
        })
    
    if completion_rate >= 75:
        achievements["milestones"].append({
            "title": "Almost There",
            "description": "Completed 75% of tasks",
            "achieved": True,
            "icon": "⭐"
        })
    
    if completion_rate >= 90:
        achievements["milestones"].append({
            "title": "Task Master",
            "description": "Completed 90% of tasks",
            "achieved": True,
            "icon": "👑"
        })
    
    # Recent achievements (last completed tasks)
    recent_completed = sorted(
        [t for t in tasks if t.get("completed")],
        key=lambda x: x.get("created", ""),
        reverse=True
    )[:3]
    
    for task in recent_completed:
        achievements["recent_achievements"].append({
            "title": f"Completed: {task['title']}",
            "category": task.get("category", "general"),
            "time": task.get("created", "")
        })
    
    return jsonify(achievements)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
