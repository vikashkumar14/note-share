// Mobile Menu Toggle Script
document.addEventListener('DOMContentLoaded', function() {
    // Create hamburger menu if it doesn't exist
    const header = document.querySelector('.main-header');
    const nav = document.querySelector('.main-nav');
    
    if (header && nav && !document.querySelector('.hamburger-menu')) {
        // Create hamburger button
        const hamburger = document.createElement('div');
        hamburger.className = 'hamburger-menu';
        hamburger.innerHTML = '<span></span><span></span><span></span>';
        hamburger.style.zIndex = '1001';
        
        // Find the container and insert hamburger before nav
        const container = header.querySelector('.container');
        if (container) {
            container.insertBefore(hamburger, nav);
        } else {
            header.insertBefore(hamburger, nav);
        }
        
        // Toggle menu on hamburger click
        hamburger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            hamburger.classList.toggle('active');
            nav.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
        
        // Close menu when clicking on a link
        const navLinks = nav.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                hamburger.classList.remove('active');
                nav.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (!header.contains(e.target) && nav.classList.contains('active')) {
                hamburger.classList.remove('active');
                nav.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
        
        // Close menu on window resize (if resizing to desktop)
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                hamburger.classList.remove('active');
                nav.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });
    }
});
