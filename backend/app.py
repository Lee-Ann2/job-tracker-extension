from flask import Flask, request, jsonify
from flask_cors import CORS
from excel_manager import ExcelManager
from auto_applier import AutoApplier
import json

app = Flask(__name__)
CORS(app)

excel_manager = ExcelManager()
auto_applier = AutoApplier()

@app.route('/api/add_application', methods=['POST'])
def add_application():
    data = request.json
    row_index = excel_manager.add_application(
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
    success = excel_manager.update_status(
        row_index=data['row_index'],
        status=data['status'],
        notes=data.get('notes', '')
    )
    return jsonify({"success": success})

@app.route('/api/auto_apply', methods=['POST'])
def auto_apply():
    data = request.json
    job_url = data['url']
    platform = data['platform']
    resume_path = data.get('resume_path', '')
    
    if platform == 'linkedin':
        result = auto_applier.apply_linkedin(job_url, resume_path)
    elif platform == 'indeed':
        result = auto_applier.apply_indeed(job_url, resume_path)
    elif platform == 'glassdoor':
        result = auto_applier.apply_glassdoor(job_url, resume_path)
    else:
        result = {"success": False, "message": "Unsupported platform"}
    
    return jsonify(result)

@app.route('/api/extract_job_details', methods=['POST'])
def extract_job_details():
    data = request.json
    url = data['url']
    details = auto_applier.extract_job_details(url)
    return jsonify(details)

@app.route('/api/get_statistics', methods=['GET'])
def get_statistics():
    stats = excel_manager.get_statistics()
    return jsonify(stats)

@app.route('/api/get_applications', methods=['GET'])
def get_applications():
    import pandas as pd
    df = pd.read_excel(excel_manager.filename)
    return jsonify(df.to_dict('records'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)