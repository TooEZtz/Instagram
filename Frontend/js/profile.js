/**
 * Profile page logic
 */

document.addEventListener('DOMContentLoaded', () => {
    loadNavProfile();
    loadProfile();
    setupLogout();
});

function getQueryUserId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('user');
    if (!id || id === 'me') return null;
    return id;
}

function loadProfile() {
    const targetId = getQueryUserId();
    const url = targetId
        ? `http://localhost:5000/api/user/${targetId}`
        : 'http://localhost:5000/api/user/me';

    fetch(url, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
        if (!data.user) return;
        renderProfile(data.user);
        loadProfilePosts(data.user.id);
    })
    .catch(err => {
        console.error('Error loading profile:', err);
    });
}

function renderProfile(user) {
    const avatarEl = document.getElementById('profile-avatar');
    const usernameEl = document.getElementById('profile-username');
    const fullnameEl = document.getElementById('profile-fullname');
    const bioEl = document.getElementById('profile-bio');
    const postsEl = document.getElementById('profile-posts');
    const followersEl = document.getElementById('profile-followers');
    const followingEl = document.getElementById('profile-following');
    const followBtn = document.getElementById('profile-follow-btn');
    const headerEl = document.querySelector('.profile-header');

    const profilePicPath = resolveProfilePic(user.profile_pic);
    if (avatarEl) avatarEl.style.backgroundImage = `url('${profilePicPath}')`;
    if (usernameEl) usernameEl.textContent = user.username || 'username';
    if (fullnameEl) fullnameEl.textContent = user.full_name || '';
    if (bioEl) bioEl.textContent = user.bio || '';
    if (postsEl) postsEl.textContent = `${user.posts_count || 0}`;
    if (followersEl) followersEl.textContent = `${user.followers_count || 0}`;
    if (followingEl) followingEl.textContent = `${user.following_count || 0}`;

    // Per-user gradient based on id/username + accent
    if (headerEl) {
        const seed = String(user.id || user.username || '0');
        const g = pickGradient(seed);
        // Apply directly and via vars to ensure visible change per user
        headerEl.style.background = g.bg;
        headerEl.style.setProperty('--profile-bg', g.bg);
        headerEl.style.setProperty('--accent', g.accent);
        const container = document.querySelector('.profile-container');
        if (container) container.style.setProperty('--accent', g.accent);
    }

    if (followBtn) {
        if (user.is_self) {
            followBtn.style.display = 'inline-flex';
            followBtn.textContent = 'Edit profile';
            followBtn.dataset.userId = '';
            followBtn.onclick = () => {
                // placeholder for edit profile action
            };
        } else {
            followBtn.style.display = 'inline-flex';
            followBtn.textContent = user.is_following ? 'Following' : 'Follow';
            followBtn.dataset.userId = user.id;
            followBtn.onclick = () => toggleFollow(user.id);
        }
    }
}

function toggleFollow(userId) {
    const btn = document.getElementById('profile-follow-btn');
    if (!btn) return;
    btn.disabled = true;
    fetch(`http://localhost:5000/api/follow/${userId}`, {
        method: 'POST',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.success) {
            btn.textContent = data.is_following ? 'Following' : 'Follow';
            const followersEl = document.getElementById('profile-followers');
            if (followersEl && typeof data.followers_count !== 'undefined') {
                followersEl.textContent = `${data.followers_count} followers`;
            }
        }
    })
    .catch(err => console.error('Follow error:', err))
    .finally(() => {
        btn.disabled = false;
    });
}

function loadProfilePosts(userId) {
    fetch(`http://localhost:5000/api/user/${userId}/posts`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        renderProfilePosts(data.posts || []);
    })
    .catch(err => console.error('Error loading profile posts:', err));
}

function renderProfilePosts(posts) {
    const gallery = document.getElementById('profile-gallery');
    if (!gallery) return;
    gallery.innerHTML = '';
    if (!posts.length) {
        const empty = document.createElement('div');
        empty.className = 'profile-gallery-empty';
        empty.textContent = 'No posts yet.';
        gallery.appendChild(empty);
        return;
    }
    posts.forEach(p => {
        const item = document.createElement('div');
        item.className = 'profile-gallery-item';
        const img = document.createElement('img');
        img.src = resolvePostImage(p.image_url);
        img.alt = p.caption || 'Post';
        img.loading = 'lazy';
        item.appendChild(img);

        const overlay = document.createElement('div');
        overlay.className = 'profile-gallery-overlay';
        const likeVal = Number(p.likes_count) || 0;
        const commentVal = Number(p.comments_count) || 0;
        const likes = document.createElement('span');
        likes.className = 'overlay-count';
        likes.innerHTML = `❤ ${likeVal}`;
        const comments = document.createElement('span');
        comments.className = 'overlay-count';
        comments.innerHTML = `💬 ${commentVal}`;
        overlay.appendChild(likes);
        overlay.appendChild(comments);
        item.appendChild(overlay);

        gallery.appendChild(item);
    });
}

function resolvePostImage(path) {
    const base = 'http://localhost:5000';
    if (!path) return '';
    const clean = String(path).replace(/\\/g, '/');
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.startsWith('/assets/')) return `${base}${clean}`;
    if (clean.startsWith('assets/')) return `${base}/${clean}`;
    if (clean.startsWith('images/')) return `${base}/assets/${clean}`;
    if (clean.startsWith('posts/')) return `${base}/assets/images/${clean}`;
    return `${base}/assets/images/posts/${clean.split('/').pop()}`;
}

function resolveProfilePic(pic) {
    const base = 'http://localhost:5000';
    if (!pic) return `${base}/assets/images/profiles/default.jpg`;
    const clean = String(pic).replace(/\\/g, '/');
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    if (clean.startsWith('/assets/')) return `${base}${clean}`;
    if (clean.startsWith('assets/')) return `${base}/${clean}`;
    if (clean.startsWith('images/')) return `${base}/assets/${clean}`;
    if (clean.startsWith('profiles/')) return `${base}/assets/images/${clean}`;
    return `${base}/assets/images/profiles/${clean.split('/').pop()}`;
}

function loadProfilePosts(userId) {
    fetch(`http://localhost:5000/api/user/${userId}/posts`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        console.log('Profile posts:', data.posts ? data.posts.length : 0);
        renderProfilePosts(data.posts || []);
    })
    .catch(err => console.error('Error loading profile posts:', err));
}

function renderProfilePosts(posts) {
    const gallery = document.getElementById('profile-gallery');
    if (!gallery) return;
    gallery.innerHTML = '';
    if (!posts.length) {
        const empty = document.createElement('div');
        empty.className = 'profile-gallery-empty';
        empty.textContent = 'No posts yet.';
        gallery.appendChild(empty);
        return;
    }
    posts.forEach(p => {
        const item = document.createElement('div');
        item.className = 'profile-gallery-item';
        const img = document.createElement('img');
        img.src = resolvePostImage(p.image_url);
        img.alt = p.caption || 'Post';
        img.loading = 'lazy';
        item.appendChild(img);

        const overlay = document.createElement('div');
        overlay.className = 'profile-gallery-overlay';
        const likes = document.createElement('span');
        likes.className = 'overlay-count';
        likes.innerHTML = `❤ ${p.likes_count || 0}`;
        const comments = document.createElement('span');
        comments.className = 'overlay-count';
        comments.innerHTML = `💬 ${p.comments_count || 0}`;
        overlay.appendChild(likes);
        overlay.appendChild(comments);
        item.appendChild(overlay);

        gallery.appendChild(item);
    });
}

function resolvePostImage(path) {
    if (!path) return '';
    const base = 'http://localhost:5000';
    const clean = path.replace(/\\/g, '/');
    // Absolute URL
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    // Already rooted at /assets
    if (clean.startsWith('/assets/')) return `${base}${clean}`;
    // Starts with assets/
    if (clean.startsWith('assets/')) return `${base}/${clean}`;
    // Starts with images/ or posts/
    if (clean.startsWith('images/')) return `${base}/assets/${clean}`;
    if (clean.startsWith('posts/')) return `${base}/assets/images/${clean}`;
    // Fallback to posts folder with just filename
    return `${base}/assets/images/posts/${clean.split('/').pop()}`;
}

function resolveProfilePic(pic) {
    const base = 'http://localhost:5000';
    if (!pic) return `${base}/assets/images/profiles/default.jpg`;
    const clean = pic.replace(/\\/g, '/');
    // Absolute URL
    if (clean.startsWith('http://') || clean.startsWith('https://')) return clean;
    // Already rooted at /assets
    if (clean.startsWith('/assets/')) return `${base}${clean}`;
    // Starts with assets/
    if (clean.startsWith('assets/')) return `${base}/${clean}`;
    // Starts with images/ or profiles/
    if (clean.startsWith('images/')) return `${base}/assets/${clean}`;
    if (clean.startsWith('profiles/')) return `${base}/assets/images/${clean}`;
    // Bare filename -> profiles folder
    return `${base}/assets/images/profiles/${clean.split('/').pop()}`;
}

function loadNavProfile() {
    fetch('http://localhost:5000/api/user/me', {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (!data.user) return;
        const { profile_pic, username } = data.user;
        const profilePicsSmall = document.querySelectorAll('.profile-pic-small');
        const profilePicLarge = document.querySelector('.profile-pic-large');
        const navProfileName = document.getElementById('nav-profile-name');
        const navProfile = document.querySelector('.nav-profile');

        const profilePicPath = resolveProfilePic(profile_pic);

        profilePicsSmall.forEach(pic => {
            pic.style.backgroundImage = `url('${profilePicPath}')`;
        });
        if (profilePicLarge) {
            profilePicLarge.style.backgroundImage = `url('${profilePicPath}')`;
            // Accent border for large pic to match theme
            const g = pickGradient(String(data.user.id || data.user.username || '0'));
            profilePicLarge.style.borderColor = g.accent;
        }
        if (navProfileName) {
            navProfileName.textContent = `@${username || 'username'}`;
        }
        // Theme the nav profile tile with the user's gradient
        if (navProfile) {
            const g = pickGradient(String(data.user.id || data.user.username || '0'));
            navProfile.style.background = g.bg;
            navProfile.style.borderColor = g.accent;
            navProfile.style.setProperty('--nav-accent', g.accent);
        }
    })
    .catch(err => console.error('Error loading nav profile:', err));
}

function setupLogout() {
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink && !logoutLink.dataset.bound) {
        logoutLink.dataset.bound = 'true';
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            fetch('http://localhost:5000/api/logout', {
                method: 'POST',
                credentials: 'include'
            })
            .then(() => window.location.href = 'login.html')
            .catch(() => window.location.href = 'login.html');
        });
    }
}
/**
 * Profile page logic
 */

document.addEventListener('DOMContentLoaded', () => {
    loadNavProfile();
    loadProfile();
    setupLogout();
});

function getQueryUserId() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('user');
    if (!id || id === 'me') return null;
    return id;
}

function loadProfile() {
    const targetId = getQueryUserId();
    const url = targetId
        ? `http://localhost:5000/api/user/${targetId}`
        : 'http://localhost:5000/api/user/me';

    fetch(url, { credentials: 'include' })
    .then(res => res.json())
    .then(data => {
        if (!data.user) return;
        renderProfile(data.user);
        loadProfilePosts(data.user.id);
    })
    .catch(err => {
        console.error('Error loading profile:', err);
    });
}

function renderProfile(user) {
    const avatarEl = document.getElementById('profile-avatar');
    const usernameEl = document.getElementById('profile-username');
    const fullnameEl = document.getElementById('profile-fullname');
    const bioEl = document.getElementById('profile-bio');
    const postsEl = document.getElementById('profile-posts');
    const followersEl = document.getElementById('profile-followers');
    const followingEl = document.getElementById('profile-following');
    const followBtn = document.getElementById('profile-follow-btn');

    const profilePicPath = resolveProfilePic(user.profile_pic);
    if (avatarEl) avatarEl.style.backgroundImage = `url('${profilePicPath}')`;
    if (usernameEl) usernameEl.textContent = user.username || 'username';
    if (fullnameEl) fullnameEl.textContent = user.full_name || '';
    if (bioEl) bioEl.textContent = user.bio || '';
    if (postsEl) postsEl.textContent = `${user.posts_count || 0}`;
    if (followersEl) postsEl.textContent = `${user.posts_count || 0}`;
    if (followersEl) followersEl.textContent = `${user.followers_count || 0}`;
    if (followingEl) followingEl.textContent = `${user.following_count || 0}`;

    if (followBtn) {
        if (user.is_self) {
            followBtn.style.display = 'inline-flex';
            followBtn.textContent = 'Edit profile';
            followBtn.dataset.userId = '';
            followBtn.onclick = () => {};
        } else {
            followBtn.style.display = 'inline-flex';
            followBtn.textContent = user.is_following ? 'Following' : 'Follow';
            followBtn.dataset.userId = user.id;
            followBtn.onclick = () => toggleFollow(user.id);
        }
    }
}

// Deterministic gradient picker from a seed
function pickGradient(seed) {
    const palettes = [
        { bg: 'linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)', accent: '#ff8fb1' },
        { bg: 'linear-gradient(135deg, #7f00ff 0%, #e100ff 100%)', accent: '#c46bff' },
        { bg: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)', accent: '#32b1ff' },
        { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', accent: '#2adf90' },
        { bg: 'linear-gradient(135deg, #f83600 0%, #f9d423 100%)', accent: '#f9a51a' },
        { bg: 'linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%)', accent: '#8f7bff' },
        { bg: 'linear-gradient(135deg, #141e30 0%, #243b55 100%)', accent: '#4f81ff' },
        { bg: 'linear-gradient(135deg, #834d9b 0%, #d04ed6 100%)', accent: '#d86ae8' }
    ];
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const idx = hash % palettes.length;
    return palettes[idx];
}

function toggleFollow(userId) {
    const btn = document.getElementById('profile-follow-btn');
    if (!btn) return;
    btn.disabled = true;
    fetch(`http://localhost:5000/api/follow/${userId}`, {
        method: 'POST',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (data && data.success) {
            btn.textContent = data.is_following ? 'Following' : 'Follow';
            const followersEl = document.getElementById('profile-followers');
            if (followersEl && typeof data.followers_count !== 'undefined') {
                followersEl.textContent = `${data.followers_count} followers`;
            }
        }
    })
    .catch(err => console.error('Follow error:', err))
    .finally(() => {
        btn.disabled = false;
    });
}

function resolveProfilePic(pic) {
    if (!pic) return '/assets/images/profiles/default.jpg';
    if (pic.startsWith('profiles/')) return `/assets/images/${pic}`;
    const clean = pic.replace(/\\/g, '/');
    if (clean.startsWith('profiles/')) return `/assets/images/${clean}`;
    return `/assets/images/profiles/${clean.split('/').pop()}`;
}

function loadNavProfile() {
    fetch('http://localhost:5000/api/user/me', {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (!data.user) return;
        const { profile_pic, username } = data.user;
        const profilePicsSmall = document.querySelectorAll('.profile-pic-small');
        const profilePicLarge = document.querySelector('.profile-pic-large');
        const navProfileName = document.getElementById('nav-profile-name');

        const profilePicPath = resolveProfilePic(profile_pic);

        profilePicsSmall.forEach(pic => {
            pic.style.backgroundImage = `url('${profilePicPath}')`;
        });
        if (profilePicLarge) {
            profilePicLarge.style.backgroundImage = `url('${profilePicPath}')`;
        }
        if (navProfileName) {
            navProfileName.textContent = `@${username || 'username'}`;
        }
    })
    .catch(err => console.error('Error loading nav profile:', err));
}

function setupLogout() {
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink && !logoutLink.dataset.bound) {
        logoutLink.dataset.bound = 'true';
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            fetch('http://localhost:5000/api/logout', {
                method: 'POST',
                credentials: 'include'
            })
            .then(() => window.location.href = 'login.html')
            .catch(() => window.location.href = 'login.html');
        });
    }
}

