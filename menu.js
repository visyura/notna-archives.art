// Immediately load cached menu if available
const cachedMenu = sessionStorage.getItem('menuHTML');
const placeholder = document.getElementById('menu-placeholder');

if (cachedMenu && placeholder) {
  placeholder.innerHTML = cachedMenu;
}

// Initialize menu function
function initMenuAccordion() {
  const menuItems = document.querySelectorAll('.menu-item');
  const savedState = JSON.parse(sessionStorage.getItem('accordionState') || '{}');

  menuItems.forEach((item, index) => {
    if (savedState[index]) item.classList.add('active');
    item.onclick = () => {
      item.classList.toggle('active');
      const state = {};
      menuItems.forEach((itm, i) => state[i] = itm.classList.contains('active'));
      sessionStorage.setItem('accordionState', JSON.stringify(state));
    };
  });
}

// Initialize accordion if menu was cached
if (cachedMenu) {
  initMenuAccordion();
}

// Fetch menu HTML and update cache
fetch('/menu.html')
  .then(r => r.text())
  .then(html => {
    sessionStorage.setItem('menuHTML', html);
    if (placeholder) {
      placeholder.innerHTML = html;
      initMenuAccordion();
    }
  });
