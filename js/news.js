// ── News Page ──

// Глобальная функция открытия новости (доступна сразу)
window.openNews = function(id) {
  const newsList = DB.get('pl_news');
  // Строковое сравнение id
  const n = newsList.find(x => String(x.id) === String(id));
  if (!n) return;
  
  const catLabels = { general: 'Общее', tournament: 'Турниры', teams: 'Команды', players: 'Игроки' };
  const d = new Date(n.createdAt || n.date);
  const dateStr = isNaN(d) ? '' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  
  const modal = document.getElementById('newsModal');
  const content = document.getElementById('newsModalContent');
  if (!content || !modal) return;
  
  content.innerHTML = `
    <div style="position:relative;overflow:hidden;border-radius:16px 16px 0 0">
      ${n.image
        ? `<div style="position:relative;overflow:hidden;background:#0d0d0d"><img src="${n.image}" alt="${n.title}" style="width:100%;max-height:480px;object-fit:contain;display:block" /><div style="position:absolute;inset:0;background:linear-gradient(to right,#141414 0%,transparent 15%,transparent 85%,#141414 100%)"></div></div>`
        : `<div style="height:160px;background:linear-gradient(135deg,var(--bg-secondary),var(--bg-card));display:flex;align-items:center;justify-content:center"><i class="fas fa-newspaper" style="font-size:3rem;color:var(--text-dim)"></i></div>`}
      <span class="news-cat cat-${n.category}" style="position:absolute;bottom:14px;left:16px">${catLabels[n.category] || n.category}</span>
    </div>
    <div style="padding:20px 22px 24px">
      <h2 style="font-size:1.25rem;font-weight:800;line-height:1.35;margin-bottom:10px;color:var(--text)">${n.title}</h2>
      ${dateStr ? `<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px"><i class="fas fa-calendar-alt" style="color:var(--text-dim)"></i>${dateStr}</div>` : ''}
      <div style="font-size:0.9rem;line-height:1.75;color:var(--text-muted);white-space:pre-wrap;word-break:break-word">${n.content || n.excerpt || 'Текст новости не указан'}</div>
    </div>`;
  modal.classList.add('active');
};

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
      const dateStr = isNaN(d) ? '' : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      const safeId = String(n.id).replace(/'/g, "\\'");
      return `
        <div class="news-card" data-id="${n.id}" onclick="openNews('${safeId}')">
          <div class="news-card-img">
            ${img}
            <span class="news-cat cat-${n.category}">${catLabels[n.category] || n.category}</span>
          </div>
          <div class="news-card-body">
            ${dateStr ? `<div class="news-date"><i class="fas fa-calendar"></i> ${dateStr}</div>` : ''}
            <div class="news-title">${n.title}</div>
            <div class="news-excerpt">${n.excerpt || ''}</div>
            <span class="news-read-more">Читать далее <i class="fas fa-arrow-right"></i></span>
          </div>
        </div>`;
    }).join('');
  }

  // Экспортируем renderNews для перерендера при обновлении БД
  window._newsPageRender = renderNews;

  }); // конец whenDbReady

  // Перерендериваем когда Supabase вернул свежие данные
  window.addEventListener('db-updated', () => {
    if (typeof window._newsPageRender === 'function') window._newsPageRender();
  });
}); // конец DOMContentLoaded
