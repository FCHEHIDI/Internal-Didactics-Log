(function () {
  'use strict';

  const contactForm = document.getElementById('contact-form');
  const contactStatus = document.getElementById('contact-status');

  if (!contactForm || !contactStatus) return;

  contactForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      message: String(formData.get('message') || '').trim(),
      website: String(formData.get('website') || '').trim()
    };

    fetch(idlApiUrl('/api/messages'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Message failed');
        contactForm.reset();
        contactStatus.textContent = 'Message sent.';
      })
      .catch(function () {
        contactStatus.textContent = 'Unable to send message right now.';
      });
  });
})();
