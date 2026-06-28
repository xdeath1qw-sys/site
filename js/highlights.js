// -- HIGHLIGHTS — storage, render, modal player -------------------

(function () {
  'use strict';

  const DEFAULT_HIGHLIGHTS = [
    { id: 'h1', nick: 'atoman', kd: '2.06', label: 'Топ хайлайт', video: 'videos/atoman 2.06.mp4', thumb: '' },
    { id: 'h2', nick: 'kray',   kd: '1.36', label: 'Топ хайлайт', video: 'videos/kray 1.36.mp4',   thumb: '' },
    { id: 'h3', nick: 'kray',   kd: '1.50', label: 'Топ хайлайт', video: 'videos/kray 1.50.mp4',   thumb: '' },
    { id: 'h4', nick: 'knjazx', kd: '1.20', label: 'Топ хайлайт', video: 'videos/knjazx 1.20.mp4', thumb: '' },
  ];

  // -- Storage --------------------------------------------------
  function getHighlights() {
    try {
      const raw = localStorage.getItem('pl_highlights');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (_) {}
    localStorage.setItem('pl_highlights', JSON.stringify(DEFAULT_HIGHLIGHTS));
    return DEFAULT_HIGHLIGHTS;
  }

  window.HL = {
    get: getHighlights,
    set: (list) => localStorage.setItem('pl_highlights', JSON.stringify(list))
  };

  // -- Modal player ---------------------------------------------
  let currentHlId = null;

  window.hlOpen = function (id) {
    const list = getHighlights();
    const h = list.find(x => x.id === id);
    if (!h) return;

    const modal    = document.getElementById('hlModal');
    const video    = document.getElementById('hlModalVideo');
    const avatar   = document.getElementById('hlModalAvatar');
    const nick     = document.getElementById('hlModalNick');
    const label    = document.getElementById('hlModalLabel');
    const kdBadge  = document.getElementById('hlModalKd');

    if (!modal || !video) return;

    // Если уже открыт — просто меняем видео без закрытия (плавно)
    const isSame = currentHlId === id;
    currentHlId = id;

    // Pause & swap source
    video.pause();
    video.src = h.video;
    video.load();

    // Fill info
    const initial = (h.nick || '?').charAt(0).toUpperCase();
    if (h.avatar) {
      avatar.innerHTML = `<img src="${h.avatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--primary)" alt="${h.nick}" />`;
    } else {
      avatar.textContent = initial;
      avatar.className = 'hl-avatar';
    }
    nick.textContent    = h.nick;
    label.textContent   = h.label || 'Топ хайлайт';
    kdBadge.innerHTML   = `K/D <strong>${h.kd}</strong>`;

    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => modal.classList.add('hl-modal-open'));

    video.play().catch(() => {});

    // Highlight active card
    document.querySelectorAll('.hl-card').forEach(c => {
      c.classList.toggle('hl-active', c.dataset.id === id);
    });
  };

  window.hlModalClose = function (e) {
    // Close on overlay click (not on modal box itself)
    if (e && e.target !== document.getElementById('hlModal') && !e.target.closest('.hl-modal-close')) return;

    const modal = document.getElementById('hlModal');
    const video = document.getElementById('hlModalVideo');
    if (!modal) return;

    video && video.pause();
    modal.classList.remove('hl-modal-open');

    setTimeout(() => {
      modal.style.display = 'none';
      document.body.style.overflow = '';
      currentHlId = null;
    }, 280);

    document.querySelectorAll('.hl-card').forEach(c => c.classList.remove('hl-active'));
  };

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') window.hlModalClose({ target: document.getElementById('hlModal') });
  });

  // -- Build card -----------------------------------------------
  function buildCard(h) {
    const initial = (h.nick || '?').charAt(0).toUpperCase();
    const thumbBg = h.thumb
      ? `style="background-image:url('${h.thumb}');background-size:cover;background-position:center"`
      : '';

    const avatarHtml = h.avatar
      ? `<img src="${h.avatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--primary)" alt="${h.nick}" />`
      : `<div class="hl-avatar">${initial}</div>`;

    return `
      <div class="hl-card" data-id="${h.id}" onclick="hlOpen('${h.id}')">
        <div class="hl-video-wrap" ${thumbBg}>
          <video preload="none" playsinline muted tabindex="-1">
            <source src="${h.video}" type="video/mp4" />
          </video>
          <div class="hl-overlay">
            <div class="hl-play-btn">
              <i class="fas fa-play"></i>
            </div>
          </div>
          <div class="hl-kd-badge">K/D <strong>${h.kd}</strong></div>
        </div>
        <div class="hl-footer">
          ${avatarHtml}
          <div class="hl-meta">
            <span class="hl-nick">${h.nick}</span>
            <span class="hl-label">${h.label || 'Топ хайлайт'}</span>
          </div>
          <i class="fas fa-expand hl-expand-icon"></i>
        </div>
      </div>`;
  }

  // -- Render grid ----------------------------------------------
  function renderHighlights() {
    const grid = document.getElementById('highlightsGrid');
    if (!grid) return;

    const list = getHighlights();
    if (!list.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-dim)">
          <i class="fas fa-film" style="font-size:2.5rem;display:block;margin-bottom:12px"></i>
          <p>Хайлайты не добавлены</p>
        </div>`;
      return;
    }

    grid.innerHTML = list.map(buildCard).join('');
  }

  // -- Init -----------------------------------------------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderHighlights);
  } else {
    renderHighlights();
  }

})();
