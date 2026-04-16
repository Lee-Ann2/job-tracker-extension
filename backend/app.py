from flask import Flask, request, jsonify
from flask_cors import CORS
from job_tracker import JobTracker
import os

app = Flask(__name__)
CORS(app)

job_tracker = JobTracker("job_applications.xlsx")

@app.route('/api/add_application', methods=['POST'])
def add_application():
    data = request.json
    row_index = job_tracker.add_application(
        company=data['company'],
        position=data['position'],
        platform=data['platform'],
        url=data['url'],
        notes=data.get('notes', '')
    )
    return jsonify({"success": True, "row_index": row_index})

@app.route('/api/update_status', methods=['POST'])
def update_status():
    data = request.json
    success = job_tracker.update_status(
        row_index=data['row_index'],
        status=data['status'],
        notes=data.get('notes', '')
    )
    return jsonify({"success": success})

@app.route('/api/get_statistics', methods=['GET'])
def get_statistics():
    stats = job_tracker.get_statistics()
    return jsonify(stats)

@app.route('/api/get_applications', methods=['GET'])
def get_applications():
    applications = job_tracker.get_all_applications()
    return jsonify(applications)

@app.route('/api/extract_job_details', methods=['POST'])
def extract_job_details():
    data = request.json
    url = data.get('url', '')
    details = {"company": "", "position": "", "platform": "unknown"}
    
    if "linkedin.com" in url:
        details["platform"] = "linkedin"
    elif "indeed.com" in url:
        details["platform"] = "indeed"
    elif "glassdoor.com" in url:
        details["platform"] = "glassdoor"
    
    return jsonify(details)

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        "message": "Job Tracker Pro API is running",
        "status": "active",
        "endpoints": [
            "/api/add_application",
            "/api/update_status",
            "/api/get_statistics",
            "/api/get_applications"
        ]
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)