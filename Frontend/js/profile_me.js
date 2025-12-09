/**
 * Profile page for the logged-in user (edit button, no follow toggle)
 */

document.addEventListener('DOMContentLoaded', () => {
    loadNavProfile();
    loadMyProfile();
    setupLogout();
    setupEditModal();
});

function loadMyProfile() {
    fetch('http://localhost:5000/api/user/me', {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (!data.user) return;
        renderProfile(data.user);
        loadProfilePosts(data.user.id);
        window._profileMeUser = data.user;
    })
    .catch(err => console.error('Error loading profile:', err));
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

    // Per-user gradient
    if (headerEl) {
        const seed = String(user.id || user.username || '0');
        const g = pickGradient(seed);
        headerEl.style.background = g.bg;
        headerEl.style.setProperty('--profile-bg', g.bg);
        headerEl.style.setProperty('--accent', g.accent);
        const container = document.querySelector('.profile-container');
        if (container) container.style.setProperty('--accent', g.accent);
    }

    if (followBtn) {
        followBtn.style.display = 'inline-flex';
        followBtn.textContent = 'Edit profile';
        followBtn.dataset.userId = '';
        followBtn.onclick = () => {
            const modal = document.getElementById('edit-modal');
            const bioInput = document.getElementById('edit-bio');
            const privateInput = document.getElementById('edit-private');
            const fileName = document.getElementById('edit-file-name');
            const preview = document.getElementById('edit-preview');
            const previewUsername = document.getElementById('edit-preview-username');
            const previewBio = document.getElementById('edit-preview-bio');
            if (bioInput) bioInput.value = user.bio || '';
            if (privateInput) privateInput.checked = !!user.is_private;
            if (fileName) fileName.textContent = 'No file chosen';
            const currentPic = resolveProfilePic(user.profile_pic);
            if (preview) preview.style.backgroundImage = currentPic ? `url('${currentPic}')` : 'none';
            if (previewUsername) previewUsername.textContent = `@${user.username || 'you'}`;
            if (previewBio) previewBio.textContent = user.bio || 'Tell us your story.';
            if (modal) modal.classList.remove('hidden');
        };
    }
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

function setupEditModal() {
    const modal = document.getElementById('edit-modal');
    const cancelBtn = document.getElementById('edit-cancel');
    const saveBtn = document.getElementById('edit-save');
    const bioInput = document.getElementById('edit-bio');
    const privateInput = document.getElementById('edit-private');
    const fileInput = document.getElementById('edit-profile-pic');
    const chooseBtn = document.getElementById('edit-file-btn');
    const fileName = document.getElementById('edit-file-name');
    const preview = document.getElementById('edit-preview');
    const previewUsername = document.getElementById('edit-preview-username');
    const previewBio = document.getElementById('edit-preview-bio');

    if (!modal || !cancelBtn || !saveBtn) return;

    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        if (fileInput) fileInput.value = '';
        if (fileName) fileName.textContent = 'No file chosen';
        if (preview && window._profileMeUser) {
            const currentPic = resolveProfilePic(window._profileMeUser.profile_pic);
            preview.style.backgroundImage = currentPic ? `url('${currentPic}')` : 'none';
        }
        if (previewUsername && window._profileMeUser) {
            previewUsername.textContent = `@${window._profileMeUser.username || 'you'}`;
        }
        if (previewBio && window._profileMeUser) {
            previewBio.textContent = window._profileMeUser.bio || 'Tell us your story.';
        }
    });

    if (chooseBtn && fileInput) {
        chooseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                if (fileName) fileName.textContent = file.name;
                const url = URL.createObjectURL(file);
                if (preview) preview.style.backgroundImage = `url('${url}')`;
                if (previewUsername && window._profileMeUser) {
                    previewUsername.textContent = `@${window._profileMeUser.username || 'you'}`;
                }
                if (previewBio && bioInput) {
                    previewBio.textContent = bioInput.value || 'Tell us your story.';
                }
            } else {
                if (fileName) fileName.textContent = 'No file chosen';
                if (preview && window._profileMeUser) {
                    const currentPic = resolveProfilePic(window._profileMeUser.profile_pic);
                    preview.style.backgroundImage = currentPic ? `url('${currentPic}')` : 'none';
                }
                if (previewBio && bioInput) {
                    previewBio.textContent = bioInput.value || 'Tell us your story.';
                }
            }
        });
    }

    saveBtn.addEventListener('click', async () => {
        const formData = new FormData();
        formData.append('bio', bioInput ? bioInput.value : '');
        formData.append('is_private', privateInput && privateInput.checked ? '1' : '0');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            formData.append('profile_pic', fileInput.files[0]);
        }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        try {
            const res = await fetch('http://localhost:5000/api/user/me/profile', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Failed to update profile');
            const data = await res.json();
            if (data && data.user) {
                renderProfile(data.user);
            }
            modal.classList.add('hidden');
            if (fileInput) fileInput.value = '';
        } catch (err) {
            console.error('Error saving profile', err);
            alert('Failed to update profile. Please try again.');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save';
        }
    });
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

function loadNavProfile() {
    return fetch('http://localhost:5000/api/user/me', {
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
            const g = pickGradient(String(data.user.id || data.user.username || '0'));
            profilePicLarge.style.borderColor = g.accent;
        }
        if (navProfileName) {
            navProfileName.textContent = `@${username || 'username'}`;
        }
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
    return palettes[hash % palettes.length];
}

