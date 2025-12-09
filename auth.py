"""
Authentication module for Instagram Clone
Handles user registration, login, and password hashing
"""
import bcrypt
import re
from database import db

class AuthError(Exception):
    """Custom exception for authentication errors"""
    pass

def hash_password(password):
    """
    Hash a password using bcrypt
    
    Args:
        password (str): Plain text password
        
    Returns:
        str: Hashed password
    """
    # Generate salt and hash password
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password, password_hash):
    """
    Verify a password against its hash
    
    Args:
        password (str): Plain text password
        password_hash (str): Hashed password from database
        
    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        return bcrypt.checkpw(
            password.encode('utf-8'),
            password_hash.encode('utf-8')
        )
    except Exception as e:
        print(f"Error verifying password: {e}")
        return False

def sanitize_input(value):
    """
    Sanitize input to prevent SQL injection and XSS
    Note: Using parameterized queries is the primary defense,
    but this adds an extra layer of validation
    
    Args:
        value: Input value to sanitize
        
    Returns:
        str: Sanitized value
    """
    if value is None:
        return None
    
    if not isinstance(value, str):
        return value
    
    # Remove potentially dangerous characters
    sanitized = value.strip()
    
    # Remove SQL injection patterns
    dangerous_patterns = [
        r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)",
        r"(--|;|/\*|\*/|xp_|sp_)",
        r"(\bor\b\s+\d+\s*=\s*\d+)",
        r"(\band\b\s+\d+\s*=\s*\d+)"
    ]
    
    for pattern in dangerous_patterns:
        sanitized = re.sub(pattern, '', sanitized, flags=re.IGNORECASE)
    
    return sanitized

def validate_username(username):
    """
    Validate username format
    
    Args:
        username (str): Username to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not username or len(username.strip()) == 0:
        return False, "Username is required"
    
    username = username.strip()
    
    if len(username) < 3:
        return False, "Username must be at least 3 characters"
    
    if len(username) > 30:
        return False, "Username must be 30 characters or less"
    
    # Only allow alphanumeric, dots, and underscores
    if not re.match(r'^[a-zA-Z0-9._]+$', username):
        return False, "Username can only contain letters, numbers, dots, and underscores"
    
    return True, None

def validate_email(email):
    """
    Validate email format
    
    Args:
        email (str): Email to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not email or len(email.strip()) == 0:
        return False, "Email is required"
    
    email = email.strip().lower()
    
    if len(email) > 100:
        return False, "Email must be 100 characters or less"
    
    # Basic email regex
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        return False, "Please enter a valid email address"
    
    return True, None

def validate_password(password):
    """
    Validate password strength
    
    Args:
        password (str): Password to validate
        
    Returns:
        tuple: (is_valid, error_message)
    """
    if not password or len(password) == 0:
        return False, "Password is required"
    
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if len(password) > 128:
        return False, "Password is too long"
    
    return True, None

def check_username_exists(username):
    """
    Check if username already exists in database
    
    Args:
        username (str): Username to check
        
    Returns:
        bool: True if exists, False otherwise
    """
    try:
        query = "SELECT id FROM users WHERE username = %s"
        result = db.execute_query(query, (username,))
        return len(result) > 0
    except Exception as e:
        print(f"Error checking username: {e}")
        return False

def check_email_exists(email):
    """
    Check if email already exists in database
    
    Args:
        email (str): Email to check
        
    Returns:
        bool: True if exists, False otherwise
    """
    try:
        query = "SELECT id FROM users WHERE email = %s"
        result = db.execute_query(query, (email,))
        return len(result) > 0
    except Exception as e:
        print(f"Error checking email: {e}")
        return False

def create_user(username, email, password, full_name=None, bio=None):
    """
    Create a new user in the database
    
    Args:
        username (str): Username
        email (str): Email address
        password (str): Plain text password (will be hashed)
        full_name (str, optional): Full name
        bio (str, optional): User bio
        
    Returns:
        dict: User data including id
        
    Raises:
        AuthError: If validation fails or user creation fails
    """
    # Validate inputs
    is_valid, error = validate_username(username)
    if not is_valid:
        raise AuthError(error)
    
    is_valid, error = validate_email(email)
    if not is_valid:
        raise AuthError(error)
    
    is_valid, error = validate_password(password)
    if not is_valid:
        raise AuthError(error)
    
    # Sanitize inputs
    username = sanitize_input(username)
    email = sanitize_input(email).lower()
    full_name = sanitize_input(full_name) if full_name else None
    bio = sanitize_input(bio) if bio else None
    
    # Check if username or email already exists
    if check_username_exists(username):
        raise AuthError("Username already exists")
    
    if check_email_exists(email):
        raise AuthError("Email already exists")
    
    # Hash password
    password_hash = hash_password(password)
    
    # Insert user into database using parameterized query (prevents SQL injection)
    try:
        query = """
            INSERT INTO users (username, email, password_hash, full_name, bio)
            VALUES (%s, %s, %s, %s, %s)
        """
        db.execute_query(query, (username, email, password_hash, full_name, bio))
        
        # Get the created user
        query = "SELECT id, username, email, full_name, bio, profile_pic, is_private, created_at FROM users WHERE username = %s"
        result = db.execute_query(query, (username,))
        
        if result:
            return result[0]
        else:
            raise AuthError("Failed to retrieve created user")
            
    except Exception as e:
        error_msg = str(e).lower()
        if 'duplicate' in error_msg or 'unique' in error_msg:
            if 'username' in error_msg:
                raise AuthError("Username already exists")
            elif 'email' in error_msg:
                raise AuthError("Email already exists")
        raise AuthError(f"Failed to create user: {str(e)}")

def authenticate_user(username_or_email, password):
    """
    Authenticate a user with username/email and password
    
    Args:
        username_or_email (str): Username or email
        password (str): Plain text password
        
    Returns:
        dict: User data if authentication successful, None otherwise
    """
    if not username_or_email or not password:
        return None
    
    # Sanitize input
    username_or_email = sanitize_input(username_or_email)
    
    try:
        # Try to find user by username or email
        query = """
            SELECT id, username, email, password_hash, full_name, bio, profile_pic, is_private
            FROM users 
            WHERE username = %s OR email = %s
        """
        result = db.execute_query(query, (username_or_email, username_or_email))
        
        if not result or len(result) == 0:
            return None
        
        user = result[0]
        
        # Verify password
        if verify_password(password, user['password_hash']):
            # Remove password hash from returned data
            del user['password_hash']
            return user
        
        return None
        
    except Exception as e:
        print(f"Error authenticating user: {e}")
        return None

