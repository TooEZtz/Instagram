"""
Flask application for Instagram Clone
"""
from flask import Flask, request, jsonify, send_from_directory, session
from flask_cors import CORS
import os
from functools import wraps
from config import Config
from database import db
from auth import create_user, authenticate_user, AuthError
from werkzeug.utils import secure_filename
import uuid

def create_app():
    """Create and configure Flask app"""
    app = Flask(__name__, static_folder='Frontend', static_url_path='')
    app.config.from_object(Config)
    app.config['SESSION_COOKIE_SECURE'] = False
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['PERMANENT_SESSION_LIFETIME'] = 86400
    
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:5500", "http://localhost:5000", "http://127.0.0.1:5500", "http://127.0.0.1:5000"],
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    }, supports_credentials=True)
    
    @app.errorhandler(Exception)
    def handle_error(e):
        import traceback
        print(f"Unhandled error: {e}")
        traceback.print_exc()
        return jsonify({'error': 'Internal server error'}), 500

    def normalize_profile_pic(path):
        """Return a normalized profile pic URL rooted at /assets/images/profiles"""
        if not path:
            return '/assets/images/profiles/default.jpg'
        clean = str(path).replace('\\', '/')
        if clean.startswith('http://') or clean.startswith('https://'):
            return clean
        if clean.startswith('/assets/'):
            return clean
        if clean.startswith('assets/'):
            return f"/{clean}"
        if clean.startswith('images/'):
            return f"/assets/{clean}"
        if clean.startswith('profiles/'):
            return f"/assets/images/{clean}"
        # filename only
        return f"/assets/images/profiles/{clean.split('/')[-1]}"

    def normalize_post_image(path):
        """Return a normalized post image URL rooted at /assets/images/posts"""
        if not path:
            return ''
        clean = str(path).replace('\\', '/')
        if clean.startswith('http://') or clean.startswith('https://'):
            return clean
        if clean.startswith('/assets/'):
            return clean
        if clean.startswith('assets/'):
            return f"/{clean}"
        if clean.startswith('images/'):
            return f"/assets/{clean}"
        if clean.startswith('posts/'):
            return f"/assets/images/{clean}"
        # filename only
        return f"/assets/images/posts/{clean.split('/')[-1]}"
    
    def login_required(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if request.method == 'OPTIONS':
                return '', 200
            if 'logged_in' not in session or not session['logged_in']:
                return jsonify({'error': 'Authentication required'}), 401
            return f(*args, **kwargs)
        return decorated_function

    def build_conversation_payload(conversation_id, current_user_id):
        """Return a normalized conversation payload with other participant and last message."""
        try:
            members = db.execute_query(
                """
                SELECT u.id, u.username, u.full_name, u.profile_pic
                FROM conversation_members cm
                INNER JOIN users u ON cm.user_id = u.id
                WHERE cm.conversation_id = %s
                """,
                (conversation_id,)
            ) or []

            if not members:
                return None

            other_user = None
            for m in members:
                if m.get('id') != current_user_id:
                    other_user = m
                    break
            if not other_user:
                other_user = members[0]

            last_message_row = db.execute_query(
                """
                SELECT m.id, m.sender_id, m.message_text, m.image_url, m.created_at, u.username
                FROM messages m
                INNER JOIN users u ON m.sender_id = u.id
                WHERE m.conversation_id = %s
                ORDER BY m.created_at DESC, m.id DESC
                LIMIT 1
                """,
                (conversation_id,)
            )
            last_message = None
            if last_message_row:
                lm = last_message_row[0]
                last_message = {
                    'id': lm.get('id'),
                    'sender_id': lm.get('sender_id'),
                    'sender_username': lm.get('username'),
                    'message_text': lm.get('message_text') or '',
                    'image_url': lm.get('image_url'),
                    'created_at': str(lm.get('created_at', ''))
                }

            return {
                'id': conversation_id,
                'other_user': {
                    'id': other_user.get('id'),
                    'username': other_user.get('username'),
                    'full_name': other_user.get('full_name'),
                    'profile_pic': normalize_profile_pic(other_user.get('profile_pic'))
                },
                'last_message': last_message
            }
        except Exception:
            return None
    
    # Signup
    @app.route('/api/signup', methods=['POST', 'OPTIONS'])
    def signup():
        if request.method == 'OPTIONS':
            return '', 200
        try:
            data = request.get_json()
            user = create_user(
                username=data.get('username'),
                email=data.get('email'),
                password=data.get('password'),
                full_name=data.get('full_name'),
                bio=data.get('bio')
            )
            return jsonify({'status': 'success', 'user': user}), 201
        except AuthError as e:
            return jsonify({'status': 'error', 'message': str(e)}), 400
        except Exception as e:
            return jsonify({'status': 'error', 'message': 'Registration failed'}), 500
    
    # Login
    @app.route('/api/login', methods=['POST', 'OPTIONS'])
    def login():
        if request.method == 'OPTIONS':
            return '', 200
        try:
            data = request.get_json()
            user = authenticate_user(data.get('username'), data.get('password'))
            if user:
                session.permanent = True
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['logged_in'] = True
                return jsonify({'status': 'success', 'user_id': user['id'], 'username': user['username']}), 200
            return jsonify({'status': 'error', 'message': 'Invalid credentials'}), 401
        except Exception as e:
            return jsonify({'status': 'error', 'message': 'Login failed'}), 500
    
    # Logout
    @app.route('/api/logout', methods=['POST', 'OPTIONS'])
    def logout():
        if request.method == 'OPTIONS':
            return '', 200
        session.clear()
        return jsonify({'status': 'success'}), 200
    
    # Check session
    @app.route('/api/check-session', methods=['GET'])
    def check_session():
        if 'logged_in' in session and session['logged_in']:
            return jsonify({'logged_in': True, 'user_id': session.get('user_id'), 'username': session.get('username')}), 200
        return jsonify({'logged_in': False}), 200
    
    # Get feed posts
    @app.route('/api/feed', methods=['GET', 'OPTIONS'])
    @login_required
    def get_feed():
        if request.method == 'OPTIONS':
            return '', 200
        
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'posts': []}), 200
        
        try:
            # Get list of users the current user follows + themselves
            follows = db.execute_query("SELECT following_id FROM follows WHERE follower_id = %s", (user_id,)) or []
            follow_ids = [row['following_id'] for row in follows if row.get('following_id') is not None]
            follow_ids.append(user_id)  # include self

            if not follow_ids:
                return jsonify({'posts': []}), 200

            placeholders = ','.join(['%s'] * len(follow_ids))
            query = f"""
                SELECT p.id, p.user_id, p.image_url, p.caption, p.created_at,
                       u.username, u.profile_pic, u.full_name,
                       (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
                       (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comments_count
                FROM posts p
                INNER JOIN users u ON p.user_id = u.id
                WHERE p.user_id IN ({placeholders})
                ORDER BY p.created_at DESC LIMIT 50
            """
            posts = db.execute_query(query, tuple(follow_ids)) or []
            
            # Collect post ids
            post_ids = [p['id'] for p in posts]
            
            # Get user likes
            user_likes = set()
            if post_ids:
                try:
                    placeholders = ','.join(['%s'] * len(post_ids))
                    likes_query = f"SELECT post_id FROM likes WHERE user_id = %s AND post_id IN ({placeholders})"
                    likes_result = db.execute_query(likes_query, (user_id,) + tuple(post_ids)) or []
                    # Normalize to int for safe comparison
                    user_likes = {
                        int(row['post_id'])
                        for row in likes_result
                        if row.get('post_id') is not None
                    }
                except:
                    pass

            # Get latest comments (up to 3) per post
            comments_by_post = {}
            if post_ids:
                try:
                    placeholders = ','.join(['%s'] * len(post_ids))
                    comments_query = f"""
                        SELECT c.id, c.post_id, c.comment_text, c.created_at, u.username
                        FROM comments c
                        INNER JOIN users u ON c.user_id = u.id
                        WHERE c.post_id IN ({placeholders})
                        ORDER BY c.post_id, c.created_at DESC
                    """
                    comments_result = db.execute_query(comments_query, tuple(post_ids)) or []
                    for row in comments_result:
                        pid = row['post_id']
                        if pid not in comments_by_post:
                            comments_by_post[pid] = []
                        if len(comments_by_post[pid]) < 3:  # limit to 3 recent comments
                            comments_by_post[pid].append({
                                'id': row['id'],
                                'username': row['username'],
                                'comment_text': row['comment_text'],
                                'created_at': str(row['created_at'])
                            })
                except:
                    comments_by_post = {}
            
            # Format response
            result = []
            for p in posts:
                pid = p['id']
                pid_int = int(pid) if pid is not None else None
                result.append({
                    'id': pid,
                    'user_id': p['user_id'],
                    'username': p.get('username', 'unknown'),
                    'profile_pic': normalize_profile_pic(p.get('profile_pic')),
                    'full_name': p.get('full_name') or '',
                    'image_url': normalize_post_image(p.get('image_url')),
                    'caption': p.get('caption') or '',
                    'likes_count': int(p.get('likes_count') or 0),
                    'comments_count': int(p.get('comments_count') or 0),
                    'is_liked': pid_int in user_likes if pid_int is not None else False,
                    'created_at': str(p.get('created_at', '')),
                    'comments': comments_by_post.get(pid, [])
                })
            
            return jsonify({'posts': result}), 200
        except Exception as e:
            import traceback
            print(f"Error in get_feed: {e}")
            traceback.print_exc()
            return jsonify({'posts': []}), 200
    
    # Get stories
    @app.route('/api/stories', methods=['GET', 'OPTIONS'])
    @login_required
    def get_stories():
        if request.method == 'OPTIONS':
            return '', 200
        
        try:
            # Get list of users the current user follows + themselves
            user_id = session.get('user_id')
            follows = db.execute_query("SELECT following_id FROM follows WHERE follower_id = %s", (user_id,)) or []
            follow_ids = [row['following_id'] for row in follows if row.get('following_id') is not None]
            follow_ids.append(user_id)  # include self

            if not follow_ids:
                return jsonify({'stories': []}), 200

            placeholders = ','.join(['%s'] * len(follow_ids))
            query = f"""
                SELECT s.*, u.username, u.profile_pic
                FROM stories s
                INNER JOIN users u ON s.user_id = u.id
                WHERE s.user_id IN ({placeholders}) AND s.expires_at > NOW()
                ORDER BY s.created_at DESC
            """
            stories = db.execute_query(query, tuple(follow_ids)) or []
            
            result = []
            for s in stories:
                result.append({
                    'id': s.get('id'),
                    'user_id': s.get('user_id'),
                    'username': s.get('username', 'unknown'),
                    'profile_pic': normalize_profile_pic(s.get('profile_pic')),
                    'image_url': normalize_post_image(s.get('image_url')),
                    'created_at': str(s.get('created_at', ''))
                })
            
            return jsonify({'stories': result}), 200
        except Exception as e:
            import traceback
            print(f"Error in get_stories: {e}")
            traceback.print_exc()
            return jsonify({'stories': []}), 200
    
    # Like/Unlike post
    @app.route('/api/posts/<int:post_id>/like', methods=['POST', 'OPTIONS'])
    @login_required
    def toggle_like(post_id):
        if request.method == 'OPTIONS':
            return '', 200
        try:
            user_id = session.get('user_id')
            existing = db.execute_query("SELECT * FROM likes WHERE user_id = %s AND post_id = %s", (user_id, post_id))
            
            if existing:
                db.execute_query("DELETE FROM likes WHERE user_id = %s AND post_id = %s", (user_id, post_id))
                is_liked = False
            else:
                db.execute_query("INSERT INTO likes (user_id, post_id) VALUES (%s, %s)", (user_id, post_id))
                is_liked = True
            
            # Get updated count
            count_result = db.execute_query("SELECT COUNT(*) as count FROM likes WHERE post_id = %s", (post_id,))
            likes_count = count_result[0]['count'] if count_result else 0
            
            return jsonify({'success': True, 'is_liked': is_liked, 'likes_count': likes_count}), 200
        except Exception as e:
            return jsonify({'error': 'Failed to update like'}), 500
    
    # Add comment
    @app.route('/api/posts/<int:post_id>/comment', methods=['POST', 'OPTIONS'])
    @login_required
    def add_comment(post_id):
        if request.method == 'OPTIONS':
            return '', 200
        try:
            user_id = session.get('user_id')
            data = request.get_json()
            comment_text = data.get('comment_text', '').strip()
            
            if not comment_text:
                return jsonify({'error': 'Comment text required'}), 400
            
            db.execute_query("INSERT INTO comments (post_id, user_id, comment_text) VALUES (%s, %s, %s)", 
                          (post_id, user_id, comment_text))
            
            # Get comment with user info
            comment_result = db.execute_query("""
                SELECT c.*, u.username, u.profile_pic
                FROM comments c
                INNER JOIN users u ON c.user_id = u.id
                WHERE c.post_id = %s AND c.user_id = %s
                ORDER BY c.created_at DESC LIMIT 1
            """, (post_id, user_id))
            
            if comment_result:
                comment = comment_result[0]
                count_result = db.execute_query("SELECT COUNT(*) as count FROM comments WHERE post_id = %s", (post_id,))
                comments_count = count_result[0]['count'] if count_result else 0
                
                return jsonify({
                    'success': True,
                    'comment': {
                        'id': comment['id'],
                        'username': comment['username'],
                        'comment_text': comment['comment_text'],
                        'created_at': str(comment['created_at']),
                        'profile_pic': (comment['profile_pic'] or 'default.jpg').replace('\\', '/')
                    },
                    'comments_count': comments_count
                }), 200
            return jsonify({'error': 'Failed to retrieve comment'}), 500
        except Exception as e:
            return jsonify({'error': 'Failed to add comment'}), 500
    
    # Get current user
    @app.route('/api/user/me', methods=['GET', 'OPTIONS'])
    @login_required
    def get_current_user():
        if request.method == 'OPTIONS':
            return '', 200
        
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'user': None}), 200
        
        try:
            result = db.execute_query("""
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.full_name,
                    u.bio,
                    u.profile_pic,
                    COALESCE((SELECT COUNT(*) FROM follows f1 WHERE f1.following_id = u.id), 0) AS followers_count,
                    COALESCE((SELECT COUNT(*) FROM follows f2 WHERE f2.follower_id = u.id), 0) AS following_count,
                    COALESCE((SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id), 0) AS posts_count
                FROM users u
                WHERE u.id = %s
            """, (user_id,))
            
            if result and len(result) > 0:
                user = result[0]
                return jsonify({
                    'user': {
                        'id': user.get('id'),
                        'username': user.get('username'),
                        'email': user.get('email'),
                        'full_name': user.get('full_name'),
                        'bio': user.get('bio'),
                        'profile_pic': (user.get('profile_pic') or 'default.jpg').replace('\\', '/'),
                        'followers_count': int(user.get('followers_count') or 0),
                        'following_count': int(user.get('following_count') or 0),
                        'posts_count': int(user.get('posts_count') or 0)
                    }
                }), 200
            return jsonify({'user': None}), 200
        except Exception as e:
            import traceback
            print(f"Error in get_current_user: {e}")
            traceback.print_exc()
            return jsonify({'user': None}), 200

    # People you may know (users not yet followed)
    @app.route('/api/people-you-may-know', methods=['GET', 'OPTIONS'])
    @login_required
    def people_you_may_know():
        if request.method == 'OPTIONS':
            return '', 200

        try:
            user_id = session.get('user_id')
            if not user_id:
                return jsonify({'users': []}), 200

            # Pagination
            try:
                page = int(request.args.get('page', 1))
                per_page = int(request.args.get('per_page', 12))
            except:
                page = 1
                per_page = 12

            page = max(1, page)
            per_page = max(1, min(per_page, 50))  # cap per_page
            offset = (page - 1) * per_page

            query = """
                SELECT 
                    u.id, 
                    u.username, 
                    u.full_name, 
                    u.profile_pic, 
                    u.bio,
                    COALESCE((SELECT COUNT(*) FROM follows f1 WHERE f1.following_id = u.id), 0) AS followers_count,
                    COALESCE((SELECT COUNT(*) FROM follows f2 WHERE f2.follower_id = u.id), 0) AS following_count,
                    COALESCE((SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id), 0) AS posts_count
                FROM users u
                WHERE u.id != %s
                  AND u.id NOT IN (
                      SELECT following_id FROM follows WHERE follower_id = %s
                  )
                ORDER BY followers_count DESC, u.username ASC
                LIMIT %s OFFSET %s
            """
            users = db.execute_query(query, (user_id, user_id, per_page, offset)) or []

            # Normalize paths
            normalized = []
            for u in users:
                profile_pic = (u.get('profile_pic') or 'default.jpg').replace('\\', '/')
                normalized.append({
                    'id': u.get('id'),
                    'username': u.get('username'),
                    'full_name': u.get('full_name'),
                    'bio': u.get('bio'),
                    'profile_pic': normalize_profile_pic(profile_pic),
                    'followers_count': int(u.get('followers_count') or 0),
                    'following_count': int(u.get('following_count') or 0),
                    'posts_count': int(u.get('posts_count') or 0),
                    'is_following': False  # by definition, not followed yet
                })

            return jsonify({'users': normalized, 'page': page, 'per_page': per_page}), 200
        except Exception as e:
            import traceback
            print(f"Error in people_you_may_know: {e}")
            traceback.print_exc()
            return jsonify({'users': []}), 200

    # Get profile by user id
    @app.route('/api/user/<int:target_user_id>', methods=['GET', 'OPTIONS'])
    @login_required
    def get_user_profile(target_user_id):
        if request.method == 'OPTIONS':
            return '', 200
        try:
            current_user_id = session.get('user_id')
            if not current_user_id:
                return jsonify({'user': None}), 200

            query = """
                SELECT 
                    u.id, u.username, u.full_name, u.bio, u.profile_pic,
                    COALESCE((SELECT COUNT(*) FROM follows f1 WHERE f1.following_id = u.id), 0) AS followers_count,
                    COALESCE((SELECT COUNT(*) FROM follows f2 WHERE f2.follower_id = u.id), 0) AS following_count,
                    COALESCE((SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id), 0) AS posts_count
                FROM users u
                WHERE u.id = %s
            """
            result = db.execute_query(query, (target_user_id,))
            if not result:
                return jsonify({'user': None}), 404

            user = result[0]
            profile_pic = normalize_profile_pic(user.get('profile_pic'))

            # determine follow state if viewing someone else
            is_following = False
            if target_user_id != current_user_id:
                follow_check = db.execute_query(
                    "SELECT 1 FROM follows WHERE follower_id = %s AND following_id = %s",
                    (current_user_id, target_user_id)
                )
                is_following = bool(follow_check)

            return jsonify({
                'user': {
                    'id': user.get('id'),
                    'username': user.get('username'),
                    'full_name': user.get('full_name'),
                    'bio': user.get('bio'),
                    'profile_pic': profile_pic,
                    'followers_count': int(user.get('followers_count') or 0),
                    'following_count': int(user.get('following_count') or 0),
                    'posts_count': int(user.get('posts_count') or 0),
                    'is_following': is_following,
                    'is_self': target_user_id == current_user_id
                }
            }), 200
        except Exception as e:
            import traceback
            print(f"Error in get_user_profile: {e}")
            traceback.print_exc()
            return jsonify({'user': None}), 200

    # Update current user profile (bio, privacy, profile pic)
    @app.route('/api/user/me/profile', methods=['POST', 'OPTIONS'])
    @login_required
    def update_my_profile():
        if request.method == 'OPTIONS':
            return '', 200
        try:
            user_id = session.get('user_id')
            if not user_id:
                return jsonify({'error': 'Not authenticated'}), 401

            bio = request.form.get('bio', '')
            is_private = request.form.get('is_private', '0')
            is_private = 1 if str(is_private) in ['1', 'true', 'True', 'on'] else 0

            profile_pic_path = None
            file = request.files.get('profile_pic')
            if file and file.filename:
                filename = secure_filename(file.filename)
                # ensure directory
                profiles_dir = os.path.join(app.root_path, 'assets', 'images', 'profiles')
                os.makedirs(profiles_dir, exist_ok=True)
                unique_name = f"{uuid.uuid4().hex}_{filename}"
                save_path = os.path.join(profiles_dir, unique_name)
                file.save(save_path)
                profile_pic_path = f"profiles/{unique_name}"

            # update DB
            if profile_pic_path:
                db.execute_query(
                    "UPDATE users SET bio = %s, is_private = %s, profile_pic = %s WHERE id = %s",
                    (bio, is_private, profile_pic_path, user_id)
                )
            else:
                db.execute_query(
                    "UPDATE users SET bio = %s, is_private = %s WHERE id = %s",
                    (bio, is_private, user_id)
                )

            # return updated user
            result = db.execute_query(
                "SELECT id, username, full_name, bio, profile_pic, is_private FROM users WHERE id = %s",
                (user_id,)
            ) or []
            if not result:
                return jsonify({'error': 'User not found'}), 404
            user = result[0]
            return jsonify({
                'user': {
                    'id': user.get('id'),
                    'username': user.get('username'),
                    'full_name': user.get('full_name'),
                    'bio': user.get('bio'),
                    'is_private': user.get('is_private'),
                    'profile_pic': normalize_profile_pic(user.get('profile_pic'))
                }
            }), 200
        except Exception as e:
            import traceback
            print(f"Error in update_my_profile: {e}")
            traceback.print_exc()
            return jsonify({'error': 'Failed to update profile'}), 500

    # Create post or story
    @app.route('/api/create', methods=['POST', 'OPTIONS'])
    @login_required
    def create_post_or_story():
        if request.method == 'OPTIONS':
            return '', 200
        try:
            user_id = session.get('user_id')
            if not user_id:
                return jsonify({'error': 'Not authenticated'}), 401

            kind = (request.form.get('kind') or 'post').lower()
            caption = request.form.get('caption', '')
            location = request.form.get('location', '')
            allow_comments = request.form.get('allow_comments', '1')
            allow_comments = 1 if str(allow_comments) in ['1', 'true', 'True', 'on'] else 0

            file = request.files.get('image')
            if not file or not file.filename:
                return jsonify({'error': 'Image is required'}), 400

            filename = secure_filename(file.filename)
            base_dir = os.path.join(app.root_path, 'assets', 'images')
            folder = 'posts' if kind == 'post' else 'stories'
            save_dir = os.path.join(base_dir, folder)
            os.makedirs(save_dir, exist_ok=True)
            unique_name = f"{uuid.uuid4().hex}_{filename}"
            save_path = os.path.join(save_dir, unique_name)
            file.save(save_path)

            rel_path = f"{folder}/{unique_name}"

            if kind == 'story':
                db.execute_query(
                    "INSERT INTO stories (user_id, image_url, expires_at) VALUES (%s, %s, DATE_ADD(NOW(), INTERVAL 24 HOUR))",
                    (user_id, rel_path)
                )
                new_id = db.execute_query("SELECT LAST_INSERT_ID() AS id")
                story_id = new_id[0].get('id') if new_id else None
                story_row = db.execute_query(
                    "SELECT id, image_url, created_at, expires_at FROM stories WHERE id = %s",
                    (story_id,)
                ) or [{}]
                return jsonify({
                    'type': 'story',
                    'story': {
                        'id': story_row[0].get('id'),
                        'image_url': normalize_post_image(rel_path),
                        'created_at': str(story_row[0].get('created_at', '')),
                        'expires_at': str(story_row[0].get('expires_at', ''))
                    }
                }), 201
            else:
                db.execute_query(
                    "INSERT INTO posts (user_id, image_url, caption, location, allow_comments) VALUES (%s, %s, %s, %s, %s)",
                    (user_id, rel_path, caption, location, allow_comments)
                )
                new_id = db.execute_query("SELECT LAST_INSERT_ID() AS id")
                post_id = new_id[0].get('id') if new_id else None
                post_row = db.execute_query(
                    "SELECT id, image_url, caption, created_at FROM posts WHERE id = %s",
                    (post_id,)
                ) or [{}]
                return jsonify({
                    'type': 'post',
                    'post': {
                        'id': post_row[0].get('id'),
                        'image_url': normalize_post_image(rel_path),
                        'caption': post_row[0].get('caption'),
                        'created_at': str(post_row[0].get('created_at', ''))
                    }
                }), 201
        except Exception as e:
            import traceback
            print(f"Error in create_post_or_story: {e}")
            traceback.print_exc()
            return jsonify({'error': 'Failed to create'}), 500

    # Get posts for a user (profile gallery)
    @app.route('/api/user/<int:target_user_id>/posts', methods=['GET', 'OPTIONS'])
    @login_required
    def get_user_posts(target_user_id):
        if request.method == 'OPTIONS':
            return '', 200
        try:
            # For now, no privacy enforcement beyond login
            query = """
                SELECT
                    p.id,
                    p.image_url,
                    p.caption,
                    p.created_at,
                    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS likes_count,
                    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count
                FROM posts p
                WHERE p.user_id = %s
                ORDER BY p.created_at DESC
                LIMIT 60
            """
            posts = db.execute_query(query, (target_user_id,)) or []
            normalized = []
            for p in posts:
                img = normalize_post_image(p.get('image_url'))
                normalized.append({
                    'id': p.get('id'),
                    'image_url': img,
                    'caption': p.get('caption'),
                    'created_at': str(p.get('created_at', '')),
                    'likes_count': int(p.get('likes_count') or 0),
                    'comments_count': int(p.get('comments_count') or 0)
                })
            return jsonify({'posts': normalized}), 200
        except Exception as e:
            import traceback
            print(f"Error in get_user_posts: {e}")
            traceback.print_exc()
            return jsonify({'posts': []}), 200
    # Follow / Unfollow a user
    @app.route('/api/follow/<int:target_user_id>', methods=['POST', 'OPTIONS'])
    @login_required
    def follow_user(target_user_id):
        if request.method == 'OPTIONS':
            return '', 200
        try:
            user_id = session.get('user_id')
            if not user_id or user_id == target_user_id:
                return jsonify({'error': 'Invalid operation'}), 400

            # Check if already following
            existing = db.execute_query(
                "SELECT 1 FROM follows WHERE follower_id = %s AND following_id = %s",
                (user_id, target_user_id)
            )
            if existing:
                # Unfollow
                db.execute_query(
                    "DELETE FROM follows WHERE follower_id = %s AND following_id = %s",
                    (user_id, target_user_id)
                )
                is_following = False
            else:
                # Follow
                db.execute_query(
                    "INSERT INTO follows (follower_id, following_id) VALUES (%s, %s)",
                    (user_id, target_user_id)
                )
                is_following = True

            # Return updated counts
            counts = db.execute_query(
                """
                SELECT 
                    (SELECT COUNT(*) FROM follows WHERE following_id = %s) AS followers_count,
                    (SELECT COUNT(*) FROM follows WHERE follower_id = %s) AS following_count
                """,
                (target_user_id, target_user_id)
            ) or [{}]

            return jsonify({
                'success': True,
                'is_following': is_following,
                'followers_count': int(counts[0].get('followers_count') or 0),
                'following_count': int(counts[0].get('following_count') or 0)
            }), 200
        except Exception as e:
            import traceback
            print(f"Error in follow_user: {e}")
            traceback.print_exc()
            return jsonify({'error': 'Failed to update follow state'}), 500

    # Messaging: list followings for starting conversations
    @app.route('/api/messages/following', methods=['GET', 'OPTIONS'])
    @login_required
    def get_followings_for_messages():
        if request.method == 'OPTIONS':
            return '', 200
        try:
            user_id = session.get('user_id')
            rows = db.execute_query(
                """
                SELECT 
                    u.id,
                    u.username,
                    u.full_name,
                    u.profile_pic,
                    (
                        SELECT cm1.conversation_id
                        FROM conversation_members cm1
                        INNER JOIN conversation_members cm2 
                            ON cm1.conversation_id = cm2.conversation_id
                        WHERE cm1.user_id = %s AND cm2.user_id = u.id
                        LIMIT 1
                    ) AS conversation_id
                FROM follows f
                INNER JOIN users u ON f.following_id = u.id
                WHERE f.follower_id = %s
                  AND EXISTS (
                      SELECT 1 FROM follows f2
                      WHERE f2.follower_id = u.id
                        AND f2.following_id = %s
                  )
                ORDER BY u.username ASC
                """,
                (user_id, user_id, user_id)
            ) or []

            followings = []
            for row in rows:
                followings.append({
                    'id': row.get('id'),
                    'username': row.get('username'),
                    'full_name': row.get('full_name'),
                    'profile_pic': normalize_profile_pic(row.get('profile_pic')),
                    'conversation_id': row.get('conversation_id')
                })

            return jsonify({'users': followings}), 200
        except Exception as e:
            import traceback
            print(f"Error in get_followings_for_messages: {e}")
            traceback.print_exc()
            return jsonify({'users': []}), 200

    # Messaging: start or reuse a 1:1 conversation
    @app.route('/api/messages/start', methods=['POST', 'OPTIONS'])
    @login_required
    def start_conversation():
        if request.method == 'OPTIONS':
            return '', 200
        try:
            user_id = session.get('user_id')
            data = request.get_json() or {}
            target_user_id = data.get('user_id')
            try:
                target_user_id = int(target_user_id)
            except Exception:
                return jsonify({'error': 'Invalid user id'}), 400

            if not target_user_id or target_user_id == user_id:
                return jsonify({'error': 'Invalid user'}), 400

            # Ensure the target exists
            target_exists = db.execute_query(
                "SELECT id, username, full_name, profile_pic FROM users WHERE id = %s",
                (target_user_id,)
            )
            if not target_exists:
                return jsonify({'error': 'User not found'}), 404

            # Reuse existing conversation if any
            existing = db.execute_query(
                """
                SELECT cm1.conversation_id
                FROM conversation_members cm1
                INNER JOIN conversation_members cm2 
                    ON cm1.conversation_id = cm2.conversation_id
                WHERE cm1.user_id = %s AND cm2.user_id = %s
                LIMIT 1
                """,
                (user_id, target_user_id)
            )

            conversation_id = None
            if existing:
                conversation_id = existing[0].get('conversation_id')
            else:
                # Insert and get id in same connection
                conn = db.get_connection()
                cur = conn.cursor(dictionary=True)
                cur.execute("INSERT INTO conversations () VALUES ()")
                conversation_id = cur.lastrowid
                if not conversation_id:
                    cur.execute("SELECT LAST_INSERT_ID() AS id")
                    row = cur.fetchone()
                    conversation_id = row.get('id') if row else None
                if not conversation_id:
                    cur.execute("SELECT MAX(id) AS id FROM conversations")
                    row = cur.fetchone()
                    conversation_id = row.get('id') if row else None
                try:
                    conn.commit()
                except Exception:
                    pass
                try:
                    cur.close()
                    conn.close()
                except Exception:
                    pass
                if not conversation_id:
                    return jsonify({'error': 'Failed to create conversation'}), 500

                db.execute_query(
                    "INSERT INTO conversation_members (conversation_id, user_id) VALUES (%s, %s)",
                    (conversation_id, user_id)
                )
                db.execute_query(
                    "INSERT INTO conversation_members (conversation_id, user_id) VALUES (%s, %s)",
                    (conversation_id, target_user_id)
                )

            payload = build_conversation_payload(conversation_id, user_id)
            if not payload:
                # Fallback minimal payload
                payload = {
                    'id': conversation_id,
                    'other_user': {
                        'id': target_user_id,
                        'username': target_exists[0].get('username'),
                        'full_name': target_exists[0].get('full_name'),
                        'profile_pic': normalize_profile_pic(target_exists[0].get('profile_pic'))
                    },
                    'last_message': None
                }

            return jsonify({'conversation': payload}), 201
        except Exception as e:
            import traceback
            print(f"Error in start_conversation: {e}")
            traceback.print_exc()
            return jsonify({'error': 'Failed to start conversation'}), 500

    # Messaging: list conversations for the current user
    @app.route('/api/messages/conversations', methods=['GET', 'OPTIONS'])
    @login_required
    def list_conversations():
        if request.method == 'OPTIONS':
            return '', 200
        try:
            user_id = session.get('user_id')
            rows = db.execute_query(
                "SELECT conversation_id FROM conversation_members WHERE user_id = %s",
                (user_id,)
            ) or []

            conversations = []
            for row in rows:
                cid = row.get('conversation_id')
                payload = build_conversation_payload(cid, user_id)
                if payload:
                    conversations.append(payload)

            # Sort by last message desc
            conversations.sort(
                key=lambda c: c.get('last_message', {}).get('created_at', '') if c.get('last_message') else '',
                reverse=True
            )
            return jsonify({'conversations': conversations}), 200
        except Exception as e:
            import traceback
            print(f"Error in list_conversations: {e}")
            traceback.print_exc()
            return jsonify({'conversations': []}), 200

    # Messaging: get or send messages in a conversation
    @app.route('/api/messages/conversations/<int:conversation_id>/messages', methods=['GET', 'POST', 'OPTIONS'])
    @login_required
    def conversation_messages(conversation_id):
        if request.method == 'OPTIONS':
            return '', 200
        try:
            user_id = session.get('user_id')
            membership = db.execute_query(
                "SELECT 1 FROM conversation_members WHERE conversation_id = %s AND user_id = %s",
                (conversation_id, user_id)
            )
            if not membership:
                return jsonify({'error': 'Conversation not found'}), 404

            if request.method == 'GET':
                messages_rows = db.execute_query(
                    """
                    SELECT m.id, m.sender_id, m.message_text, m.image_url, m.created_at,
                           u.username, u.profile_pic
                    FROM messages m
                    INNER JOIN users u ON m.sender_id = u.id
                    WHERE m.conversation_id = %s
                    ORDER BY m.created_at DESC, m.id DESC
                    LIMIT 100
                    """,
                    (conversation_id,)
                ) or []
                messages_rows.reverse()  # chronological

                messages = []
                for row in messages_rows:
                    messages.append({
                        'id': row.get('id'),
                        'sender_id': row.get('sender_id'),
                        'sender_username': row.get('username'),
                        'message_text': row.get('message_text') or '',
                        'image_url': row.get('image_url'),
                        'created_at': str(row.get('created_at', '')),
                        'profile_pic': normalize_profile_pic(row.get('profile_pic'))
                    })

                conversation_payload = build_conversation_payload(conversation_id, user_id)
                return jsonify({'messages': messages, 'conversation': conversation_payload}), 200

            # POST - send message
            data = request.get_json() or {}
            message_text = (data.get('message_text') or '').strip()
            if not message_text:
                return jsonify({'error': 'Message text required'}), 400

            conn = db.get_connection()
            cur = conn.cursor(dictionary=True)
            cur.execute(
                "INSERT INTO messages (conversation_id, sender_id, message_text) VALUES (%s, %s, %s)",
                (conversation_id, user_id, message_text)
            )
            message_id = cur.lastrowid
            if not message_id:
                cur.execute("SELECT LAST_INSERT_ID() AS id")
                row = cur.fetchone()
                message_id = row.get('id') if row else None
            if not message_id:
                cur.execute("SELECT MAX(id) AS id FROM messages")
                row = cur.fetchone()
                message_id = row.get('id') if row else None
            try:
                conn.commit()
            except Exception:
                pass
            try:
                cur.close()
                conn.close()
            except Exception:
                pass

            message_row = db.execute_query(
                """
                SELECT m.id, m.sender_id, m.message_text, m.image_url, m.created_at, u.username, u.profile_pic
                FROM messages m
                INNER JOIN users u ON m.sender_id = u.id
                WHERE m.id = %s
                """,
                (message_id,)
            ) or []
            if not message_row:
                return jsonify({'error': 'Failed to send message'}), 500

            row = message_row[0]
            message_payload = {
                'id': row.get('id'),
                'sender_id': row.get('sender_id'),
                'sender_username': row.get('username'),
                'message_text': row.get('message_text') or '',
                'image_url': row.get('image_url'),
                'created_at': str(row.get('created_at', '')),
                'profile_pic': normalize_profile_pic(row.get('profile_pic'))
            }

            return jsonify({'message': message_payload, 'conversation_id': conversation_id}), 201
        except Exception as e:
            import traceback
            print(f"Error in conversation_messages: {e}")
            traceback.print_exc()
            return jsonify({'error': 'Failed to process message'}), 500
    
    # Serve assets
    @app.route('/assets/<path:filename>')
    def serve_assets(filename):
        return send_from_directory('assets', filename)
    
    # Serve HTML pages
    @app.route('/')
    def index():
        return send_from_directory('Frontend/html', 'index.html')
    
    @app.route('/login.html')
    def serve_login():
        return send_from_directory('Frontend/html', 'login.html')
    
    @app.route('/home.html')
    def serve_home():
        return send_from_directory('Frontend/html', 'home.html')
    
    @app.route('/signup.html')
    def serve_signup():
        return send_from_directory('Frontend/html', 'signup.html')
    
    @app.route('/create.html')
    def serve_create():
        return send_from_directory('Frontend/html', 'create.html')
    
    @app.route('/messages.html')
    def serve_messages():
        return send_from_directory('Frontend/html', 'messages.html')
    
    # Serve frontend files
    @app.route('/<path:filename>')
    def serve_frontend(filename):
        if filename.startswith('api/'):
            return {'error': 'Not found'}, 404
        
        base_dir = os.path.dirname(__file__)
        
        if filename.endswith('.html'):
            return send_from_directory('Frontend/html', filename.split('/')[-1])
        elif filename.endswith('.css'):
            return send_from_directory('Frontend/css', filename.split('/')[-1])
        elif filename.endswith('.js'):
            return send_from_directory('Frontend/js', filename.split('/')[-1])
        elif filename.startswith('assets/'):
            return send_from_directory('assets', filename.replace('assets/', ''))
        
        return {'error': 'Not found'}, 404
    
    return app

if __name__ == '__main__':
    app = create_app()
    print("Starting Instagram Clone API...")
    print(f"Database: {Config.DB_NAME}")
    print(f"Server running on http://localhost:5000")
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=5000, use_reloader=False, threaded=True)
