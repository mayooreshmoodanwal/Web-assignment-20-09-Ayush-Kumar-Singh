// GymFlow - Main Client-side JavaScript
document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Sidebar Toggle
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.querySelector('.mobile-nav-toggle');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 900 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      }
    });
  }

  // 2. Auto-dismiss alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  });

  // 3. Confirmation Dialogs using HTML5 <dialog>
  const confirmModal = document.getElementById('confirmationModal');
  if (confirmModal) {
    const modalForm = confirmModal.querySelector('#confirmModalForm');
    const modalTitle = confirmModal.querySelector('#confirmModalTitle');
    const modalDesc = confirmModal.querySelector('#confirmModalDesc');
    const cancelBtn = confirmModal.querySelector('#confirmModalCancel');

    document.querySelectorAll('[data-confirm]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const actionUrl = btn.getAttribute('data-action') || btn.closest('form')?.getAttribute('action');
        const method = btn.getAttribute('data-method') || 'POST';
        const message = btn.getAttribute('data-confirm') || 'Are you sure you want to proceed?';
        const title = btn.getAttribute('data-confirm-title') || 'Confirm Action';

        if (modalTitle) modalTitle.textContent = title;
        if (modalDesc) modalDesc.textContent = message;
        if (modalForm && actionUrl) {
          modalForm.setAttribute('action', actionUrl);
          modalForm.setAttribute('method', method);
        }

        confirmModal.showModal();
      });
    });

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        confirmModal.close();
      });
    }

    // Close on backdrop click
    confirmModal.addEventListener('click', (e) => {
      const rect = confirmModal.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY &&
        e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX &&
        e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        confirmModal.close();
      }
    });
  }
});
