// profile.js - Handles profile view and update

document.addEventListener('DOMContentLoaded', function() {
    // Load user info from localStorage (after login)
    const user = JSON.parse(localStorage.getItem('authUser'));
    if (!user) {
        window.location.href = 'auth.html';
        return;
    }
    // Fill profile fields
    document.getElementById('profile-name').value = user.name || '';
    document.getElementById('profile-email').value = user.email || '';
    document.getElementById('profile-college').value = user.college || '';
    document.getElementById('profile-semester').value = user.semester || '';
    document.getElementById('profile-branch-select').value = user.branch || '';
    document.getElementById('profile-bio').value = user.bio || '';

    // Fill sidebar display fields
    document.getElementById('profile-display-name').textContent = user.name || 'No Name';
    document.getElementById('profile-display-email').textContent = user.email || '';
    document.getElementById('profile-branch-value').textContent = user.branch || '-';
    document.getElementById('profile-sem-value').textContent = user.semester || '-';
    // Profile image
    const profileImg = document.getElementById('profile-img');
    if (user.profileImage) {
        profileImg.src = '/' + user.profileImage.replace(/\\/g, '/');
    }

    // Profile update form
    document.getElementById('profile-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('profile-name').value;
        const college = document.getElementById('profile-college').value;
        const semester = document.getElementById('profile-semester').value;
        const branch = document.getElementById('profile-branch-select').value;
        const passingYear = user.passingYear || '';
        // Send update request
        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                },
                body: JSON.stringify({ name, branch, college, semester, passingYear })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('authUser', JSON.stringify(data.user));
                alert('Profile updated successfully!');
                location.reload();
            } else {
                alert(data.message || 'Profile update failed.');
            }
        } catch (err) {
            alert('Server error: ' + err.message);
        }
    });

    // Profile picture upload handler
    const picInput = document.getElementById('profile-pic-upload');
    if (picInput) {
        picInput.addEventListener('change', async function() {
            const file = this.files[0];
            if (!file) return;
            const form = new FormData();
            form.append('avatar', file);
            try {
                const res = await fetch('/api/user/avatar', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }, body: form });
                const data = await res.json();
                if (res.ok) {
                    // update UI and stored user
                    const img = document.getElementById('profile-img');
                    img.src = '/' + data.profileImage.replace(/\\/g, '/');
                    const stored = JSON.parse(localStorage.getItem('authUser') || '{}');
                    stored.profileImage = data.profileImage;
                    localStorage.setItem('authUser', JSON.stringify(stored));
                    alert('Profile picture updated');
                } else {
                    alert('Upload failed: ' + (data.message || 'unknown'));
                }
            } catch (err) {
                alert('Upload error: ' + err.message);
            }
        });
    }

    // --- Top Note and Badges Update ---
    function updateTopNoteAndBadges(notes) {
        // Top Note
        const topNoteTitle = document.getElementById('top-note-title');
        const topNoteDownloads = document.getElementById('top-note-downloads');
        if (notes.length === 0) {
            topNoteTitle.textContent = 'No notes uploaded yet.';
            if (topNoteDownloads) topNoteDownloads.textContent = '';
        } else {
            // For now, just show the most recent note as top
            const top = notes[0];
            topNoteTitle.textContent = top.title;
            if (topNoteDownloads) topNoteDownloads.textContent = '';
        }
        // Badges
        const badgesGrid = document.getElementById('badges-grid');
        if (badgesGrid) {
            badgesGrid.innerHTML = '';
            // Contributor badge
            if (notes.length > 0) {
                badgesGrid.innerHTML += `<div class="badge earned" title="Contributor: Upload your first note!"><i class="fas fa-feather-alt"></i><span>Contributor</span></div>`;
            } else {
                badgesGrid.innerHTML += `<div class="badge" title="Contributor: Upload your first note!"><i class="fas fa-feather-alt"></i><span>Contributor</span></div>`;
            }
            // Power Uploader badge
            if (notes.length >= 10) {
                badgesGrid.innerHTML += `<div class="badge earned" title="Power Uploader: Upload 10+ notes!"><i class="fas fa-rocket"></i><span>Power Uploader</span></div>`;
            } else {
                badgesGrid.innerHTML += `<div class="badge" title="Power Uploader: Upload 10+ notes!"><i class="fas fa-rocket"></i><span>Power Uploader</span></div>`;
            }
            // Top 10 badge (dummy logic: if 1+ notes)
            if (notes.length >= 1) {
                badgesGrid.innerHTML += `<div class="badge earned" title="Top 10: Have a note in the top 10 downloads!"><i class="fas fa-trophy"></i><span>Top 10</span></div>`;
            } else {
                badgesGrid.innerHTML += `<div class="badge" title="Top 10: Have a note in the top 10 downloads!"><i class="fas fa-trophy"></i><span>Top 10</span></div>`;
            }
        }
    }

    // Load and display user's uploaded notes in 'My Uploads' tab
    async function loadMyUploads() {
        const user = JSON.parse(localStorage.getItem('authUser'));
        if (!user) return;
        try {
            // Fetch all notes uploaded by this user (all statuses)
            const res = await fetch(`/api/user/notes`, {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('authToken') }
            });
            const notes = await res.json();
            // Update uploaded count in sidebar
            const uploadedCountEl = document.getElementById('notes-uploaded-count');
            if (uploadedCountEl) uploadedCountEl.textContent = (notes && notes.length) ? notes.length : 0;
            const uploadsList = document.getElementById('recent-uploads-list');
            if (!uploadsList) return;
            uploadsList.innerHTML = '';
            if (notes.length === 0) {
                uploadsList.innerHTML = '<li><span>No uploads yet.</span></li>';
            } else {
                notes.forEach(note => {
                    const li = document.createElement('li');
                    let statusLabel = '';
                    if(note.status === 'pending') statusLabel = '<span class="note-status pending">Pending</span>';
                    else if(note.status === 'rejected') statusLabel = '<span class="note-status rejected">Rejected</span>';
                    else if(note.status === 'accepted') statusLabel = '<span class="note-status accepted">Accepted</span>';
                    li.innerHTML = `
                        <div class="note-info">
                            <span class="note-title">${note.title}</span>
                            <span class="note-meta">Subject: ${note.subject} | Uploaded: ${new Date(note.createdAt).toLocaleDateString()} ${statusLabel}</span>
                        </div>
                        <div class="note-stats">
                            <a href="/${note.filePath.replace(/\\/g, '/')}" target="_blank"><i class="fas fa-eye"></i> Preview</a>
                        </div>
                    `;
                    uploadsList.appendChild(li);
                });
            }
            // Update Top Note and Badges in real time
            updateTopNoteAndBadges(notes);
            // Also fetch saved notes count (protected endpoint)
            loadSavedNotesCount();
        } catch (err) {
            // fallback: show error
            const uploadsList = document.getElementById('recent-uploads-list');
            if (uploadsList) uploadsList.innerHTML = '<li><span>Error loading uploads.</span></li>';
        }
    }
    loadMyUploads();

    // Fetch saved notes count for the authenticated user (uses protected endpoint)
    async function loadSavedNotesCount() {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`/api/user/saved-notes/me`, { headers: { 'Authorization': 'Bearer ' + token } });
            if (!res.ok) {
                console.warn('Saved notes fetch failed', res.status, await res.text());
                return;
            }
            const saved = await res.json();
            const savedEl = document.getElementById('notes-saved-count');
            if (savedEl) savedEl.textContent = (saved && saved.length) ? saved.length : 0;
        } catch (err) {
            console.error('Error fetching saved notes', err);
        }
    }

    // Tab switching for Account Details, My Uploads, Security
    const tabLinks = document.querySelectorAll('.tab-link');
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            tabLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // View All Notes button
    const viewAllBtn = document.querySelector('.btn.btn-primary');
    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'index.html#notes-section';
        });
    }
    // View Saved Notes button
    const viewSavedBtn = document.querySelector('.btn.btn-secondary');
    if (viewSavedBtn) {
        viewSavedBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'savednotes.html';
        });
    }
    // Top 10 (if you want to link to a leaderboard or top notes page, add here)
    const topNoteTitle = document.getElementById('top-note-title');
    if (topNoteTitle) {
        topNoteTitle.addEventListener('click', function() {
            window.location.href = 'index.html#notes-section';
        });
    }
});


