/**
 * People You May Know page
 */

let peoplePage = 1;
const peoplePerPage = 12;
let peopleLoading = false;

document.addEventListener('DOMContentLoaded', () => {
    loadNavProfile(); // get current user info for navbar avatar/username
    loadPeople();
    setupPeopleInteractions();
});

function loadNavProfile() {
    fetch('http://localhost:5000/api/user/me', {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to fetch user');
        return res.json();
    })
    .then(data => {
        if (!data.user) return;
        const { profile_pic, username } = data.user;
        const profilePicsSmall = document.querySelectorAll('.profile-pic-small');
        const profilePicLarge = document.querySelector('.profile-pic-large');
        const navProfileName = document.getElementById('nav-profile-name');
        const navProfile = document.querySelector('.nav-profile');

        let profilePicPath;
        if (profile_pic && profile_pic.startsWith('profiles/')) {
            profilePicPath = `/assets/images/${profile_pic}`;
        } else if (profile_pic && profile_pic.includes('profile')) {
            profilePicPath = `/assets/images/profiles/${profile_pic.split('/').pop()}`;
        } else {
            profilePicPath = `/assets/images/profiles/${profile_pic || 'default.jpg'}`;
        }

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
    .catch(err => {
        console.error('Error loading nav profile:', err);
    });
}

function loadPeople() {
    if (peopleLoading) return;
    peopleLoading = true;
    setLoadMoreState(true);

    fetch(`http://localhost:5000/api/people-you-may-know?page=${peoplePage}&per_page=${peoplePerPage}`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to load suggestions');
        return res.json();
    })
    .then(data => {
        const grid = document.getElementById('people-grid');
        if (!grid) return;
        renderPeople(data.users || [], grid);
        const returned = (data.users || []).length;
        if (!returned || returned < peoplePerPage) {
            hideLoadMore();
        } else {
            setLoadMoreState(false);
        }
    })
    .catch(err => {
        console.error('Error loading people:', err);
        if (peoplePage > 1) peoplePage -= 1; // rollback
        setLoadMoreState(false);
    })
    .finally(() => {
        peopleLoading = false;
    });
}

function renderPeople(users, grid) {
    if (!users || users.length === 0) {
        if (!grid.querySelector('.people-empty')) {
            const empty = document.createElement('div');
            empty.className = 'people-empty';
            empty.textContent = 'No suggestions right now.';
            grid.appendChild(empty);
        }
        return;
    }

    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'people-card';

        const profilePic = resolveProfilePic(user.profile_pic);
        const followers = parseInt(user.followers_count, 10) || 0;
        const following = parseInt(user.following_count, 10) || 0;
        const posts = parseInt(user.posts_count, 10) || 0;

        const gradient = pickGradient(String(user.id || user.username || '0'));
        card.style.background = gradient.bg;
        card.style.setProperty('--people-bg', gradient.bg);
        card.style.setProperty('--accent', gradient.accent);

        card.innerHTML = `
            <div class="people-avatar" style="background-image: url('${profilePic}')" data-user-id="${user.id}"></div>
            <div class="people-info" style="--accent:${gradient.accent}; --people-bg:${gradient.bg};">
                <div class="people-username" data-user-id="${user.id}">@${user.username || 'user'}</div>
                <div class="people-fullname">${user.full_name || ''}</div>
                <div class="people-meta">
                    <span>${followers} followers</span>
                    <span>${following} following</span>
                    <span>${posts} posts</span>
                </div>
                <div class="people-bio">${user.bio || ''}</div>
                <div class="people-action-row">
                    <button class="people-follow-btn" data-user-id="${user.id}">
                        ${user.is_following ? 'Following' : 'Follow'}
                    </button>
                    <button class="people-message-btn ${user.is_following ? '' : 'hidden'}" data-user-id="${user.id}">
                        Message
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
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

// Deterministic gradient picker used for people cards and nav
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

function setupPeopleInteractions() {
    const loadMoreBtn = document.getElementById('people-load-more');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', () => {
            peoplePage += 1;
            loadPeople();
        });
    }

    // Follow buttons (event delegation)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.people-follow-btn');
        if (!btn) return;
        const userId = btn.dataset.userId;
        if (!userId) return;
        btn.disabled = true;
        fetch(`http://localhost:5000/api/follow/${userId}`, {
            method: 'POST',
            credentials: 'include'
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.success) {
                btn.textContent = data.is_following ? 'Following' : 'Follow';
                btn.disabled = false;
                // Optionally update counts in card
                const meta = btn.parentElement.querySelector('.people-meta');
                if (meta && typeof data.followers_count !== 'undefined' && typeof data.following_count !== 'undefined') {
                    meta.innerHTML = `<span>${data.followers_count} followers</span><span>${data.following_count} following</span>`;
                }
                // Show message button once following
                const messageBtn = btn.parentElement.querySelector('.people-message-btn');
                if (messageBtn && data.is_following) {
                    messageBtn.classList.remove('hidden');
                }
            } else {
                btn.disabled = false;
            }
        })
        .catch(() => {
            btn.disabled = false;
        });
    });

    // Message buttons (event delegation)
    document.addEventListener('click', (e) => {
        const msgBtn = e.target.closest('.people-message-btn');
        if (!msgBtn) return;
        const userId = msgBtn.dataset.userId;
        if (!userId) return;
        msgBtn.disabled = true;
        fetch(`http://localhost:5000/api/messages/start`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId })
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.conversation && data.conversation.id) {
                window.location.href = `messages.html?conversation=${data.conversation.id}`;
            } else {
                msgBtn.disabled = false;
            }
        })
        .catch(() => {
            msgBtn.disabled = false;
        });
    });

    // Card click to open profile (avatar or username)
    document.addEventListener('click', (e) => {
        const avatar = e.target.closest('.people-avatar');
        const username = e.target.closest('.people-username');
        const target = avatar || username;
        if (!target) return;
        const userId = target.dataset.userId;
        if (!userId) return;
        window.location.href = `profile.html?user=${userId}`;
    });

    // Reuse logout from home.js if present
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

function hideLoadMore() {
    const btn = document.getElementById('people-load-more');
    if (btn) btn.style.display = 'none';
}

function setLoadMoreState(disabled) {
    const btn = document.getElementById('people-load-more');
    if (btn) {
        btn.disabled = disabled;
        btn.textContent = disabled ? 'Loading...' : 'Load more';
    }
}

