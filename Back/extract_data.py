# extract_data.py
import sys
import json
import cv2
from pyzbar import pyzbar
import requests
from bs4 import BeautifulSoup
import re

def extract_personal_data(image_path):
    image = cv2.imread(image_path)
    barcodes = pyzbar.decode(image)
    personal_data = {}

    for barcode in barcodes:
        barcode_data = barcode.data.decode("utf-8")
        try:
            response = requests.get(barcode_data)
            soup = BeautifulSoup(response.text, 'html.parser')
            student_data = soup.get_text(separator=' ', strip=True)

            patterns = {
                "student_name": r"Personal Data\s*(?:لم يحصل علي التطعيم\s*)?([\u0621-\u064A\s]+)\s*رقم الطالب",
                "student_number": r"رقم الطالب:\s*(\d+)",
                "college": r"الكلية:\s*(.*?)\s*\d{4}/",
                "year_level": r"(\d{4}/[A-Za-z]+)",
                "enrollment_status": r"حالة القيد:\s*([\u0621-\u064A]+)"
            }

            for key, pattern in patterns.items():
                match = re.search(pattern, student_data, re.UNICODE)
                if match:
                    personal_data[key] = match.group(1).strip()

            personal_data["url"] = barcode_data

        except Exception as e:
            personal_data["error"] = str(e)

    # 👇 Force stdout to be UTF-8 for Node.js compatibility
    sys.stdout.reconfigure(encoding='utf-8')  # ✅ Required in Python 3.7+
    print(json.dumps(personal_data, ensure_ascii=False))  # ✅ Do NOT escape Arabic chars

if __name__ == "__main__":
    image_path = sys.argv[1]
    extract_personal_data(image_path)

