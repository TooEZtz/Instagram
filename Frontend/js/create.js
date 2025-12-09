document.addEventListener('DOMContentLoaded', () => {
    loadNavProfile();
    setupCreate();
    setupLogout();
});

function setupCreate() {
    const pills = document.querySelectorAll('.pill');
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const previewImage = document.getElementById('preview-image');
    const previewMode = document.getElementById('preview-mode');
    const previewStatus = document.getElementById('preview-status');
    const heroPreview = document.getElementById('hero-preview');
    const heroUsername = document.getElementById('hero-username');
    const captionInput = document.getElementById('create-caption');
    const locationInput = document.getElementById('create-location');
    const allowComments = document.getElementById('create-allow-comments');
    const submitBtn = document.getElementById('create-submit');
    const statusEl = document.getElementById('create-status');
    const clearBtn = document.getElementById('clear-file');

    let currentType = 'post';
    let currentFile = null;

    pills.forEach(p => {
        p.addEventListener('click', () => {
            pills.forEach(x => x.classList.remove('active'));
            p.classList.add('active');
            currentType = p.dataset.type || 'post';
            previewMode.textContent = currentType === 'post' ? 'Post' : 'Story';
            previewStatus.textContent = currentFile ? 'Ready to publish' : 'Awaiting upload';
        });
    });

    const setPreviewFromFile = (file) => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        previewImage.style.backgroundImage = `url('${url}')`;
        heroPreview.style.backgroundImage = `url('${url}')`;
        previewStatus.textContent = 'Ready to publish';
    };

    const clearFile = () => {
        currentFile = null;
        if (fileInput) fileInput.value = '';
        previewImage.style.backgroundImage = 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)';
        heroPreview.style.backgroundImage = 'linear-gradient(135deg, #ff7eb3 0%, #8e44ff 100%)';
        previewStatus.textContent = 'Awaiting upload';
    };

    if (clearBtn) clearBtn.addEventListener('click', clearFile);

    const handleFiles = (files) => {
        if (!files || !files.length) return;
        const file = files[0];
        currentFile = file;
        setPreviewFromFile(file);
    };

    if (dropzone) {
        ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, e => {
            e.preventDefault();
            dropzone.classList.add('dragging');
        }));
        ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, e => {
            e.preventDefault();
            dropzone.classList.remove('dragging');
        }));
        dropzone.addEventListener('drop', e => {
            const dt = e.dataTransfer;
            if (dt && dt.files) handleFiles(dt.files);
        });
        dropzone.addEventListener('click', () => fileInput && fileInput.click());
    }

    if (fileInput) {
        fileInput.addEventListener('change', () => handleFiles(fileInput.files));
    }

    submitBtn.addEventListener('click', async () => {
        if (!currentFile) {
            alert('Please choose an image first.');
            return;
        }
        const formData = new FormData();
        formData.append('kind', currentType);
        formData.append('caption', captionInput?.value || '');
        formData.append('location', locationInput?.value || '');
        if (currentType === 'post') {
            formData.append('allow_comments', allowComments?.checked ? '1' : '0');
        } else {
            formData.append('allow_comments', '0');
        }
        formData.append('image', currentFile);

        submitBtn.disabled = true;
        submitBtn.textContent = 'Publishing...';
        statusEl.textContent = 'Uploading...';

        try {
            const res = await fetch('http://localhost:5000/api/create', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            statusEl.textContent = `Published ${data.type || currentType}!`;
            previewStatus.textContent = 'Published';
            clearFile();
            captionInput.value = '';
            locationInput.value = '';
            allowComments.checked = true;
        } catch (err) {
            console.error(err);
            statusEl.textContent = 'Failed to publish. Try again.';
            alert('Failed to publish.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Publish';
        }
    });

    // sync hero username
    fetch('http://localhost:5000/api/user/me', { method: 'GET', credentials: 'include' })
        .then(r => r.json())
        .then(d => {
            const u = d.user;
            if (!u) return;
            heroUsername.textContent = `@${u.username || 'you'}`;
        }).catch(() => {});
}

function loadNavProfile() {
    fetch('http://localhost:5000/api/user/me', {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (!data.user) return;
        const { profile_pic, username, id } = data.user;
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
            const g = pickGradient(String(id || username || '0'));
            profilePicLarge.style.borderColor = g.accent;
        }
        if (navProfileName) {
            navProfileName.textContent = `@${username || 'username'}`;
        }
        if (navProfile) {
            const g = pickGradient(String(id || username || '0'));
            navProfile.style.background = g.bg;
            navProfile.style.borderColor = g.accent;
            navProfile.style.setProperty('--nav-accent', g.accent);
        }
    })
    .catch(err => console.error('Error loading nav profile:', err));
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

// gradient picker reuse
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

