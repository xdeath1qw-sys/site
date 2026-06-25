// ── License Agreement ──────────────────────────────────────────
// Показывает модалку с лицензионным соглашением
// Используется на register.html и login.html

(function () {
  'use strict';

  const LICENSE_KEY = 'efl_license_accepted';

  // Уже принял — ничего не делаем
  if (localStorage.getItem(LICENSE_KEY) === '1') return;

  const html = `
  <div id="licenseModal" style="
    position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:99999;
    display:flex;align-items:center;justify-content:center;padding:16px;
    backdrop-filter:blur(6px)
  ">
    <div style="
      background:var(--card,#1a1a2e);border:1px solid var(--border,#2a2a3e);
      border-radius:18px;width:100%;max-width:560px;
      display:flex;flex-direction:column;max-height:90vh;
      box-shadow:0 20px 60px rgba(0,0,0,0.6)
    ">
      <!-- Шапка -->
      <div style="padding:22px 24px 16px;border-bottom:1px solid var(--border,#2a2a3e);flex-shrink:0">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="
            width:42px;height:42px;border-radius:10px;flex-shrink:0;
            background:linear-gradient(135deg,#6c63ff,#00d4ff);
            display:flex;align-items:center;justify-content:center;font-size:1.2rem
          ">📜</div>
          <div>
            <div style="font-weight:800;font-size:1.05rem;color:var(--text,#fff)">Лицензионное соглашение</div>
            <div style="font-size:0.78rem;color:var(--text-muted,#888);margin-top:2px">EFL League — прочитайте перед использованием</div>
          </div>
        </div>
      </div>

      <!-- Текст соглашения -->
      <div style="overflow-y:auto;padding:20px 24px;flex:1;font-size:0.86rem;line-height:1.7;color:var(--text-muted,#aaa)" id="licenseScroll">

        <div style="font-weight:700;color:var(--text,#fff);font-size:0.95rem;margin-bottom:16px">1. Общие положения</div>
        <p>1.1 Настоящее Лицензионное соглашение регулирует использование сайта EFL League и всех его сервисов.</p>
        <p>1.2 Используя сайт EFL League, пользователь автоматически соглашается с условиями данного соглашения.</p>
        <p>1.3 Если пользователь не согласен с условиями соглашения, он обязан прекратить использование сайта.</p>
        <p>1.4 Администрация EFL League имеет право изменять настоящее соглашение без предварительного уведомления пользователей.</p>
        <p>1.5 Продолжение использования сайта после внесения изменений означает согласие пользователя с новой редакцией соглашения.</p>

        <div style="font-weight:700;color:var(--text,#fff);font-size:0.95rem;margin:20px 0 16px">2. Регистрация и аккаунт</div>
        <p>2.1 Пользователь обязан предоставлять достоверную информацию при регистрации.</p>
        <p>2.2 Пользователь несёт полную ответственность за сохранность данных своей учётной записи.</p>
        <p>2.3 Передача аккаунта третьим лицам осуществляется на риск пользователя.</p>
        <p>2.4 Администрация не несёт ответственности за потерю доступа к аккаунту по вине пользователя.</p>
        <p>2.5 Администрация имеет право ограничить доступ к аккаунту при нарушении правил платформы.</p>

        <div style="font-weight:700;color:var(--text,#fff);font-size:0.95rem;margin:20px 0 16px">3. Права и обязанности пользователя</div>
        <p>3.1 Пользователь обязуется использовать сайт исключительно в законных целях.</p>
        <p>3.2 Запрещается использовать сайт для распространения вредоносного программного обеспечения.</p>
        <p>3.3 Запрещается предпринимать попытки взлома, обхода защиты или нарушения работы сайта.</p>
        <p>3.4 Запрещается использовать автоматизированные средства для получения преимуществ или нарушения работы платформы.</p>
        <p>3.5 Пользователь обязан соблюдать правила сайта и турниров EFL League.</p>

        <div style="font-weight:700;color:var(--text,#fff);font-size:0.95rem;margin:20px 0 16px">4. Интеллектуальная собственность</div>
        <p>4.1 Все материалы сайта принадлежат EFL League либо используются на законных основаниях.</p>
        <p>4.2 Запрещается копирование, распространение или изменение материалов сайта без разрешения администрации.</p>
        <p>4.3 Логотипы, дизайн, тексты и другие элементы сайта являются объектами интеллектуальной собственности.</p>

        <div style="font-weight:700;color:var(--text,#fff);font-size:0.95rem;margin:20px 0 16px">5. Ограничение ответственности</div>
        <p>5.1 Сайт предоставляется по принципу «как есть».</p>
        <p>5.2 Администрация не гарантирует бесперебойную работу сайта.</p>
        <p>5.3 Администрация не несёт ответственности за временные сбои, технические ошибки или потерю данных.</p>
        <p>5.4 Администрация не несёт ответственности за действия пользователей сайта.</p>
        <p>5.5 Пользователь использует сайт на свой страх и риск.</p>

        <div style="font-weight:700;color:var(--text,#fff);font-size:0.95rem;margin:20px 0 16px">6. Персональные данные</div>
        <p>6.1 Пользователь соглашается на обработку предоставленных данных для работы сервисов EFL League.</p>
        <p>6.2 Администрация принимает разумные меры для защиты данных пользователей.</p>
        <p>6.3 Администрация не передаёт персональные данные третьим лицам, за исключением случаев, предусмотренных законодательством.</p>

        <div style="font-weight:700;color:var(--text,#fff);font-size:0.95rem;margin:20px 0 16px">7. Блокировка и ограничение доступа</div>
        <p>7.1 Администрация вправе временно или навсегда ограничить доступ пользователя к сайту при нарушении правил.</p>
        <p>7.2 Блокировка может быть произведена без предварительного уведомления.</p>
        <p>7.3 Попытки обхода ограничений могут привести к дополнительным санкциям.</p>

        <div style="font-weight:700;color:var(--text,#fff);font-size:0.95rem;margin:20px 0 16px">8. Изменение и прекращение работы сервиса</div>
        <p>8.1 Администрация вправе изменять функционал сайта в любое время.</p>
        <p>8.2 Администрация вправе временно приостанавливать работу сайта для технического обслуживания.</p>
        <p>8.3 Администрация вправе прекратить работу отдельных сервисов без объяснения причин.</p>

        <div style="font-weight:700;color:var(--text,#fff);font-size:0.95rem;margin:20px 0 16px">9. Заключительные положения</div>
        <p>9.1 Настоящее соглашение вступает в силу с момента начала использования сайта пользователем.</p>
        <p>9.2 Пользователь подтверждает, что ознакомился с условиями соглашения и принимает их полностью.</p>
        <p>9.3 Все спорные ситуации решаются администрацией EFL League.</p>
        <p>9.4 Решения администрации EFL League являются окончательными.</p>
        <p>9.5 Главной целью данного соглашения является обеспечение безопасного, честного и комфортного использования платформы EFL League.</p>
      </div>

      <!-- Подвал с чекбоксом -->
      <div style="padding:18px 24px;border-top:1px solid var(--border,#2a2a3e);flex-shrink:0">
        <label style="display:flex;align-items:center;gap:12px;cursor:pointer;margin-bottom:14px;user-select:none">
          <input type="checkbox" id="licenseCheck" style="
            width:18px;height:18px;cursor:pointer;accent-color:#6c63ff;flex-shrink:0
          " />
          <span style="font-size:0.88rem;color:var(--text,#fff);line-height:1.4">
            Я прочитал(а) и принимаю условия Лицензионного соглашения
          </span>
        </label>
        <div style="display:flex;gap:10px">
          <button id="licenseAcceptBtn" disabled style="
            flex:1;padding:11px;border-radius:10px;border:none;cursor:not-allowed;
            font-size:0.92rem;font-weight:700;
            background:rgba(108,99,255,0.3);color:rgba(255,255,255,0.4);
            transition:all 0.2s
          ">
            Принять и продолжить
          </button>
          <button id="licenseDeclineBtn" style="
            padding:11px 18px;border-radius:10px;border:1px solid var(--border,#2a2a3e);
            background:transparent;cursor:pointer;font-size:0.88rem;
            color:var(--text-muted,#888);transition:all 0.2s
          ">
            Отказаться
          </button>
        </div>
        <div id="licenseErr" style="
          display:none;margin-top:10px;padding:9px 13px;border-radius:8px;
          background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.3);
          color:#f87171;font-size:0.82rem;text-align:center
        ">
          Необходимо принять соглашение для использования сайта
        </div>
      </div>
    </div>
  </div>`;

  // Вставляем в DOM
  document.body.insertAdjacentHTML('afterbegin', html);

  const modal      = document.getElementById('licenseModal');
  const check      = document.getElementById('licenseCheck');
  const acceptBtn  = document.getElementById('licenseAcceptBtn');
  const declineBtn = document.getElementById('licenseDeclineBtn');
  const errMsg     = document.getElementById('licenseErr');

  // Активируем кнопку когда чекбокс отмечен
  check.addEventListener('change', () => {
    if (check.checked) {
      acceptBtn.disabled = false;
      acceptBtn.style.background = 'linear-gradient(135deg,#6c63ff,#00d4ff)';
      acceptBtn.style.color = '#fff';
      acceptBtn.style.cursor = 'pointer';
      acceptBtn.style.boxShadow = '0 4px 16px rgba(108,99,255,0.4)';
      errMsg.style.display = 'none';
    } else {
      acceptBtn.disabled = true;
      acceptBtn.style.background = 'rgba(108,99,255,0.3)';
      acceptBtn.style.color = 'rgba(255,255,255,0.4)';
      acceptBtn.style.cursor = 'not-allowed';
      acceptBtn.style.boxShadow = 'none';
    }
  });

  // Принять
  acceptBtn.addEventListener('click', () => {
    if (!check.checked) { errMsg.style.display = 'block'; return; }
    localStorage.setItem(LICENSE_KEY, '1');
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s';
    setTimeout(() => modal.remove(), 300);
  });

  // Отказаться — редирект на главную или закрыть вкладку
  declineBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Блокируем закрытие по клику вне модалки
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      errMsg.style.display = 'block';
    }
  });

})();
