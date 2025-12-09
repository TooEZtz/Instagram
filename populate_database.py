"""
Database Population Script
Generates captions and comments for images
Populates the Instagram Clone database with users, posts, stories, likes, comments, and follows
"""
import os
import random
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from config import Config
from database import db
from auth import create_user, hash_password

# Test users to save
test_users = []

def get_image_files(folder_path):
    """Get all image files from a folder, excluding __MACOSX"""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    files = []
    
    if not os.path.exists(folder_path):
        return files
    
    for root, dirs, filenames in os.walk(folder_path):
        # Skip __MACOSX folders
        if '__MACOSX' in root:
            continue
        
        for filename in filenames:
            if any(filename.lower().endswith(ext) for ext in image_extensions):
                full_path = os.path.join(root, filename)
                files.append(full_path)
    
    return files

def generate_caption_and_hashtags(image_path):
    """Generate Instagram-style caption and hashtags based on image path/filename"""
    # Analyze image path to determine category
    path_lower = image_path.lower()
    filename = os.path.basename(image_path).lower()
    
    # Determine category from path/filename
    category = "general"
    if "nature" in path_lower or "forest" in path_lower or "tree" in path_lower or "mountain" in path_lower:
        category = "nature"
    elif "travel" in path_lower or "beach" in path_lower or "city" in path_lower or "landscape" in path_lower:
        category = "travel"
    elif "food" in path_lower or "meal" in path_lower or "restaurant" in path_lower:
        category = "food"
    elif "sunset" in path_lower or "sunrise" in path_lower:
        category = "sunset"
    elif "portrait" in path_lower or "people" in path_lower:
        category = "portrait"
    
    # Caption templates by category
    nature_captions = [
        "Lost in the beauty of nature 🌿 Every moment spent outdoors is a reminder of how incredible our planet is.",
        "Nature never fails to amaze me. The simple things are often the most beautiful ✨",
        "Taking a moment to appreciate the little things. Nature has a way of calming the soul 🌲",
        "There's something magical about being surrounded by nature. Pure serenity 🌳",
        "When life gets overwhelming, nature is always there to ground you 🌿"
    ]
    
    travel_captions = [
        "Wanderlust is calling ✈️ New adventures await around every corner.",
        "Collecting moments, not things. This journey has been incredible so far 🌍",
        "Travel isn't always pretty, but it's always worth it. Living my best life! 🗺️",
        "The world is a book, and those who don't travel read only one page 📖",
        "Adventure is out there! Making memories that will last a lifetime ✨"
    ]
    
    food_captions = [
        "Food is not just fuel, it's an experience 🍽️ This was absolutely delicious!",
        "Good food, good mood! Life's too short for boring meals 🍕",
        "Food brings people together. Sharing this amazing meal with amazing people ❤️",
        "When in doubt, eat! This dish was everything I needed and more 🍜",
        "Food photography is an art, and this plate is a masterpiece 📸"
    ]
    
    sunset_captions = [
        "Sunsets are proof that endings can be beautiful too 🌅",
        "Chasing sunsets and finding peace. Nature's daily masterpiece ✨",
        "There's nothing quite like a golden hour. This moment was pure magic 🌇",
        "Sunsets remind us that even the darkest days have beautiful endings 🌆",
        "Every sunset brings the promise of a new dawn. Grateful for this view 🌄"
    ]
    
    portrait_captions = [
        "Capturing genuine moments and real emotions 📸",
        "Life is better when you're surrounded by amazing people ❤️",
        "Authentic moments, real connections. This is what it's all about ✨",
        "Behind every smile is a story worth telling 📷",
        "Making memories with the people who matter most 💫"
    ]
    
    general_captions = [
        "Living in the moment and loving every second of it ✨",
        "Sometimes the best moments are the ones you don't plan 📸",
        "Life is beautiful when you take the time to notice the little things 🌟",
        "Making the most of today because tomorrow isn't promised 💫",
        "Grateful for this moment and all the moments that led here ❤️"
    ]
    
    # Select caption based on category
    caption_templates = {
        "nature": nature_captions,
        "travel": travel_captions,
        "food": food_captions,
        "sunset": sunset_captions,
        "portrait": portrait_captions,
        "general": general_captions
    }
    
    caption = random.choice(caption_templates.get(category, general_captions))
    
    # Generate hashtags based on category
    hashtag_pools = {
        "nature": [
            ["nature", "outdoors", "naturelovers", "wildlife", "forest"],
            ["nature", "trees", "greenery", "earth", "natural"],
            ["nature", "outdoor", "adventure", "explore", "wild"],
            ["nature", "green", "peaceful", "serenity", "calm"],
            ["nature", "landscape", "scenic", "beautiful", "earth"]
        ],
        "travel": [
            ["travel", "wanderlust", "adventure", "explore", "journey"],
            ["travel", "vacation", "trip", "destination", "wander"],
            ["travel", "adventure", "explore", "world", "travelgram"],
            ["travel", "wanderlust", "explore", "discover", "adventure"],
            ["travel", "journey", "trip", "explore", "wanderlust"]
        ],
        "food": [
            ["food", "foodie", "delicious", "yummy", "foodporn"],
            ["food", "foodstagram", "foodlover", "tasty", "eat"],
            ["food", "foodie", "delicious", "foodphotography", "yum"],
            ["food", "foodstagram", "foodlover", "tasty", "foodie"],
            ["food", "delicious", "foodporn", "foodphotography", "yummy"]
        ],
        "sunset": [
            ["sunset", "goldenhour", "sky", "beautiful", "photography"],
            ["sunset", "sunsetlovers", "sky", "goldenhour", "nature"],
            ["sunset", "goldenhour", "photography", "sky", "beautiful"],
            ["sunset", "sunsetlovers", "goldenhour", "sky", "nature"],
            ["sunset", "goldenhour", "sky", "photography", "beautiful"]
        ],
        "portrait": [
            ["portrait", "photography", "portraitphotography", "people", "lifestyle"],
            ["portrait", "photography", "people", "lifestyle", "portraitphotography"],
            ["portrait", "photography", "people", "lifestyle", "portraitphotography"],
            ["portrait", "photography", "people", "lifestyle", "portraitphotography"],
            ["portrait", "photography", "people", "lifestyle", "portraitphotography"]
        ],
        "general": [
            ["photography", "instagood", "photooftheday", "beautiful", "life"],
            ["photography", "instagood", "photooftheday", "beautiful", "lifestyle"],
            ["photography", "instagood", "photooftheday", "beautiful", "life"],
            ["photography", "instagood", "photooftheday", "beautiful", "lifestyle"],
            ["photography", "instagood", "photooftheday", "beautiful", "life"]
        ]
    }
    
    hashtag_list = random.choice(hashtag_pools.get(category, hashtag_pools["general"]))
    
    return caption, hashtag_list

def generate_comment():
    """Generate a realistic Instagram comment"""
    comments = [
        "Love this! ❤️",
        "Amazing! 🔥",
        "So beautiful! ✨",
        "This is incredible! 😍",
        "Wow! Just wow! 🌟",
        "Absolutely stunning! 💫",
        "This made my day! 😊",
        "Incredible shot! 📸",
        "Beautiful! ❤️",
        "So good! 🔥",
        "Love it! 💕",
        "This is everything! ✨",
        "Stunning! 😍",
        "Perfect! 👌",
        "Amazing work! 🎨",
        "This is art! 🖼️",
        "So inspiring! 💫",
        "Beautiful moment! 📷",
        "This is goals! 🎯",
        "Absolutely gorgeous! 😍",
        "Can't get enough of this! ❤️",
        "This is perfection! ✨",
        "So dreamy! 💭",
        "Incredible! 🔥",
        "Love the vibes! ✨",
        "This is everything I needed! 💫",
        "So beautiful it hurts! 😍",
        "This is pure magic! ✨",
        "Absolutely in love with this! ❤️",
        "This is stunning! 🌟"
    ]
    return random.choice(comments)

def copy_image_to_assets(source_path, destination_folder, subfolder, new_filename):
    """Copy image to assets folder in organized subfolders"""
    try:
        # Create organized folder structure: assets/images/posts/, assets/images/profiles/, etc.
        full_destination = os.path.join(destination_folder, subfolder)
        os.makedirs(full_destination, exist_ok=True)
        
        dest_path = os.path.join(full_destination, new_filename)
        shutil.copy2(source_path, dest_path)
        
        # Return relative path from assets/images/
        return os.path.join(subfolder, new_filename)
    except Exception as e:
        print(f"Error copying image: {e}")
        return None

def create_users():
    """Create multiple users in the database"""
    print("Creating users...")
    
    users_data = [
        {"username": "johndoe", "email": "john@example.com", "full_name": "John Doe", "bio": "Photography enthusiast 📸"},
        {"username": "janedoe", "email": "jane@example.com", "full_name": "Jane Doe", "bio": "Travel lover ✈️"},
        {"username": "traveler123", "email": "traveler@example.com", "full_name": "Alex Traveler", "bio": "Exploring the world one destination at a time 🌍"},
        {"username": "foodie_lover", "email": "foodie@example.com", "full_name": "Sarah Foodie", "bio": "Food is life 🍕"},
        {"username": "nature_photographer", "email": "nature@example.com", "full_name": "Mike Nature", "bio": "Capturing nature's beauty 🌿"},
        {"username": "adventure_seeker", "email": "adventure@example.com", "full_name": "Chris Adventure", "bio": "Life is an adventure 🏔️"},
        {"username": "wanderlust_soul", "email": "wander@example.com", "full_name": "Emma Wander", "bio": "Wanderlust and city lights ✨"},
        {"username": "sunset_chaser", "email": "sunset@example.com", "full_name": "Luna Sunset", "bio": "Chasing sunsets 🌅"},
        {"username": "mountain_explorer", "email": "mountain@example.com", "full_name": "Ryan Mountain", "bio": "Mountain enthusiast ⛰️"},
        {"username": "ocean_dreamer", "email": "ocean@example.com", "full_name": "Maya Ocean", "bio": "Ocean vibes 🌊"},
        {"username": "city_walker", "email": "city@example.com", "full_name": "Noah City", "bio": "Urban explorer 🏙️"},
        {"username": "forest_wanderer", "email": "forest@example.com", "full_name": "Ava Forest", "bio": "Lost in the woods 🌲"},
        {"username": "beach_lover", "email": "beach@example.com", "full_name": "Liam Beach", "bio": "Beach life 🏖️"},
        {"username": "sky_gazer", "email": "sky@example.com", "full_name": "Sophia Sky", "bio": "Looking up at the stars ⭐"},
        {"username": "desert_nomad", "email": "desert@example.com", "full_name": "Oliver Desert", "bio": "Desert wanderer 🏜️"},
    ]
    
    created_users = []
    
    for user_data in users_data:
        try:
            # Use a simple password for all users (you can change this)
            password = "Test1234!"
            user = create_user(
                username=user_data["username"],
                email=user_data["email"],
                password=password,
                full_name=user_data["full_name"],
                bio=user_data["bio"]
            )
            created_users.append({
                "id": user["id"],
                "username": user["username"],
                "email": user["email"],
                "password": password
            })
            print(f"Created user: {user_data['username']}")
        except Exception as e:
            print(f"Error creating user {user_data['username']}: {e}")
    
    # Save first 3 as test users
    if len(created_users) >= 3:
        test_users.extend(created_users[:3])
    
    return created_users

def assign_profile_pictures(users, profile_pics_folder):
    """Assign profile pictures to users"""
    print("Assigning profile pictures...")
    
    # Handle nested folder structure
    profile_path = os.path.join(profile_pics_folder, "ProfilePic")
    if not os.path.exists(profile_path):
        profile_path = profile_pics_folder
    
    profile_pics = get_image_files(profile_path)
    
    if not profile_pics:
        print("No profile pictures found!")
        return
    
    for i, user in enumerate(users):
        if i < len(profile_pics):
            pic_path = profile_pics[i]
            filename = f"profile_{user['id']}_{os.path.basename(pic_path)}"
            
            # Copy to assets/images/profiles/
            copied = copy_image_to_assets(
                pic_path,
                "assets/images",
                "profiles",
                filename
            )
            
            if copied:
                # Update user profile picture
                query = "UPDATE users SET profile_pic = %s WHERE id = %s"
                db.execute_query(query, (copied, user['id']))
                print(f"Assigned profile pic to {user['username']}")

def create_posts(users, images_folder):
    """Create posts from images and return list of posts with their hashtags"""
    print("Creating posts...")
    
    # Get images from different categories (handle nested folder structure)
    nature_path = os.path.join(images_folder, "Nature", "Nature")
    if not os.path.exists(nature_path):
        nature_path = os.path.join(images_folder, "Nature")
    
    travel_path = os.path.join(images_folder, "Travel", "Travel")
    if not os.path.exists(travel_path):
        travel_path = os.path.join(images_folder, "Travel")
    
    food_path = os.path.join(images_folder, "Food", "Food")
    if not os.path.exists(food_path):
        food_path = os.path.join(images_folder, "Food")
    
    nature_images = get_image_files(nature_path)
    travel_images = get_image_files(travel_path)
    food_images = get_image_files(food_path)
    
    all_images = nature_images + travel_images + food_images
    random.shuffle(all_images)
    
    posts_created = 0
    max_posts = min(50, len(all_images))  # Limit to 50 posts
    posts_data = []  # Store post_id and hashtags for later linking
    
    for i, image_path in enumerate(all_images[:max_posts]):
        try:
            # Assign to random user
            user = random.choice(users)
            
            # Generate caption and hashtags
            print(f"Processing image {i+1}/{max_posts}: {os.path.basename(image_path)}")
            caption, hashtag_list = generate_caption_and_hashtags(image_path)
            
            # Copy image to assets/images/posts/
            filename = f"post_{user['id']}_{posts_created + 1}_{os.path.basename(image_path)}"
            copied = copy_image_to_assets(
                image_path,
                "assets/images",
                "posts",
                filename
            )
            
            if not copied:
                continue
            
            # Create post (caption only, hashtags stored separately)
            query = """
                INSERT INTO posts (user_id, image_url, caption, likes_count, comments_count, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            
            # Random likes and comments count
            likes_count = random.randint(10, 500)
            comments_count = random.randint(0, 50)
            
            # Random date within last 30 days
            days_ago = random.randint(0, 30)
            created_at = datetime.now() - timedelta(days=days_ago)
            
            db.execute_query(query, (
                user['id'],
                copied,
                caption,  # Only caption, no hashtags
                likes_count,
                comments_count,
                created_at
            ))
            
            # Get the post ID
            post_query = "SELECT id FROM posts WHERE user_id = %s AND image_url = %s ORDER BY id DESC LIMIT 1"
            post_result = db.execute_query(post_query, (user['id'], copied))
            
            if post_result:
                post_id = post_result[0]['id']
                
                # Store post data with hashtags for later linking
                posts_data.append({
                    'id': post_id,
                    'hashtags': hashtag_list
                })
                
                # Create some likes
                create_likes_for_post(post_id, users, likes_count)
                
                # Create some comments
                create_comments_for_post(post_id, users, image_path, comments_count)
            
            posts_created += 1
            print(f"Created post {posts_created}/{max_posts}")
            
        except Exception as e:
            print(f"Error creating post from {image_path}: {e}")
            continue
    
    print(f"Created {posts_created} posts")
    return posts_data

def create_likes_for_post(post_id, users, likes_count):
    """Create likes for a post"""
    try:
        # Select random users to like the post
        likers = random.sample(users, min(likes_count, len(users)))
        
        for liker in likers:
            try:
                query = "INSERT INTO likes (user_id, post_id, created_at) VALUES (%s, %s, %s)"
                created_at = datetime.now() - timedelta(days=random.randint(0, 7))
                db.execute_query(query, (liker['id'], post_id, created_at))
            except:
                pass  # Like might already exist
    except Exception as e:
        print(f"Error creating likes: {e}")

def create_comments_for_post(post_id, users, image_path, comments_count):
    """Create comments for a post"""
    try:
        commenters = random.sample(users, min(comments_count, len(users)))
        
        for commenter in commenters:
            try:
                # Generate comment
                comment_text = generate_comment()
                
                query = "INSERT INTO comments (post_id, user_id, comment_text, created_at) VALUES (%s, %s, %s, %s)"
                created_at = datetime.now() - timedelta(days=random.randint(0, 7))
                db.execute_query(query, (post_id, commenter['id'], comment_text, created_at))
            except Exception as e:
                # Fallback to simple comment
                simple_comments = ["Love this! ❤️", "Amazing! 🔥", "So beautiful!", "Incredible!", "Wow! 😍"]
                comment_text = random.choice(simple_comments)
                query = "INSERT INTO comments (post_id, user_id, comment_text, created_at) VALUES (%s, %s, %s, %s)"
                created_at = datetime.now() - timedelta(days=random.randint(0, 7))
                db.execute_query(query, (post_id, commenter['id'], comment_text, created_at))
    except Exception as e:
        print(f"Error creating comments: {e}")

def create_stories(users, images_folder):
    """Create stories from images"""
    print("Creating stories...")
    
    # Get images from all categories (handle nested folder structure)
    nature_path = os.path.join(images_folder, "Nature", "Nature")
    if not os.path.exists(nature_path):
        nature_path = os.path.join(images_folder, "Nature")
    
    travel_path = os.path.join(images_folder, "Travel", "Travel")
    if not os.path.exists(travel_path):
        travel_path = os.path.join(images_folder, "Travel")
    
    food_path = os.path.join(images_folder, "Food", "Food")
    if not os.path.exists(food_path):
        food_path = os.path.join(images_folder, "Food")
    
    nature_images = get_image_files(nature_path)
    travel_images = get_image_files(travel_path)
    food_images = get_image_files(food_path)
    
    all_images = nature_images + travel_images + food_images
    random.shuffle(all_images)
    
    stories_created = 0
    max_stories = min(20, len(all_images))
    
    for i, image_path in enumerate(all_images[:max_stories]):
        try:
            user = random.choice(users)
            
            # Copy image to assets/images/stories/
            filename = f"story_{user['id']}_{stories_created + 1}_{os.path.basename(image_path)}"
            copied = copy_image_to_assets(
                image_path,
                "assets/images",
                "stories",
                filename
            )
            
            if not copied:
                continue
            
            # Create story (expires in 24 hours)
            created_at = datetime.now() - timedelta(hours=random.randint(0, 23))
            expires_at = created_at + timedelta(hours=24)
            
            query = """
                INSERT INTO stories (user_id, image_url, created_at, expires_at)
                VALUES (%s, %s, %s, %s)
            """
            
            db.execute_query(query, (user['id'], copied, created_at, expires_at))
            stories_created += 1
            
        except Exception as e:
            print(f"Error creating story: {e}")
            continue
    
    print(f"Created {stories_created} stories")

def create_follows(users):
    """Create realistic follow relationships with popular users and mutual follows"""
    print("Creating follow relationships...")
    
    follows_created = 0
    
    # Identify popular users (first 3-5 users get more followers)
    popular_users = users[:min(5, len(users))]
    regular_users = users[5:] if len(users) > 5 else []
    
    # Create follow relationships
    for user in users:
        # Popular users follow fewer people (they're busy being popular)
        # Regular users follow more people
        if user in popular_users:
            num_follows = random.randint(2, 5)
        else:
            num_follows = random.randint(5, min(12, len(users) - 1))
        
        # Mix of popular and regular users to follow
        available_users = [u for u in users if u['id'] != user['id']]
        following = random.sample(available_users, min(num_follows, len(available_users)))
        
        for followed_user in following:
            try:
                query = "INSERT INTO follows (follower_id, following_id, created_at) VALUES (%s, %s, %s)"
                created_at = datetime.now() - timedelta(days=random.randint(0, 60))
                db.execute_query(query, (user['id'], followed_user['id'], created_at))
                follows_created += 1
            except:
                pass  # Follow relationship might already exist
    
    # Create mutual follows (if A follows B, B might follow A back)
    print("Creating mutual follows...")
    mutual_follows = 0
    for user in users:
        # Get users this user follows
        query = "SELECT following_id FROM follows WHERE follower_id = %s"
        following_list = db.execute_query(query, (user['id'],))
        
        if following_list:
            # 30-50% chance of mutual follow
            for follow in following_list:
                if random.random() < 0.4:  # 40% chance
                    try:
                        # Check if reverse follow exists
                        check_query = "SELECT * FROM follows WHERE follower_id = %s AND following_id = %s"
                        exists = db.execute_query(check_query, (follow['following_id'], user['id']))
                        if not exists:
                            query = "INSERT INTO follows (follower_id, following_id, created_at) VALUES (%s, %s, %s)"
                            created_at = datetime.now() - timedelta(days=random.randint(0, 60))
                            db.execute_query(query, (follow['following_id'], user['id'], created_at))
                            mutual_follows += 1
                    except:
                        pass
    
    # Popular users get extra followers
    print("Adding followers to popular users...")
    for popular_user in popular_users:
        # Get current follower count
        query = "SELECT COUNT(*) as count FROM follows WHERE following_id = %s"
        result = db.execute_query(query, (popular_user['id'],))
        current_followers = result[0]['count'] if result else 0
        
        # Add 5-10 more followers
        extra_followers = random.randint(5, 10)
        available = [u for u in users if u['id'] != popular_user['id']]
        new_followers = random.sample(available, min(extra_followers, len(available)))
        
        for follower in new_followers:
            try:
                # Check if already following
                check_query = "SELECT * FROM follows WHERE follower_id = %s AND following_id = %s"
                exists = db.execute_query(check_query, (follower['id'], popular_user['id']))
                if not exists:
                    query = "INSERT INTO follows (follower_id, following_id, created_at) VALUES (%s, %s, %s)"
                    created_at = datetime.now() - timedelta(days=random.randint(0, 60))
                    db.execute_query(query, (follower['id'], popular_user['id'], created_at))
                    follows_created += 1
            except:
                pass
    
    print(f"Created {follows_created} follow relationships ({mutual_follows} mutual follows)")

def create_hashtags_and_link_posts(posts_data):
    """Create hashtags and link them to posts"""
    print("Creating hashtags and linking to posts...")
    
    # Dictionary to store hashtag IDs
    hashtag_dict = {}
    links_created = 0
    
    for post in posts_data:
        post_id = post['id']
        hashtags = post['hashtags']
        
        for tag_name in hashtags:
            try:
                # Get or create hashtag
                if tag_name not in hashtag_dict:
                    # Check if hashtag exists
                    check_query = "SELECT id FROM hashtags WHERE tag_name = %s"
                    existing = db.execute_query(check_query, (tag_name,))
                    
                    if existing:
                        hashtag_id = existing[0]['id']
                    else:
                        # Create new hashtag
                        insert_query = "INSERT INTO hashtags (tag_name) VALUES (%s)"
                        db.execute_query(insert_query, (tag_name,))
                        # Get the ID
                        result = db.execute_query(check_query, (tag_name,))
                        hashtag_id = result[0]['id'] if result else None
                    
                    hashtag_dict[tag_name] = hashtag_id
                else:
                    hashtag_id = hashtag_dict[tag_name]
                
                # Link post to hashtag
                if hashtag_id:
                    try:
                        link_query = "INSERT INTO post_hashtags (post_id, hashtag_id) VALUES (%s, %s)"
                        db.execute_query(link_query, (post_id, hashtag_id))
                        links_created += 1
                    except:
                        pass  # Link might already exist
            except Exception as e:
                print(f"Error creating hashtag {tag_name}: {e}")
                continue
    
    print(f"Created {len(hashtag_dict)} unique hashtags and {links_created} post-hashtag links")

def create_saved_posts(users, posts_data):
    """Create saved posts (users bookmarking posts)"""
    print("Creating saved posts...")
    
    saved_count = 0
    
    for user in users:
        # Each user saves 2-8 random posts
        num_saves = random.randint(2, min(8, len(posts_data)))
        posts_to_save = random.sample(posts_data, num_saves)
        
        for post in posts_to_save:
            try:
                # Don't save own posts (realistic behavior)
                post_owner_query = "SELECT user_id FROM posts WHERE id = %s"
                owner_result = db.execute_query(post_owner_query, (post['id'],))
                
                if owner_result and owner_result[0]['user_id'] != user['id']:
                    query = "INSERT INTO saved_posts (user_id, post_id, created_at) VALUES (%s, %s, %s)"
                    created_at = datetime.now() - timedelta(days=random.randint(0, 30))
                    db.execute_query(query, (user['id'], post['id'], created_at))
                    saved_count += 1
            except:
                pass  # Post might already be saved
    
    print(f"Created {saved_count} saved posts")

def create_conversations_and_messages(users):
    """Create realistic conversations and messages between users"""
    print("Creating conversations and messages...")
    
    conversations_created = 0
    messages_created = 0
    
    # Create conversations between users who follow each other (mutual follows)
    for user in users:
        # Get users this user follows
        following_query = "SELECT following_id FROM follows WHERE follower_id = %s"
        following_list = db.execute_query(following_query, (user['id'],))
        
        if following_list:
            # Check for mutual follows
            mutual_friends = []
            for follow in following_list:
                # Check if they follow back
                mutual_query = "SELECT * FROM follows WHERE follower_id = %s AND following_id = %s"
                is_mutual = db.execute_query(mutual_query, (follow['following_id'], user['id']))
                if is_mutual:
                    mutual_friends.append(follow['following_id'])
            
            # Create 1-3 conversations with mutual friends
            if mutual_friends:
                num_conversations = random.randint(1, min(3, len(mutual_friends)))
                friends_to_message = random.sample(mutual_friends, num_conversations)
                
                for friend_id in friends_to_message:
                    try:
                        # Check if conversation already exists
                        check_query = """
                            SELECT c.id FROM conversations c
                            INNER JOIN conversation_members cm1 ON c.id = cm1.conversation_id
                            INNER JOIN conversation_members cm2 ON c.id = cm2.conversation_id
                            WHERE cm1.user_id = %s AND cm2.user_id = %s
                        """
                        existing = db.execute_query(check_query, (user['id'], friend_id))
                        
                        if existing:
                            conversation_id = existing[0]['id']
                        else:
                            # Create new conversation
                            conv_query = "INSERT INTO conversations (created_at) VALUES (%s)"
                            created_at = datetime.now() - timedelta(days=random.randint(0, 90))
                            db.execute_query(conv_query, (created_at,))
                            
                            # Get conversation ID
                            get_id_query = "SELECT id FROM conversations ORDER BY id DESC LIMIT 1"
                            conv_result = db.execute_query(get_id_query)
                            conversation_id = conv_result[0]['id'] if conv_result else None
                            
                            if conversation_id:
                                # Add both users as members
                                member_query = "INSERT INTO conversation_members (conversation_id, user_id) VALUES (%s, %s)"
                                db.execute_query(member_query, (conversation_id, user['id']))
                                db.execute_query(member_query, (conversation_id, friend_id))
                                conversations_created += 1
                        
                        # Create 3-10 messages in this conversation
                        if conversation_id:
                            num_messages = random.randint(3, 10)
                            message_texts = [
                                "Hey! How are you?",
                                "What's up?",
                                "Check out my latest post!",
                                "That's awesome!",
                                "Thanks for the follow!",
                                "Love your content!",
                                "We should hang out sometime",
                                "Did you see that?",
                                "So cool!",
                                "Nice! 🔥"
                            ]
                            
                            for i in range(num_messages):
                                # Alternate between users
                                sender_id = user['id'] if i % 2 == 0 else friend_id
                                message_text = random.choice(message_texts)
                                
                                msg_query = """
                                    INSERT INTO messages (conversation_id, sender_id, message_text, created_at)
                                    VALUES (%s, %s, %s, %s)
                                """
                                # Messages spread over time
                                msg_time = datetime.now() - timedelta(
                                    days=random.randint(0, 30),
                                    hours=random.randint(0, 23),
                                    minutes=random.randint(0, 59)
                                )
                                db.execute_query(msg_query, (conversation_id, sender_id, message_text, msg_time))
                                messages_created += 1
                    except Exception as e:
                        print(f"Error creating conversation: {e}")
                        continue
    
    print(f"Created {conversations_created} conversations and {messages_created} messages")

def clear_database():
    """Clear all data from database tables (in correct order due to foreign keys)"""
    print("Clearing existing data from database...")
    
    try:
        # Clear in order to respect foreign key constraints
        tables_to_clear = [
            'messages',
            'conversation_members',
            'conversations',
            'saved_posts',
            'post_hashtags',
            'hashtags',
            'stories',
            'comments',
            'likes',
            'follows',
            'posts',
            'users'
        ]
        
        for table in tables_to_clear:
            try:
                query = f"DELETE FROM {table}"
                db.execute_query(query)
                print(f"Cleared {table} table")
            except Exception as e:
                print(f"Error clearing {table}: {e}")
        
        # Reset AUTO_INCREMENT
        for table in ['users', 'posts', 'comments', 'stories', 'conversations', 'hashtags']:
            try:
                query = f"ALTER TABLE {table} AUTO_INCREMENT = 1"
                db.execute_query(query)
            except:
                pass
        
        print("Database cleared successfully!")
        
    except Exception as e:
        print(f"Error clearing database: {e}")

def save_test_users():
    """Save test users to test.txt"""
    if test_users:
        with open("test.txt", "w") as f:
            f.write("Test Users for Instagram Clone\n")
            f.write("=" * 50 + "\n\n")
            for user in test_users:
                f.write(f"Username: {user['username']}\n")
                f.write(f"Email: {user['email']}\n")
                f.write(f"Password: {user['password']}\n")
                f.write(f"User ID: {user['id']}\n")
                f.write("-" * 50 + "\n\n")
        print(f"Saved {len(test_users)} test users to test.txt")

def main():
    """Main function to populate database"""
    print("=" * 60)
    print("Instagram Clone Database Population Script")
    print("=" * 60)
    
    # Connect to database
    if not db.connect():
        print("ERROR: Could not connect to database!")
        return
    
    try:
        images_folder = "Pictures-for-mysqql"
        profile_pics_folder = os.path.join(images_folder, "ProfilePic")
        
        # Check if folders exist
        if not os.path.exists(images_folder):
            print(f"ERROR: Images folder '{images_folder}' not found!")
            return
        
        # Step 0: Clear existing data
        clear_database()
        
        # Create organized folder structure in assets/images/
        print("Creating organized folder structure...")
        os.makedirs("assets/images/posts", exist_ok=True)
        os.makedirs("assets/images/profiles", exist_ok=True)
        os.makedirs("assets/images/stories", exist_ok=True)
        print("Folder structure created: assets/images/{posts, profiles, stories}/")
        
        # Step 1: Create users
        users = create_users()
        if not users:
            print("ERROR: No users created!")
            return
        
        # Step 2: Assign profile pictures
        assign_profile_pictures(users, profile_pics_folder)
        
        # Step 3: Create posts (returns posts with hashtags)
        posts_data = create_posts(users, images_folder)
        
        # Step 4: Create hashtags and link them to posts
        if posts_data:
            create_hashtags_and_link_posts(posts_data)
        
        # Step 5: Create stories
        create_stories(users, images_folder)
        
        # Step 6: Create follow relationships (realistic with popular users)
        create_follows(users)
        
        # Step 7: Create saved posts (users bookmarking posts)
        if posts_data:
            create_saved_posts(users, posts_data)
        
        # Step 8: Create conversations and messages (DMs)
        create_conversations_and_messages(users)
        
        # Step 9: Save test users
        save_test_users()
        
        print("\n" + "=" * 60)
        print("Database population completed successfully!")
        print("=" * 60)
        print(f"Created {len(users)} users")
        print("Check test.txt for test user credentials")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.disconnect()

if __name__ == "__main__":
    main()

