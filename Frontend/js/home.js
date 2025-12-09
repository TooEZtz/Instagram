/**
 * Home page JavaScript
 * Handles interactions for the Instagram home feed
 */

// Flag to track if interactions are already set up
let interactionsSetup = false;

// Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    checkLoginStatus().then(() => {
        loadFeed();
        loadStories();
        loadUserInfo();
        if (!interactionsSetup) {
            setupInteractions();
            interactionsSetup = true;
        }
        setupHorizontalScroll();
    });
});

/**
 * Enable horizontal scrolling with mouse wheel
 */
function setupHorizontalScroll() {
    const mainContent = document.querySelector('.main-content');
    
    if (mainContent) {
        mainContent.addEventListener('wheel', function(e) {
            // Prevent default vertical scrolling
            e.preventDefault();
            
            // Convert vertical wheel movement to horizontal scroll
            const scrollAmount = e.deltaY;
            this.scrollLeft += scrollAmount;
        }, { passive: false });
        
        // Also add to window for better capture
        window.addEventListener('wheel', function(e) {
            const mainContent = document.querySelector('.main-content');
            if (mainContent && e.target.closest('.main-content')) {
                e.preventDefault();
                const scrollAmount = e.deltaY;
                mainContent.scrollLeft += scrollAmount;
            }
        }, { passive: false });
    }
}

/**
 * Check if user is logged in, redirect if not
 */
function checkLoginStatus() {
    return fetch('http://localhost:5000/api/check-session', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (!data.logged_in) {
            window.location.href = 'login.html';
            return Promise.reject('Not logged in');
        }
        return data;
    })
    .catch(error => {
        console.error('Error checking session:', error);
        window.location.href = 'login.html';
    });
}

/**
 * Load and display feed posts
 */
function loadFeed() {
    fetch('http://localhost:5000/api/feed', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        console.log('Feed response status:', response.status);
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || `HTTP error! status: ${response.status}`);
            }).catch(() => {
                throw new Error(`HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Feed data received:', data);
        console.log('Posts count:', data.posts ? data.posts.length : 0);
        
        if (data.error) {
            console.error('Feed API error:', data.error);
            const postsContainer = document.querySelector('.posts-container');
            if (postsContainer) {
                postsContainer.innerHTML = `<div class="no-posts" style="color: #ed4956; padding: 20px; text-align: center;">Error: ${data.error}</div>`;
            }
            return;
        }
        
        if (data.posts && data.posts.length > 0) {
            console.log(`✓ Rendering ${data.posts.length} posts`);
            renderPosts(data.posts);
        } else {
            console.log('No posts in response');
            const postsContainer = document.querySelector('.posts-container');
            if (postsContainer) {
                postsContainer.innerHTML = '<div class="no-posts" style="padding: 20px; text-align: center; color: #8e8e8e;">No posts to show. Follow some users to see their posts!</div>';
            }
        }
    })
    .catch(error => {
        console.error('Error loading feed:', error);
        const postsContainer = document.querySelector('.posts-container');
        if (postsContainer) {
            postsContainer.innerHTML = `<div class="no-posts" style="color: #ed4956; padding: 20px;">Failed to load posts. Check console for details.</div>`;
        }
    });
}

/**
 * Render posts to the DOM
 */
function renderPosts(posts) {
    const postsContainer = document.querySelector('.posts-container');
    if (!postsContainer) {
        console.error('Posts container not found!');
        return;
    }
    
    console.log(`Rendering ${posts.length} posts to container`);
    postsContainer.innerHTML = '';
    
    posts.forEach((post, index) => {
        try {
            const postElement = createPostElement(post);
            postsContainer.appendChild(postElement);
            console.log(`Post ${index + 1} rendered: ${post.username}`);
        } catch (error) {
            console.error(`Error rendering post ${index + 1}:`, error, post);
        }
    });
    
    // Interactions are already set up via event delegation, no need to re-setup
}

/**
 * Create a post element from post data
 */
function createPostElement(post) {
    const article = document.createElement('article');
    article.className = 'post';
    article.dataset.postId = post.id;
    
    // Theme per user (reuse gradient picker)
    const seed = String(post.user_id || post.username || '0');
    const gradient = pickGradient(seed);
    article.style.background = gradient.bg;
    article.style.setProperty('--post-accent', gradient.accent);
    
    // Format time
    const timeAgo = formatTimeAgo(post.created_at);
    
    // Profile pic path - normalize and construct correct path
    let profilePicPath;
    if (!post.profile_pic) {
        profilePicPath = `/assets/images/profiles/default.jpg`;
    } else if (post.profile_pic.startsWith('profiles/')) {
        profilePicPath = `/assets/images/${post.profile_pic}`;
    } else if (post.profile_pic.includes('profile') || post.profile_pic.includes('\\')) {
        // Handle Windows paths or profile in name
        const cleanPath = post.profile_pic.replace(/\\/g, '/');
        if (cleanPath.startsWith('profiles/')) {
            profilePicPath = `/assets/images/${cleanPath}`;
        } else {
            profilePicPath = `/assets/images/profiles/${cleanPath.split('/').pop()}`;
        }
    } else {
        profilePicPath = `/assets/images/profiles/${post.profile_pic}`;
    }
    
    // Post image path - normalize and construct correct path
    let postImagePath;
    if (!post.image_url) {
        postImagePath = '';
    } else if (post.image_url.startsWith('posts/')) {
        postImagePath = `/assets/images/${post.image_url}`;
    } else if (post.image_url.includes('post') || post.image_url.includes('\\')) {
        // Handle Windows paths or post in name
        const cleanPath = post.image_url.replace(/\\/g, '/');
        if (cleanPath.startsWith('posts/')) {
            postImagePath = `/assets/images/${cleanPath}`;
        } else {
            postImagePath = `/assets/images/posts/${cleanPath.split('/').pop()}`;
        }
    } else {
        postImagePath = `/assets/images/posts/${post.image_url}`;
    }
    
    article.innerHTML = `
        <div class="post-header">
            <div class="post-user">
                <div class="post-avatar" style="background-image: url('${profilePicPath}')"></div>
                <span class="post-username">${post.username}</span>
            </div>
            <button class="post-more">⋯</button>
        </div>
        <div class="post-image">
            <img src="${postImagePath}" alt="Post by ${post.username}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="placeholder-image" style="display: none;">📷</div>
        </div>
        <div class="post-actions">
            <div class="post-actions-left">
                <button class="action-btn like-btn ${post.is_liked ? 'liked' : ''}" data-post-id="${post.id}">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="${post.is_liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" class="like-icon">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
                <button class="action-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
                <button class="action-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 1l4 4-4 4"></path>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                        <path d="M7 23l-4-4 4-4"></path>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                    </svg>
                </button>
            </div>
            <button class="action-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
        </div>
        <div class="post-likes">
            <strong>${formatNumber(post.likes_count)} ${post.likes_count === 1 ? 'like' : 'likes'}</strong>
        </div>
        <div class="post-caption">
            <strong>${post.username}</strong> ${post.caption || ''}
        </div>
        <div class="post-comments">
            ${post.comments_count > 3 ? `<a href="#" class="view-comments">View all ${post.comments_count} comments</a>` : ''}
            ${post.comments.map(comment => `
                <div class="comment-item">
                    <strong>${comment.username}</strong> ${comment.comment_text}
                </div>
            `).join('')}
        </div>
        <div class="post-time">${timeAgo}</div>
        <div class="post-add-comment">
            <input type="text" placeholder="Add a comment..." class="comment-input" data-post-id="${post.id}">
            <button class="post-btn">Post</button>
        </div>
    `;
    
    return article;
}

/**
 * Load and display stories
 */
function loadStories() {
    fetch('http://localhost:5000/api/stories', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        console.log('Stories response status:', response.status);
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.error || `HTTP error! status: ${response.status}`);
            }).catch(() => {
                throw new Error(`HTTP error! status: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Stories data:', data);
        if (data.error) {
            console.error('Stories API error:', data.error);
            return;
        }
        if (data.stories && data.stories.length > 0) {
            console.log(`Rendering ${data.stories.length} stories`);
            window._storiesCache = data.stories;
            renderStories(data.stories);
        } else {
            console.log('No stories found');
            window._storiesCache = [];
        }
    })
    .catch(error => {
        console.error('Error loading stories:', error);
    });
}

/**
 * Render stories to the DOM
 */
function renderStories(stories) {
    const storiesContainer = document.querySelector('.stories-bottom-scroll');
    if (!storiesContainer) {
        console.error('Stories container not found!');
        return;
    }
    
    console.log(`Rendering ${stories.length} stories`);
    storiesContainer.innerHTML = '';
    
    // Add "Your Story" first
    const yourStory = document.createElement('div');
    yourStory.className = 'story-item-bottom';
    yourStory.innerHTML = `
        <div class="story-avatar-bottom your-story">
            <div class="story-pic-bottom"></div>
            <span class="story-add-bottom">+</span>
        </div>
        <span class="story-username-bottom">${window._currentUserUsername || 'Your Story'}</span>
    `;
    const yourPic = yourStory.querySelector('.story-pic-bottom');
    if (yourPic) {
        const picPath = window._currentUserProfilePicPath || '/assets/images/profiles/default.jpg';
        yourPic.style.backgroundImage = `url('${picPath}')`;
    }
    storiesContainer.appendChild(yourStory);
    
    // Add other stories
    stories.forEach(story => {
        const storyElement = createStoryElement(story);
        storiesContainer.appendChild(storyElement);
    });
}

/**
 * Create a story element
 */
function createStoryElement(story) {
    const div = document.createElement('div');
    div.className = 'story-item-bottom';
    div.dataset.storyId = story.id;
    div.dataset.storyUsername = story.username;
    div.dataset.storyImage = story.image_url || '';
    div.dataset.storyProfile = story.profile_pic || '';
    
    // Profile pic path for stories
    let profilePicPath;
    if (!story.profile_pic) {
        profilePicPath = `/assets/images/profiles/default.jpg`;
    } else if (story.profile_pic.startsWith('profiles/')) {
        profilePicPath = `/assets/images/${story.profile_pic}`;
    } else if (story.profile_pic.includes('profile') || story.profile_pic.includes('\\')) {
        // Handle Windows paths or profile in name
        const cleanPath = story.profile_pic.replace(/\\/g, '/');
        if (cleanPath.startsWith('profiles/')) {
            profilePicPath = `/assets/images/${cleanPath}`;
        } else {
            profilePicPath = `/assets/images/profiles/${cleanPath.split('/').pop()}`;
        }
    } else {
        profilePicPath = `/assets/images/profiles/${story.profile_pic}`;
    }
    
    div.innerHTML = `
        <div class="story-avatar-bottom">
            <div class="story-pic-bottom" style="background-image: url('${profilePicPath}')"></div>
        </div>
        <span class="story-username-bottom">${story.username}</span>
    `;
    
    return div;
}

// Helper to update the "Your Story" tile after user info arrives
function updateYourStoryTile() {
    const yourPic = document.querySelector('.story-item-bottom .your-story .story-pic-bottom');
    const yourLabel = document.querySelector('.story-item-bottom .story-username-bottom');
    const picPath = window._currentUserProfilePicPath || '/assets/images/profiles/default.jpg';
    const username = window._currentUserUsername || 'Your Story';
    if (yourPic) yourPic.style.backgroundImage = `url('${picPath}')`;
    if (yourLabel) yourLabel.textContent = username;
}

/**
 * Load current user info
 */
function loadUserInfo() {
    fetch('http://localhost:5000/api/user/me', {
        method: 'GET',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.user) {
            // Update profile pics in navbar
            const profilePicsSmall = document.querySelectorAll('.profile-pic-small');
            const profilePicLarge = document.querySelector('.profile-pic-large');
            const navProfileName = document.getElementById('nav-profile-name');
            const navProfile = document.querySelector('.nav-profile');

            let profilePicPath;
            if (data.user.profile_pic && data.user.profile_pic.startsWith('profiles/')) {
                profilePicPath = `/assets/images/${data.user.profile_pic}`;
            } else if (data.user.profile_pic && data.user.profile_pic.includes('profile')) {
                profilePicPath = `/assets/images/profiles/${data.user.profile_pic.split('/').pop()}`;
            } else {
                profilePicPath = `/assets/images/profiles/${data.user.profile_pic || 'default.jpg'}`;
            }
            
            // cache current user info for stories
            window._currentUserProfilePicPath = profilePicPath;
            window._currentUserUsername = data.user.username || 'username';
            
            profilePicsSmall.forEach(pic => {
                pic.style.backgroundImage = `url('${profilePicPath}')`;
            });
            if (profilePicLarge) {
                profilePicLarge.style.backgroundImage = `url('${profilePicPath}')`;
                const g = pickGradient(String(data.user.id || data.user.username || '0'));
                profilePicLarge.style.borderColor = g.accent;
            }
            if (navProfileName) {
                navProfileName.textContent = `@${data.user.username || 'username'}`;
            }
            if (navProfile) {
                const g = pickGradient(String(data.user.id || data.user.username || '0'));
                navProfile.style.background = g.bg;
                navProfile.style.borderColor = g.accent;
                navProfile.style.setProperty('--nav-accent', g.accent);
            }

            // Update "Your Story" tile if rendered
            updateYourStoryTile();
        }
    })
    .catch(error => {
        console.error('Error loading user info:', error);
    });
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format time ago
 */
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'JUST NOW';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'MINUTE' : 'MINUTES'} AGO`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'HOUR' : 'HOURS'} AGO`;
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'DAY' : 'DAYS'} AGO`;
    return date.toLocaleDateString();
}

/**
 * Setup interactive elements
 */
function setupInteractions() {
    // Logout click
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            fetch('http://localhost:5000/api/logout', {
                method: 'POST',
                credentials: 'include'
            })
            .then(() => {
                window.location.href = 'login.html';
            })
            .catch(() => {
                window.location.href = 'login.html';
            });
        });
    }

    // Story click - event delegation on stories-bottom-scroll
    document.addEventListener('click', function(e) {
        const storyItem = e.target.closest('.story-item-bottom');
        if (storyItem) {
            const storyId = storyItem.dataset.storyId;
            openStoryViewerById(storyId);
        }
    });

    // Story viewer controls
    const storyCloseBtn = document.getElementById('story-close');
    const storyPrevBtn = document.getElementById('story-prev');
    const storyNextBtn = document.getElementById('story-next');
    const storyOverlay = document.getElementById('story-overlay');

    if (storyCloseBtn) {
        storyCloseBtn.addEventListener('click', closeStoryViewer);
    }
    if (storyPrevBtn) {
        storyPrevBtn.addEventListener('click', () => navigateStory(-1));
    }
    if (storyNextBtn) {
        storyNextBtn.addEventListener('click', () => navigateStory(1));
    }
    if (storyOverlay) {
        storyOverlay.addEventListener('click', (e) => {
            if (e.target === storyOverlay) {
                closeStoryViewer();
            }
        });
    }

    // Like button functionality - use event delegation for dynamically added posts
    document.addEventListener('click', function(e) {
        if (e.target.closest('.like-btn')) {
            const btn = e.target.closest('.like-btn');
            const postId = btn.dataset.postId;
            if (postId) {
                toggleLike(postId, btn);
            }
        }
    });

    // Comment input functionality - use event delegation
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('comment-input')) {
            const input = e.target;
            const postBtn = input.nextElementSibling;
            if (postBtn && postBtn.classList.contains('post-btn')) {
                if (input.value.trim().length > 0) {
                    postBtn.disabled = false;
                    postBtn.style.opacity = '1';
                } else {
                    postBtn.disabled = true;
                    postBtn.style.opacity = '0.3';
                }
            }
        }
    });

    // Post comment on Enter key
    document.addEventListener('keypress', function(e) {
        if (e.target.classList.contains('comment-input') && e.key === 'Enter') {
            if (e.target.value.trim().length > 0) {
                postComment(e.target);
            }
        }
    });

    // Post comment on button click
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('post-btn') && !e.target.disabled) {
            const input = e.target.previousElementSibling;
            if (input && input.classList.contains('comment-input') && input.value.trim().length > 0) {
                e.preventDefault();
                e.stopPropagation();
                postComment(input);
            }
        }
    });
}

// Track if a like request is in progress to prevent double-clicks
const likeRequestsInProgress = new Set();

/**
 * Toggle like on a post
 */
function toggleLike(postId, button) {
    // Prevent double-clicks
    if (likeRequestsInProgress.has(postId)) {
        return;
    }
    
    likeRequestsInProgress.add(postId);
    
    fetch(`http://localhost:5000/api/posts/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update button state
            const svg = button.querySelector('svg.like-icon') || button.querySelector('svg');
            if (data.is_liked) {
                button.classList.add('liked');
                if (svg) svg.setAttribute('fill', 'currentColor');
            } else {
                button.classList.remove('liked');
                if (svg) svg.setAttribute('fill', 'none');
            }
            
            // Update likes count
            const postElement = button.closest('.post');
            if (postElement) {
                const likesElement = postElement.querySelector('.post-likes strong');
                if (likesElement) {
                    likesElement.textContent = `${formatNumber(data.likes_count)} ${data.likes_count === 1 ? 'like' : 'likes'}`;
                }
            }
        }
    })
    .catch(error => {
        console.error('Error toggling like:', error);
    })
    .finally(() => {
        // Remove from in-progress set after a short delay
        setTimeout(() => {
            likeRequestsInProgress.delete(postId);
        }, 500);
    });
}

// Track comment requests in progress to prevent double-posting
const commentRequestsInProgress = new Set();

/**
 * Post a comment
 */
function postComment(input) {
    const commentText = input.value.trim();
    if (commentText.length === 0) return;

    const postId = input.dataset.postId;
    if (!postId) {
        console.error('Post ID not found');
        return;
    }

    // Prevent double-posting
    if (commentRequestsInProgress.has(postId)) {
        return;
    }
    
    commentRequestsInProgress.add(postId);

    const postBtn = input.nextElementSibling;
    
    // Disable input and button while posting
    input.disabled = true;
    if (postBtn) {
        postBtn.disabled = true;
    }

    fetch(`http://localhost:5000/api/posts/${postId}/comment`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            comment_text: commentText
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Clear input
            input.value = '';
            input.disabled = false;
            if (postBtn) {
                postBtn.disabled = true;
                postBtn.style.opacity = '0.3';
            }
            
            // Add comment to the comments section
            const postElement = input.closest('.post');
            if (postElement && data.comment) {
                const commentsContainer = postElement.querySelector('.post-comments');
                if (commentsContainer) {
                    // Create comment element
                    const commentDiv = document.createElement('div');
                    commentDiv.className = 'comment-item';
                    commentDiv.innerHTML = `<strong>${data.comment.username}</strong> ${data.comment.comment_text}`;
                    
                    // Insert at the beginning (most recent first)
                    const viewAllLink = commentsContainer.querySelector('.view-comments');
                    if (viewAllLink) {
                        commentsContainer.insertBefore(commentDiv, viewAllLink);
                    } else {
                        commentsContainer.insertBefore(commentDiv, commentsContainer.firstChild);
                    }
                    
                    // Update comments count if there's a "View all" link
                    if (viewAllLink && data.comments_count > 3) {
                        viewAllLink.textContent = `View all ${data.comments_count} comments`;
                    }
                }
            }
        } else {
            console.error('Failed to post comment:', data.error);
            input.disabled = false;
            if (postBtn) {
                postBtn.disabled = false;
            }
        }
    })
    .catch(error => {
        console.error('Error posting comment:', error);
        input.disabled = false;
        if (postBtn) {
            postBtn.disabled = false;
        }
    })
    .finally(() => {
        // Remove from in-progress set after a short delay
        setTimeout(() => {
            commentRequestsInProgress.delete(postId);
        }, 500);
    });
}

/**
 * Handle story clicks
 */
document.querySelectorAll('.story-item').forEach(story => {
    story.addEventListener('click', function() {
        // TODO: Open story viewer
        console.log('Story clicked');
    });
});

// Deterministic gradient picker
function pickGradient(seed) {
    const palettes = [
        { bg: 'linear-gradient(145deg, #1f1c2c 0%, #2b233d 100%)', accent: '#8d7bff' },
        { bg: 'linear-gradient(145deg, #1e1b22 0%, #2b1f29 100%)', accent: '#e26aa7' },
        { bg: 'linear-gradient(145deg, #182735 0%, #0e1927 100%)', accent: '#3f9bff' },
        { bg: 'linear-gradient(145deg, #1a2d25 0%, #0f1d18 100%)', accent: '#36c992' },
        { bg: 'linear-gradient(145deg, #2b2215 0%, #1b140f 100%)', accent: '#e69a3d' },
        { bg: 'linear-gradient(145deg, #241a32 0%, #171025 100%)', accent: '#b874ff' },
        { bg: 'linear-gradient(145deg, #1a1b27 0%, #0d0f18 100%)', accent: '#5f9dff' },
        { bg: 'linear-gradient(145deg, #21182b 0%, #140f1d 100%)', accent: '#d65be5' }
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    return palettes[hash % palettes.length];
}

// Story viewer state
window._storiesCache = [];
let _currentStoryIndex = -1;

function openStoryViewerById(storyId) {
    const stories = window._storiesCache || [];
    const idx = stories.findIndex(s => String(s.id) === String(storyId));
    if (idx === -1) return;
    _currentStoryIndex = idx;
    showStoryAtIndex(idx);
}

function showStoryAtIndex(idx) {
    const stories = window._storiesCache || [];
    if (idx < 0 || idx >= stories.length) return;

    const story = stories[idx];
    const overlay = document.getElementById('story-overlay');
    const img = document.getElementById('story-image');
    const usernameEl = document.getElementById('story-username');
    const avatarEl = document.getElementById('story-avatar');

    if (!overlay || !img || !usernameEl || !avatarEl) return;

    // Resolve image path
    let imagePath = '';
    if (story.image_url) {
        if (story.image_url.startsWith('posts/') || story.image_url.startsWith('stories/')) {
            imagePath = `/assets/images/${story.image_url}`;
        } else {
            const cleanPath = story.image_url.replace(/\\/g, '/');
            if (cleanPath.startsWith('posts/') || cleanPath.startsWith('stories/')) {
                imagePath = `/assets/images/${cleanPath}`;
            } else {
                imagePath = `/assets/images/stories/${cleanPath.split('/').pop()}`;
            }
        }
    }

    // Resolve avatar
    let avatarPath = '/assets/images/profiles/default.jpg';
    if (story.profile_pic) {
        if (story.profile_pic.startsWith('profiles/')) {
            avatarPath = `/assets/images/${story.profile_pic}`;
        } else {
            const cleanAvatar = story.profile_pic.replace(/\\/g, '/');
            if (cleanAvatar.startsWith('profiles/')) {
                avatarPath = `/assets/images/${cleanAvatar}`;
            } else {
                avatarPath = `/assets/images/profiles/${cleanAvatar.split('/').pop()}`;
            }
        }
    }

    img.src = imagePath || '';
    img.alt = story.username || 'Story';
    usernameEl.textContent = story.username || 'unknown';
    avatarEl.style.backgroundImage = `url('${avatarPath}')`;

    overlay.classList.remove('hidden');
}

function closeStoryViewer() {
    const overlay = document.getElementById('story-overlay');
    if (overlay) overlay.classList.add('hidden');
    _currentStoryIndex = -1;
}

function navigateStory(direction) {
    const stories = window._storiesCache || [];
    if (!stories.length || _currentStoryIndex === -1) return;
    let next = _currentStoryIndex + direction;
    if (next < 0) next = stories.length - 1;
    if (next >= stories.length) next = 0;
    _currentStoryIndex = next;
    showStoryAtIndex(next);
}

