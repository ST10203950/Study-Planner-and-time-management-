import os
from flask import Flask, render_template, request, redirect, url_for, jsonify
from datetime import datetime, date
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
    note_content = request.form.get("note_content", "")
    note_format = request.form.get("note_format", "text")  # text, markdown, or rich
    
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
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M")
    active_reminders = []
    
    for task in tasks:
        if "reminders" in task:
            for reminder in task["reminders"]:
                if reminder.get("active") and reminder.get("time") <= current_time:
                    active_reminders.append({
                        "task_id": task["id"],
                        "task_title": task["title"],
                        "reminder_id": reminder["id"],
                        "reminder_time": reminder["time"],
                        "deadline": task["deadline"]
                    })
    
    return jsonify({"reminders": active_reminders})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
