"""
Configuration file for Instagram Clone application
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration"""
    # Database configuration
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'instagram_clone')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    
    # Flask configuration
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # Gemini API configuration
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')

