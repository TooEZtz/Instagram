/**
 * Authentication JavaScript
 * Handles form validation and API communication for login/signup
 */

const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Sanitize input to prevent XSS and basic injection attempts
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous characters
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Validate username
 */
function validateUsername(username) {
    const errors = [];
    
    if (!username || username.trim().length === 0) {
        errors.push('Username is required');
        return { valid: false, errors };
    }
    
    const sanitized = sanitizeInput(username);
    
    if (sanitized.length < 3) {
        errors.push('Username must be at least 3 characters');
    }
    
    if (sanitized.length > 30) {
        errors.push('Username must be 30 characters or less');
    }
    
    if (!/^[a-zA-Z0-9._]+$/.test(sanitized)) {
        errors.push('Username can only contain letters, numbers, dots, and underscores');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        value: sanitized
    };
}

/**
 * Validate email
 */
function validateEmail(email) {
    const errors = [];
    
    if (!email || email.trim().length === 0) {
        errors.push('Email is required');
        return { valid: false, errors };
    }
    
    const sanitized = sanitizeInput(email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(sanitized)) {
        errors.push('Please enter a valid email address');
    }
    
    if (sanitized.length > 100) {
        errors.push('Email must be 100 characters or less');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        value: sanitized.toLowerCase()
    };
}

/**
 * Validate password
 */
function validatePassword(password) {
    const errors = [];
    
    if (!password || password.length === 0) {
        errors.push('Password is required');
        return { valid: false, errors };
    }
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    
    if (password.length > 128) {
        errors.push('Password is too long');
    }
    
    // Check for common weak passwords
    const commonPasswords = ['password', '12345678', 'qwerty', 'abc123'];
    if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('Please choose a stronger password');
    }
    
    return {
        valid: errors.length === 0,
        errors,
        value: password
    };
}

/**
 * Validate full name
 */
function validateFullName(fullName) {
    if (!fullName || fullName.trim().length === 0) {
        return { valid: true, value: null }; // Optional field
    }
    
    const sanitized = sanitizeInput(fullName);
    
    if (sanitized.length > 100) {
        return {
            valid: false,
            errors: ['Full name must be 100 characters or less'],
            value: sanitized
        };
    }
    
    return {
        valid: true,
        value: sanitized || null
    };
}

/**
 * Validate bio
 */
function validateBio(bio) {
    if (!bio || bio.trim().length === 0) {
        return { valid: true, value: null }; // Optional field
    }
    
    const sanitized = sanitizeInput(bio);
    
    if (sanitized.length > 500) {
        return {
            valid: false,
            errors: ['Bio must be 500 characters or less'],
            value: sanitized
        };
    }
    
    return {
        valid: true,
        value: sanitized || null
    };
}

/**
 * Display error message
 */
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.add('error');
    }
    
    if (errorElement) {
        errorElement.textContent = message;
    }
}

/**
 * Clear error message
 */
function clearError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(fieldId + 'Error');
    
    if (field) {
        field.classList.remove('error');
    }
    
    if (errorElement) {
        errorElement.textContent = '';
    }
}

/**
 * Show form message
 */
function showFormMessage(message, type = 'error') {
    const messageElement = document.getElementById('formMessage');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `form-message ${type}`;
        messageElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
    }
}

/**
 * Handle Signup Form Submission
 */
function handleSignup(event) {
    event.preventDefault();
    
    // Clear previous errors
    ['username', 'email', 'fullName', 'password', 'confirmPassword', 'bio'].forEach(clearError);
    
    // Get form values
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const fullName = document.getElementById('fullName').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const bio = document.getElementById('bio').value;
    
    // Validate all fields
    const usernameValidation = validateUsername(username);
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    const fullNameValidation = validateFullName(fullName);
    const bioValidation = validateBio(bio);
    
    let isValid = true;
    
    // Check username
    if (!usernameValidation.valid) {
        isValid = false;
        showError('username', usernameValidation.errors[0]);
    }
    
    // Check email
    if (!emailValidation.valid) {
        isValid = false;
        showError('email', emailValidation.errors[0]);
    }
    
    // Check password
    if (!passwordValidation.valid) {
        isValid = false;
        showError('password', passwordValidation.errors[0]);
    }
    
    // Check password confirmation
    if (password !== confirmPassword) {
        isValid = false;
        showError('confirmPassword', 'Passwords do not match');
    }
    
    // Check full name
    if (!fullNameValidation.valid) {
        isValid = false;
        showError('fullName', fullNameValidation.errors[0]);
    }
    
    // Check bio
    if (!bioValidation.valid) {
        isValid = false;
        showError('bio', bioValidation.errors[0]);
    }
    
    if (!isValid) {
        return;
    }
    
    // Disable submit button
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Signing up...';
    
    // Prepare data
    const signupData = {
        username: usernameValidation.value,
        email: emailValidation.value,
        password: passwordValidation.value,
        full_name: fullNameValidation.value,
        bio: bioValidation.value
    };
    
    // Send to backend
    fetch(`${API_BASE_URL}/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include', // Important: include cookies for session
        body: JSON.stringify(signupData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showFormMessage('Account created successfully! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showFormMessage(data.message || 'Signup failed. Please try again.');
            if (data.field) {
                showError(data.field, data.message);
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showFormMessage('Network error. Please check your connection and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign Up';
    });
}

/**
 * Handle Login Form Submission
 */
function handleLogin(event) {
    event.preventDefault();
    
    // Clear previous errors
    ['username', 'password'].forEach(clearError);
    
    // Get form values
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Basic validation
    if (!username || username.trim().length === 0) {
        showError('username', 'Username or email is required');
        return;
    }
    
    if (!password || password.length === 0) {
        showError('password', 'Password is required');
        return;
    }
    
    // Disable submit button
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    
    // Prepare data
    const loginData = {
        username: sanitizeInput(username),
        password: password
    };
    
    // Send to backend
    fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include', // Important: include cookies for session
        body: JSON.stringify(loginData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showFormMessage('Login successful! Redirecting...', 'success');
            // Session is now managed by Flask via cookies
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);
        } else {
            showFormMessage(data.message || 'Login failed. Please check your credentials.');
            if (data.field) {
                showError(data.field, data.message);
            }
            submitBtn.disabled = false;
            submitBtn.textContent = 'Log In';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showFormMessage('Network error. Please check your connection and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log In';
    });
}

/**
 * Check if user is logged in
 */
function checkSession() {
    return fetch(`${API_BASE_URL}/check-session`, {
        method: 'GET',
        credentials: 'include' // Important: include cookies
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success' && data.logged_in) {
            return {
                loggedIn: true,
                userId: data.user_id,
                username: data.username,
                email: data.email
            };
        }
        return { loggedIn: false };
    })
    .catch(error => {
        console.error('Error checking session:', error);
        return { loggedIn: false };
    });
}

/**
 * Logout user
 */
function logout() {
    return fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include' // Important: include cookies
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            window.location.href = 'login.html';
        }
    })
    .catch(error => {
        console.error('Error logging out:', error);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    const loginForm = document.getElementById('loginForm');
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

