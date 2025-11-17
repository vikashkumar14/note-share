// Admin panel logic for note verification and preview
document.addEventListener('DOMContentLoaded', function() {
    // Detect API URL
    const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000'
        : 'https://noteshare-y2kp.onrender.com';
    
    // Store API_URL globally for use in other functions
    window.API_URL = API_URL;
    
    const token = localStorage.getItem('authToken');
    const user = JSON.parse(localStorage.getItem('authUser'));
    if (!user || (user.role !== 'admin' && user.role !== 'faculty')) {
        alert('Admin or Faculty access only!');
        window.location.href = 'auth.html';
        return;
    }
    loadNotes();
});

async function loadNotes() {
    const API_URL = window.API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    const res = await fetch(`${API_URL}/api/admin/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const notes = await res.json();
    console.log('Loaded notes:', notes); // Debug
    const tableBody = document.getElementById('notes-table').querySelector('tbody');
    tableBody.innerHTML = notes.map(note => {
        const API_URL = window.API_URL || 'http://localhost:5000';
        const fileUrl = `${API_URL}/${note.filePath.replace(/\\/g, '/')}`;
    let actions = `<button class="small-btn btn-primary" onclick="window.open('${fileUrl}', '_blank')">Preview</button>`;
        if(note.status === 'pending') {
            actions += ` <button class="small-btn btn-safe" onclick="acceptNote('${note._id}')">Accept</button>`;
            actions += ` <button class="small-btn btn-danger" onclick="rejectNote('${note._id}')">Reject</button>`;
        }
        actions += ` <button class="small-btn btn-danger" onclick="deleteNote('${note._id}')">Delete</button>`;
    // add edit buttons for title and branch
    actions += ` <button class="small-btn" onclick="editNoteField('${note._id}','title')">Edit Title</button>`;
    actions += ` <button class="small-btn" onclick="editNoteField('${note._id}','branch')">Edit Branch</button>`;
        return `
            <tr>
                <td>${note.title}</td>
                <td>${note.subject}</td>
                <td>${note.branch || 'N/A'}</td>
                <td>${note.year}</td>
                <td>${note.status || 'pending'}</td>
                <td>${actions}</td>
            </tr>
            `;
    }).join('');
}

    // Edit note metadata (simple prompt-based editor)
    async function editNoteMeta(id) {
        const token = localStorage.getItem('authToken');
        const field = prompt('Which field to edit? (branch / subject / year)');
        if (!field) return;
        const allowed = ['branch','subject','year','title'];
        if (!allowed.includes(field)) return alert('Invalid field');
        const value = prompt(`Enter new value for ${field}`);
        if (value === null) return;
        const res = await fetch(`${window.API_URL || 'http://localhost:5000'}/api/admin/notes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ [field]: value })
        });
        if (res.ok) {
            alert('Updated');
            loadNotes();
        } else {
            const txt = await res.text();
            alert('Error: ' + txt);
        }
    }

async function acceptNote(id) {
    const API_URL = window.API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    if (!confirm('Accept this note?')) return;
    const res = await fetch(`${API_URL}/api/admin/notes/${id}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Accept response:', res.status);
    loadNotes();
}

// Quick edit for a specific field (title or branch)
async function editNoteField(id, field) {
    const token = localStorage.getItem('authToken');
    if (!['title','branch'].includes(field)) return alert('Unsupported field');
    const value = prompt(`Enter new ${field}`);
    if (value === null) return;
    const API_URL = window.API_URL || 'http://localhost:5000';
    const res = await fetch(`${API_URL}/api/admin/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ [field]: value })
    });
    if (res.ok) {
        alert('Updated successfully!');
        console.log('Update success for field:', field);
        loadNotes();
    } else {
        const txt = await res.text();
        console.error('Update error:', txt);
        alert('Error: ' + txt);
    }
}

async function rejectNote(id) {
    const API_URL = window.API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    if (!confirm('Reject this note?')) return;
    const res = await fetch(`${API_URL}/api/admin/notes/${id}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Reject response:', res.status);
    loadNotes();
}

async function deleteNote(id) {
    const API_URL = window.API_URL || 'http://localhost:5000';
    const token = localStorage.getItem('authToken');
    if (!confirm('Are you sure you want to delete this note permanently?')) return;
    const res = await fetch(`${API_URL}/api/admin/notes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
    console.log('Delete response:', res.status);
    loadNotes();
}
