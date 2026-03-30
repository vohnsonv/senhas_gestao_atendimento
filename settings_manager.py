import json
import os

import sys

def get_base_path():
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))

SETTINGS_FILE = os.path.join(get_base_path(), 'settings.json')

DEFAULT_SETTINGS = {
    "printer_name": "",
    "printer_type": "matricial", # "matricial" or "zebra"
    "left_margin": 6,
    "line_spacing": 30,
    "advance_paper_lines": 4,
    "font_quality": 1,  # 0: Draft, 1: NLQ
    "queue_mode": "alternating" # alternating or sequential
}

def load_settings():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r') as f:
                settings = json.load(f)
                # Merge with defaults to ensure all keys exist
                return {**DEFAULT_SETTINGS, **settings}
        except Exception as e:
            print(f"Error loading settings: {e}")
    return DEFAULT_SETTINGS.copy()

def save_settings(settings):
    try:
        with open(SETTINGS_FILE, 'w') as f:
            json.dump(settings, f, indent=4)
    except Exception as e:
        print(f"Error saving settings: {e}")
