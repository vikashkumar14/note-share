// public/script.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Header scroll effect (यह हिस्सा सही है)
    const header = document.querySelector('.main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }

    // 2. Dynamic Navigation Logic (यह हिस्सा भी अब डेटाबेस से कनेक्ट हो गया है)
    // Prefer the nav inside the header so injected links appear in the visible header
    let navContainer = document.querySelector('.main-header .main-nav');
    if (!navContainer) navContainer = document.querySelector('.main-nav');
    if (!navContainer) return;

    const authToken = localStorage.getItem('authToken'); // यह टोकन अब सर्वर से आता है
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    let navHTML = `
          
        <a href="index.html" class="${currentPage === 'index.html' ? 'active' : ''}">Home</a>
        <a href="Notes.html" class="${currentPage === 'Notes.html' ? 'active' : ''}">Notes</a>
        <a href="about.html" class="${currentPage === 'about.html' ? 'active' : ''}">About</a>
        <a href="contact.html" class="${currentPage === 'contact.html' ? 'active' : ''}">Contact</a>
        <a href="profile.html" class="${currentPage === 'profile.html' ? 'active' : ''}">Profile</a>

        
        
        

    `;



    if (authToken) {
        // अगर यूजर लॉग-इन है — use btn-nav class so it matches other nav buttons and is visible on colored headers
        navHTML += `
            <a href="#" id="logout-btn" class="btn-nav">Logout</a>
        `;
    } else {
        // अगर यूजर लॉग-आउट है
        navHTML += `
            <a href="auth.html" class="btn-nav ${currentPage === 'auth.html' ? 'active' : ''}">Login / Register</a>
            
            
        `;
    }

    navContainer.innerHTML = navHTML;

    // 3. Logout functionality - bind after injecting the nav
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Clear all authentication-related storage so other pages don't still show the user
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            localStorage.removeItem('userId');
            // Optional: remove any other app-specific keys that store user info
            try { localStorage.removeItem('profileImage'); } catch(e) {}
            alert('You have been successfully logged out.');
            // Redirect to home and reload to ensure UI updates
            window.location.href = 'index.html';
            window.location.reload();
        });
    }
});