import os
from datetime import datetime
from openpyxl import Workbook, load_workbook
from openpyxl.styles import PatternFill, Font, Alignment

class JobTracker:
    def __init__(self, filename):
        self.filename = filename
        self.columns = [
            "Date Applied", "Company", "Position", "Platform",
            "Status", "Application URL", "Notes", "Last Updated"
        ]
        self.status_colors = {
            "Applied": "DCD0A8",
            "Interview": "4A9782",
            "Rejected": "E8B4B4",
            "Ignored": "E8D9A8",
            "Offer": "004030"
        }
        self._initialize_excel()
    
    def _initialize_excel(self):
        if not os.path.exists(self.filename):
            wb = Workbook()
            ws = wb.active
            ws.title = "Job Applications"
            
            for col, header in enumerate(self.columns, 1):
                ws.cell(row=1, column=col, value=header)
            
            self._apply_styling(wb)
            wb.save(self.filename)
    
    def _apply_styling(self, wb):
        ws = wb.active
        
        header_font = Font(bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="004030", end_color="004030", fill_type="solid")
        
        for col in range(1, len(self.columns) + 1):
            cell = ws.cell(row=1, column=col)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal="center")
        
        ws.column_dimensions['A'].width = 15
        ws.column_dimensions['B'].width = 25
        ws.column_dimensions['C'].width = 30
        ws.column_dimensions['D'].width = 12
        ws.column_dimensions['E'].width = 12
        ws.column_dimensions['F'].width = 50
        ws.column_dimensions['G'].width = 40
        ws.column_dimensions['H'].width = 15
        
        wb.save(self.filename)
    
    def add_application(self, company, position, platform, url, notes=""):
        wb = load_workbook(self.filename)
        ws = wb.active
        
        row_num = ws.max_row + 1
        
        ws.cell(row=row_num, column=1, value=datetime.now().strftime("%Y-%m-%d %H:%M"))
        ws.cell(row=row_num, column=2, value=company)
        ws.cell(row=row_num, column=3, value=position)
        ws.cell(row=row_num, column=4, value=platform)
        ws.cell(row=row_num, column=5, value="Applied")
        ws.cell(row=row_num, column=6, value=url)
        ws.cell(row=row_num, column=7, value=notes)
        ws.cell(row=row_num, column=8, value=datetime.now().strftime("%Y-%m-%d %H:%M"))
        
        self._update_status_color(wb, row_num, "Applied")
        wb.save(self.filename)
        
        return row_num - 2
    
    def update_status(self, row_index, status, notes=""):
        wb = load_workbook(self.filename)
        ws = wb.active
        row_num = row_index + 2
        
        if row_num <= ws.max_row:
            ws.cell(row=row_num, column=5, value=status)
            if notes:
                current_notes = ws.cell(row=row_num, column=7).value or ""
                ws.cell(row=row_num, column=7, value=f"{current_notes}\n{notes}".strip())
            ws.cell(row=row_num, column=8, value=datetime.now().strftime("%Y-%m-%d %H:%M"))
            
            self._update_status_color(wb, row_num, status)
            wb.save(self.filename)
            return True
        return False
    
    def _update_status_color(self, wb, row_num, status):
        ws = wb.active
        
        if status in self.status_colors:
            fill = PatternFill(start_color=self.status_colors[status],
                              end_color=self.status_colors[status],
                              fill_type="solid")
            
            for col in range(1, len(self.columns) + 1):
                ws.cell(row=row_num, column=col).fill = fill
        
        wb.save(self.filename)
    
    def get_statistics(self):
        wb = load_workbook(self.filename)
        ws = wb.active
        
        stats = {
            "Total": 0,
            "Applied": 0,
            "Interview": 0,
            "Rejected": 0,
            "Ignored": 0,
            "Offer": 0
        }
        
        for row in range(2, ws.max_row + 1):
            status = ws.cell(row=row, column=5).value
            stats["Total"] += 1
            if status in stats:
                stats[status] += 1
        
        return stats
    
    def get_all_applications(self):
        wb = load_workbook(self.filename)
        ws = wb.active
        
        applications = []
        for row in range(2, ws.max_row + 1):
            app = {}
            for col, header in enumerate(self.columns, 1):
                app[header] = ws.cell(row=row, column=col).value
            applications.append(app)
        
        return applications