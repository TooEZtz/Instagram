"""
Database connection and utility functions
"""
import mysql.connector
from mysql.connector import Error
from config import Config

class Database:
    """Database connection handler (fresh connection per query)."""
    
    def __init__(self):
        self._connection_logged = False

    def _new_connection(self):
        """Create and return a new MySQL connection."""
        conn = mysql.connector.connect(
            host=Config.DB_HOST,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            port=Config.DB_PORT,
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci',
            autocommit=True,
            connection_timeout=10,
            raise_on_warnings=False
        )
        if not self._connection_logged:
            print(f"Successfully connected to MySQL database '{Config.DB_NAME}'")
            self._connection_logged = True
        return conn
    
    def execute_query(self, query, params=None):
        """Execute a query with a fresh connection each time."""
        conn = None
        cursor = None
        try:
            conn = self._new_connection()
            cursor = conn.cursor(dictionary=True, buffered=False)
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            if query.strip().upper().startswith('SELECT'):
                rows = cursor.fetchall()
                return [dict(row) for row in rows] if rows else []
            else:
                return cursor.rowcount
        except Exception as e:
            print(f"Error executing query: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    def execute_many(self, query, params_list):
        """Execute a query multiple times with different parameters (fresh connection)."""
        conn = None
        cursor = None
        try:
            conn = self._new_connection()
            cursor = conn.cursor(dictionary=True, buffered=False)
            cursor.executemany(query, params_list)
            return cursor.rowcount
        except Exception as e:
            print(f"Error executing batch query: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            if cursor:
                try:
                    cursor.close()
                except:
                    pass
            if conn:
                try:
                    conn.close()
                except:
                    pass
    
    def get_connection(self):
        """For compatibility; returns a new connection."""
        return self._new_connection()
    
    def get_cursor(self):
        """For compatibility; returns a cursor on a new connection."""
        conn = self._new_connection()
        return conn.cursor(dictionary=True, buffered=False)

# Global database instance
db = Database()
