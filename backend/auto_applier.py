from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import time
import json
import os

class AutoApplier:
    def __init__(self, driver_path=None):
        self.driver = None
        self.wait = None
        self.setup_driver()
    
    def setup_driver(self):
        """Setup Chrome driver"""
        options = webdriver.ChromeOptions()
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        if os.path.exists("user_data"):
            options.add_argument(f"user-data-dir={os.path.abspath('user_data')}")
        
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 10)
    
    def apply_linkedin(self, job_url, resume_path):
        """Auto apply to LinkedIn job"""
        try:
            self.driver.get(job_url)
            time.sleep(2)
            
            try:
                easy_apply_btn = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'jobs-apply-button')]"))
                )
                easy_apply_btn.click()
                time.sleep(1)
                
                while True:
                    try:
                        next_btn = self.driver.find_element(By.XPATH, "//button[@aria-label='Continue to next step']")
                        next_btn.click()
                        time.sleep(1)
                    except NoSuchElementException:
                        try:
                            submit_btn = self.driver.find_element(By.XPATH, "//button[@aria-label='Submit application']")
                            submit_btn.click()
                            break
                        except NoSuchElementException:
                            break
                
                return {"success": True, "message": "Application submitted successfully"}
                
            except TimeoutException:
                return {"success": False, "message": "Easy Apply not available for this job"}
                
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def apply_indeed(self, job_url, resume_path):
        """Auto apply to Indeed job"""
        try:
            self.driver.get(job_url)
            time.sleep(2)
            
            try:
                apply_btn = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(@class, 'indeed-apply-button')]"))
                )
                apply_btn.click()
                time.sleep(2)
                
                resume_input = self.wait.until(
                    EC.presence_of_element_located((By.XPATH, "//input[@type='file']"))
                )
                resume_input.send_keys(resume_path)
                time.sleep(1)
                
                submit_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Submit')]")
                submit_btn.click()
                
                return {"success": True, "message": "Application submitted successfully"}
                
            except TimeoutException:
                return {"success": False, "message": "Apply button not found"}
                
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def apply_glassdoor(self, job_url, resume_path):
        """Auto apply to Glassdoor job"""
        try:
            self.driver.get(job_url)
            time.sleep(2)
            
            try:
                apply_btn = self.wait.until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Apply Now')]"))
                )
                apply_btn.click()
                time.sleep(2)
                
                iframes = self.driver.find_elements(By.TAG_NAME, "iframe")
                for iframe in iframes:
                    if "apply" in iframe.get_attribute("src").lower():
                        self.driver.switch_to.frame(iframe)
                        break
                
                resume_input = self.wait.until(
                    EC.presence_of_element_located((By.XPATH, "//input[@type='file']"))
                )
                resume_input.send_keys(resume_path)
                time.sleep(1)
                
                submit_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Submit')]")
                submit_btn.click()
                
                return {"success": True, "message": "Application submitted successfully"}
                
            except TimeoutException:
                return {"success": False, "message": "Apply button not found"}
                
        except Exception as e:
            return {"success": False, "message": str(e)}
    
    def extract_job_details(self, url):
        """Extract job details from the page"""
        try:
            self.driver.get(url)
            time.sleep(2)
            
            details = {}
            
            if "linkedin.com" in url:
                try:
                    details["company"] = self.driver.find_element(By.XPATH, "//a[contains(@class, 'jobs-company-name')]").text
                    details["position"] = self.driver.find_element(By.XPATH, "//h1[contains(@class, 'jobs-title')]").text
                except:
                    pass
            
            elif "indeed.com" in url:
                try:
                    details["company"] = self.driver.find_element(By.XPATH, "//div[contains(@class, 'company-name')]").text
                    details["position"] = self.driver.find_element(By.XPATH, "//h1[contains(@class, 'jobsearch-JobInfoHeader-title')]").text
                except:
                    pass
            
            elif "glassdoor.com" in url:
                try:
                    details["company"] = self.driver.find_element(By.XPATH, "//div[contains(@class, 'employer-name')]").text
                    details["position"] = self.driver.find_element(By.XPATH, "//h1[contains(@class, 'job-title')]").text
                except:
                    pass
            
            return details
            
        except Exception as e:
            return {"error": str(e)}
    
    def close(self):
        """Close the driver"""
        if self.driver:
            self.driver.quit()