/**
 * Messages page interactions
 */

const API_BASE = 'http://localhost:5000';

let conversations = [];
let followings = [];
let selectedConversationId = null;
let currentMessages = [];
let currentUserId = null;
let currentUsername = '';
let pollHandle = null;
const POLL_INTERVAL_MS = 5000;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedConversation = urlParams.get('conversation');

    checkLoginStatus()
        .then(() => {
            loadNavProfile();
            loadConversations({ selectId: requestedConversation });
            setupEvents();
        });
});

function setupEvents() {
    const convoList = document.getElementById('conversation-list');
    if (convoList) {
        convoList.addEventListener('click', (e) => {
            const item = e.target.closest('.conversation-item');
            if (!item) return;
            const cid = item.dataset.conversationId;
            if (cid) {
                selectConversation(cid);
            }
        });
    }

    const startBtns = [document.getElementById('start-chat-btn'), document.getElementById('chat-empty-start')];
    startBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => openStartModal());
        }
    });

    const startClose = document.getElementById('start-close');
    if (startClose) {
        startClose.addEventListener('click', closeStartModal);
    }

    const startModal = document.getElementById('start-modal');
    if (startModal) {
        startModal.addEventListener('click', (e) => {
            if (e.target === startModal) closeStartModal();
        });
    }

    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-text');
            if (!input) return;
            const text = input.value.trim();
            if (!text || !selectedConversationId) return;
            input.disabled = true;
            sendMessage(text)
                .finally(() => {
                    input.disabled = false;
                    input.value = '';
                    input.focus();
                });
        });
    }

    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            fetch(`${API_BASE}/api/logout`, {
                method: 'POST',
                credentials: 'include'
            }).finally(() => {
                window.location.href = 'login.html';
            });
        });
    }
}

function checkLoginStatus() {
    return fetch(`${API_BASE}/api/check-session`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        if (!data.logged_in) {
            window.location.href = 'login.html';
            return Promise.reject();
        }
        currentUserId = data.user_id;
        currentUsername = data.username || '';
        return data;
    })
    .catch(() => {
        window.location.href = 'login.html';
    });
}

function loadNavProfile() {
    fetch(`${API_BASE}/api/user/me`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
    })
    .then(data => {
        if (!data.user) return;
        const { profile_pic, username, id } = data.user;
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
    .catch(() => {});
}

function loadConversations(options = {}) {
    const { selectId } = options;
    return fetch(`${API_BASE}/api/messages/conversations`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        conversations = data.conversations || [];
        renderConversationList(selectId || selectedConversationId);

        let targetId = selectId || selectedConversationId;
        if (targetId && conversations.some(c => String(c.id) === String(targetId))) {
            selectConversation(targetId, { skipListRefresh: true });
        } else if (conversations.length > 0) {
            selectConversation(conversations[0].id, { skipListRefresh: true });
        } else {
            showEmptyState();
            stopPolling();
        }
    })
    .catch(err => {
        console.error('Error loading conversations:', err);
    });
}

function renderConversationList(activeId) {
    const list = document.getElementById('conversation-list');
    if (!list) return;

    list.innerHTML = '';
    if (!conversations.length) {
        const empty = document.createElement('div');
        empty.className = 'people-empty';
        empty.textContent = 'No messages yet. Start a conversation!';
        list.appendChild(empty);
        return;
    }

    conversations.forEach(conv => {
        const other = conv.other_user || {};
        const last = conv.last_message;

        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'conversation-item';
        item.dataset.conversationId = conv.id;
        if (activeId && String(activeId) === String(conv.id)) {
            item.classList.add('active');
        }

        const avatar = document.createElement('div');
        avatar.className = 'conv-avatar';
        avatar.style.backgroundImage = `url('${other.profile_pic || '/assets/images/profiles/default.jpg'}')`;

        const meta = document.createElement('div');
        meta.className = 'conv-meta';

        const name = document.createElement('div');
        name.className = 'conv-name';
        name.textContent = other.username ? `@${other.username}` : 'Conversation';

        const snippet = document.createElement('div');
        snippet.className = 'conv-snippet';
        const previewText = last ? truncateText(last.message_text || '', 40) : 'No messages yet';
        const prefix = last && last.sender_username && last.sender_username !== other.username ? 'You: ' : '';
        const timeLabel = last ? ` · ${formatTimeAgo(last.created_at)}` : '';
        snippet.textContent = `${prefix}${previewText}${timeLabel}`;

        meta.appendChild(name);
        meta.appendChild(snippet);

        item.appendChild(avatar);
        item.appendChild(meta);
        list.appendChild(item);
    });
}

function selectConversation(conversationId, options = {}) {
    selectedConversationId = conversationId;
    highlightConversation(conversationId);
    fetchMessages(conversationId, options);
}

function fetchMessages(conversationId, options = {}) {
    const { skipListRefresh = false, fromPoll = false } = options;

    fetch(`${API_BASE}/api/messages/conversations/${conversationId}/messages`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        const conv = data.conversation || conversations.find(c => String(c.id) === String(conversationId));
        if (conv) {
            setChatHeader(conv.other_user || {});
        }
        currentMessages = data.messages || [];
        renderMessages(currentMessages);
        showChatArea();
        if (!fromPoll) {
            ensurePolling();
        }
    })
    .catch(err => {
        console.error('Error loading conversation messages:', err);
    });
}

function ensurePolling() {
    if (pollHandle) return;
    pollHandle = setInterval(() => {
        if (!selectedConversationId) return;
        fetchMessages(selectedConversationId, { skipListRefresh: true, fromPoll: true });
    }, POLL_INTERVAL_MS);
}

function stopPolling() {
    if (pollHandle) {
        clearInterval(pollHandle);
        pollHandle = null;
    }
}

function setChatHeader(user) {
    const avatar = document.getElementById('chat-avatar');
    const usernameEl = document.getElementById('chat-username');
    const fullnameEl = document.getElementById('chat-fullname');
    if (avatar) {
        avatar.style.backgroundImage = `url('${user.profile_pic || '/assets/images/profiles/default.jpg'}')`;
    }
    if (usernameEl) usernameEl.textContent = user.username ? `@${user.username}` : 'Conversation';
    if (fullnameEl) fullnameEl.textContent = user.full_name || '';
}

function renderMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';

    if (!messages.length) {
        const empty = document.createElement('div');
        empty.className = 'people-empty';
        empty.textContent = 'No messages yet. Say hi!';
        container.appendChild(empty);
        return;
    }

    messages.forEach(msg => {
        const isMe = currentUserId && String(msg.sender_id) === String(currentUserId);
        const row = document.createElement('div');
        row.className = 'message-row';
        if (isMe) row.classList.add('me');

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = msg.message_text || '';

        const meta = document.createElement('div');
        meta.className = 'message-meta';
        const senderLabel = isMe ? 'You' : (msg.sender_username || 'User');
        meta.textContent = `${senderLabel} · ${formatTimeAgo(msg.created_at)}`;

        if (!isMe) {
            const avatar = document.createElement('div');
            avatar.className = 'bubble-avatar';
            avatar.style.backgroundImage = `url('${msg.profile_pic || '/assets/images/profiles/default.jpg'}')`;
            row.appendChild(avatar);
        }

        const bubbleWrap = document.createElement('div');
        bubbleWrap.style.display = 'flex';
        bubbleWrap.style.flexDirection = 'column';
        bubbleWrap.style.alignItems = isMe ? 'flex-end' : 'flex-start';
        bubbleWrap.appendChild(bubble);
        bubbleWrap.appendChild(meta);

        row.appendChild(bubbleWrap);
        container.appendChild(row);
    });

    requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
    });
}

function sendMessage(text) {
    return fetch(`${API_BASE}/api/messages/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message_text: text })
    })
    .then(res => res.json())
    .then(data => {
        if (!data.message) return;
        currentMessages.push(data.message);
        renderMessages(currentMessages);
        loadConversations({ selectId: selectedConversationId });
    })
    .catch(err => {
        console.error('Error sending message:', err);
    });
}

function highlightConversation(conversationId) {
    const buttons = document.querySelectorAll('.conversation-item');
    buttons.forEach(btn => {
        if (btn.dataset.conversationId === String(conversationId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function showChatArea() {
    const area = document.getElementById('chat-area');
    const empty = document.getElementById('chat-empty');
    if (area) area.classList.remove('hidden');
    if (empty) empty.classList.add('hidden');
}

function showEmptyState() {
    const area = document.getElementById('chat-area');
    const empty = document.getElementById('chat-empty');
    if (area) area.classList.add('hidden');
    if (empty) empty.classList.remove('hidden');
}

function openStartModal() {
    const modal = document.getElementById('start-modal');
    if (modal) modal.classList.remove('hidden');
    if (!followings.length) {
        loadFollowings();
    }
}

function closeStartModal() {
    const modal = document.getElementById('start-modal');
    if (modal) modal.classList.add('hidden');
}

function loadFollowings() {
    fetch(`${API_BASE}/api/messages/following`, {
        method: 'GET',
        credentials: 'include'
    })
    .then(res => res.json())
    .then(data => {
        followings = data.users || [];
        renderStartList();
    })
    .catch(err => {
        console.error('Error loading followings:', err);
    });
}

function renderStartList() {
    const list = document.getElementById('start-list');
    if (!list) return;

    list.innerHTML = '';

    const filtered = followings;

    if (!filtered.length) {
        const empty = document.createElement('div');
        empty.className = 'people-empty';
        empty.textContent = 'No matches.';
        list.appendChild(empty);
        return;
    }

    filtered.forEach(user => {
        const row = document.createElement('div');
        row.className = 'start-item';

        const person = document.createElement('div');
        person.className = 'start-person';

        const avatar = document.createElement('div');
        avatar.className = 'conv-avatar';
        avatar.style.width = '44px';
        avatar.style.height = '44px';
        avatar.style.backgroundImage = `url('${user.profile_pic || '/assets/images/profiles/default.jpg'}')`;

        const info = document.createElement('div');
        info.style.display = 'flex';
        info.style.flexDirection = 'column';
        info.style.gap = '2px';
        const username = document.createElement('div');
        username.className = 'start-name';
        username.textContent = user.username ? `@${user.username}` : 'user';
        const fullname = document.createElement('div');
        fullname.className = 'start-fullname';
        fullname.textContent = user.full_name || '';
        info.appendChild(username);
        info.appendChild(fullname);

        person.appendChild(avatar);
        person.appendChild(info);

        const actions = document.createElement('div');
        actions.className = 'start-actions';

        if (user.conversation_id) {
            const pill = document.createElement('div');
            pill.className = 'start-pill';
            pill.textContent = 'Has chat';
            actions.appendChild(pill);
        }

        const btn = document.createElement('button');
        btn.className = 'ghost-btn';
        btn.textContent = user.conversation_id ? 'Open' : 'Start';
        btn.addEventListener('click', () => {
            const targetConversationId = user.conversation_id;
            if (targetConversationId) {
                closeStartModal();
                loadConversations({ selectId: targetConversationId });
            } else {
                startConversation(user.id);
            }
        });
        actions.appendChild(btn);

        row.appendChild(person);
        row.appendChild(actions);
        list.appendChild(row);
    });
}

function startConversation(userId) {
    fetch(`${API_BASE}/api/messages/start`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().catch(() => ({})).then(body => {
                const msg = body.error || `Failed to start conversation (${res.status})`;
                throw new Error(msg);
            });
        }
        return res.json();
    })
    .then(data => {
        if (!data.conversation) return;

        const convoId = data.conversation.id;
        // Optimistically show the chat area for the new conversation
        selectedConversationId = convoId;
        setChatHeader(data.conversation.other_user || {});
        currentMessages = [];
        renderMessages(currentMessages);
        showChatArea();

        closeStartModal();
        loadConversations({ selectId: convoId });
        ensurePolling();
    })
    .catch(err => {
        console.error('Error starting conversation:', err);
        alert('Could not start conversation. Please try again.');
    });
}

function truncateText(text, max) {
    if (!text) return '';
    if (text.length <= max) return text;
    return text.slice(0, max - 1) + '…';
}

function formatTimeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
}

// Deterministic gradient picker reused from other pages
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

