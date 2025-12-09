# Instagram Clone - Database Project

A full-stack Instagram clone application with Python Flask backend and MySQL database.

## Project Structure

```
Instagram/
├── app.py                 # Main Flask application
├── config.py             # Configuration settings
├── database.py           # Database connection handler
├── init_database.py      # Database initialization script
├── schema.sql            # SQL schema for all tables
├── requirements.txt      # Python dependencies
├── .env.example          # Environment variables template
├── assets/               # Static assets (images, icons)
│   ├── images/          # User photos, post images, story images
│   └── icons/           # Application icons and UI icons
├── Frontend/            # Frontend files
│   ├── html/           # All HTML files
│   ├── css/            # All CSS files
│   └── js/             # All JavaScript files
└── README.md            # This file
```

## File Organization Rules

**Frontend Files:**
- HTML files → `Frontend/html/`
- CSS files → `Frontend/css/`
- JavaScript files → `Frontend/js/`

**Assets:**
- Images → `assets/images/`
- Icons → `assets/icons/`

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Database

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` with your MySQL credentials and Gemini API key:
   ```
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=instagram_clone
   DB_PORT=3306
   SECRET_KEY=your-secret-key-here
   DEBUG=True
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### 3. Initialize Database

Run the initialization script to create the database and all tables:

```bash
python init_database.py
```

This will:
- Create the `instagram_clone` database if it doesn't exist
- Create all required tables (users, posts, likes, comments, follows, stories, hashtags, etc.)

### 4. Run the Application

```bash
python app.py
```

The API will start on `http://localhost:5000`

### 5. Test the Connection

- Health check: `http://localhost:5000/api/health`
- Database test: `http://localhost:5000/api/test-db`

## Database Schema

The database includes the following tables:

- **users** - User accounts and profiles
- **posts** - User posts with images and captions
- **likes** - Post likes
- **comments** - Post comments
- **follows** - User follow relationships
- **stories** - Temporary stories (24 hours)
- **hashtags** - Hashtag definitions
- **post_hashtags** - Post-hashtag relationships
- **saved_posts** - Bookmarked posts
- **conversations** - Direct message conversations
- **conversation_members** - Conversation participants
- **messages** - Direct messages

## API Endpoints

Currently available endpoints:

- `GET /api/health` - Health check
- `GET /api/test-db` - Test database connection

More endpoints will be added as the project develops.

## Next Steps

- [ ] User authentication endpoints
- [ ] Post CRUD operations
- [ ] Like/comment functionality
- [ ] Follow/unfollow endpoints
- [ ] Frontend implementation

