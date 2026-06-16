// ── News Page ──
document.addEventListener('DOMContentLoaded', () => {
  whenDbReady(() => {
  let searchQuery = '';
  const catLabels = { general: 'Общее', tournament: 'Турниры', teams: 'Команды', players: 'Игроки' };

  renderNews();

  const search = document.getElementById('newsSearch');
  if (search) {
    search.addEventListener('input', () => {
      searchQuery = search.value.toLowerCase();
      renderNews();
    });
  }

  // Modal
  const modal = document.getElementById('newsModal');
  const modalClose = document.getElementById('newsModalClose');
  if (modalClose) {
    modalClose.addEventListener('click', () => modal.classList.remove('active'));
  }
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  function renderNews() {
    const grid = document.getElementById('newsGrid');
    if (!grid) return;
    let newsList = DB.get('pl_news').slice().reverse();
    if (searchQuery) newsList = newsList.filter(n =>
      n.title.toLowerCase().includes(searchQuery) ||
      (n.excerpt || '').toLowerCase().includes(searchQuery)
    );

    if (!newsList.length) {
      grid.innerHTML = `<div class="empty-state"><i class="fas fa-newspaper"></i><p>Новостей пока нет</p></div>`;
      return;
    }
    grid.innerHTML = newsList.map(n => {
      const img = n.image
        ? `<img src="${n.image}" alt="${n.title}" />`
        : `<i class="fas fa-newspaper news-no-img"></i>`;
      const d = new Date(n.createdAt || n.date);
      const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      return `
        <div class="news-card" data-id="${n.id}" onclick="openNews(${n.id})">
          <div class="news-card-img">
            ${img}
            <span class="news-cat cat-${n.category}">${catLabels[n.category] || n.category}</span>
          </div>
          <div class="news-card-body">
            <div class="news-date"><i class="fas fa-calendar"></i> ${dateStr}</div>
            <div class="news-title">${n.title}</div>
            <div class="news-excerpt">${n.excerpt || ''}</div>
            <span class="news-read-more">Читать далее <i class="fas fa-arrow-right"></i></span>
          </div>
        </div>`;
    }).join('');
  }

  window.openNews = function(id) {
    const newsList = DB.get('pl_news');
    const n = newsList.find(x => x.id === id);
    if (!n) return;
    const d = new Date(n.createdAt || n.date);
    const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const content = document.getElementById('newsModalContent');
    if (!content) return;
    content.innerHTML = `
      ${n.image ? `<img src="${n.image}" alt="${n.title}" class="modal-news-img" />` : ''}
      <div style="display:inline-block;margin-bottom:12px" class="news-cat cat-${n.category}">${catLabels[n.category] || n.category}</div>
      <h2 class="modal-news-title">${n.title}</h2>
      <div class="modal-news-meta">
        <span><i class="fas fa-calendar"></i> ${dateStr}</span>
      </div>
      <div class="modal-news-body">${n.content || ''}</div>`;
    modal.classList.add('active');
  };
  }); // конец whenDbReady

  // Перерендериваем когда Supabase вернул свежие данные
  window.addEventListener('db-updated', () => {
    if (typeof renderNews === 'function') renderNews();
  });
}); // конец DOMContentLoaded
