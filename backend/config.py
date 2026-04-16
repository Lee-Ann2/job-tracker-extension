import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
EXCEL_FILE_PATH = BASE_DIR / "job_applications.xlsx"
USER_DATA_DIR = BASE_DIR / "user_data"
RESUME_PATH = os.getenv("RESUME_PATH", "")

PLATFORMS = {
    "linkedin": {
        "name": "LinkedIn",
        "apply_button": "//button[contains(@class, 'jobs-apply-button')]",
        "company_selector": "//a[contains(@class, 'jobs-company-name')]",
        "position_selector": "//h1[contains(@class, 'jobs-title')]"
    },
    "indeed": {
        "name": "Indeed",
        "apply_button": "//button[contains(@class, 'indeed-apply-button')]",
        "company_selector": "//div[contains(@class, 'company-name')]",
        "position_selector": "//h1[contains(@class, 'jobsearch-JobInfoHeader-title')]"
    },
    "glassdoor": {
        "name": "Glassdoor",
        "apply_button": "//button[contains(text(), 'Apply Now')]",
        "company_selector": "//div[contains(@class, 'employer-name')]",
        "position_selector": "//h1[contains(@class, 'job-title')]"
    }
}

STATUS_COLORS = {
    "Applied": "DCD0A8",
    "Interview": "4A9782",
    "Rejected": "E8B4B4",
    "Ignored": "E8D9A8",
    "Offer": "004030"
}

EXCEL_COLUMNS = [
    "Date Applied", "Company", "Position", "Platform",
    "Status", "Application URL", "Notes", "Last Updated"
]

FLASK_HOST = "localhost"
FLASK_PORT = 5000
FLASK_DEBUG = True