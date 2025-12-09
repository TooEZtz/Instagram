"""
Initialize the Instagram Clone database with schema
Run this script to create the database and all tables
"""
import mysql.connector
from mysql.connector import Error
from config import Config

def read_sql_file(file_path):
    """Read SQL file content"""
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()

def execute_sql_file(connection, sql_content):
    """Execute SQL file content"""
    cursor = connection.cursor()
    
    # Split by semicolon and execute each statement
    statements = sql_content.split(';')
    
    for statement in statements:
        statement = statement.strip()
        if statement:
            try:
                cursor.execute(statement)
                print(f"Executed: {statement[:50]}...")
            except Error as e:
                print(f"Error executing statement: {e}")
                print(f"Statement: {statement[:100]}...")
    
    connection.commit()
    cursor.close()

def init_database():
    """Initialize database and create schema"""
    connection = None
    
    try:
        # First, connect without database to create it if it doesn't exist
        connection = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            port=Config.DB_PORT
        )
        
        if connection.is_connected():
            cursor = connection.cursor()
            
            # Create database if it doesn't exist
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {Config.DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            print(f"Database '{Config.DB_NAME}' created or already exists")
            
            cursor.close()
            connection.close()
            
            # Now connect to the specific database
            connection = mysql.connector.connect(
                host=Config.DB_HOST,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME,
                port=Config.DB_PORT
            )
            
            if connection.is_connected():
                print(f"Connected to database '{Config.DB_NAME}'")
                
                # Read and execute SQL schema
                sql_content = read_sql_file('schema.sql')
                execute_sql_file(connection, sql_content)
                
                print("\nDatabase initialization completed successfully!")
                
    except Error as e:
        print(f"Error initializing database: {e}")
        
    finally:
        if connection and connection.is_connected():
            connection.close()
            print("Database connection closed")

if __name__ == "__main__":
    print("Initializing Instagram Clone Database...")
    print("=" * 50)
    init_database()

