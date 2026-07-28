const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('.nav-links');
if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
}

document.querySelectorAll('[data-loading-form]').forEach((form) => {
  form.addEventListener('submit', () => {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    button.disabled = true;
    button.querySelector('.button-text')?.setAttribute('hidden', '');
    button.querySelector('.button-loading')?.removeAttribute('hidden');
  });
});

const quizForm = document.querySelector('[data-quiz-form]');
if (quizForm) {
  const count = document.querySelectorAll('.question-card').length;
  const counter = document.querySelector('#answeredCount');
  const updateCounter = () => {
    let answered = 0;
    for (let i = 0; i < count; i += 1) {
      if (quizForm.querySelector(`input[name="answer_${i}"]:checked`)) answered += 1;
    }
    if (counter) counter.textContent = answered;
  };
  quizForm.addEventListener('change', updateCounter);
  quizForm.addEventListener('submit', (event) => {
    const answered = quizForm.querySelectorAll('input[type="radio"]:checked').length;
    if (answered < count && !window.confirm(`You answered ${answered} of ${count} questions. Submit anyway?`)) {
      event.preventDefault();
    }
  });
}

document.querySelectorAll('[data-toggle-edit]').forEach((button) => {
  button.addEventListener('click', () => {
    const form = document.querySelector(`#edit-${button.dataset.toggleEdit}`);
    if (form) form.hidden = !form.hidden;
  });
});

document.querySelectorAll('[data-confirm-delete]').forEach((form) => {
  form.addEventListener('submit', (event) => {
    if (!window.confirm('Delete this quiz permanently?')) event.preventDefault();
  });
});
