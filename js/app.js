/* =========================================================
   Flora Alma — vitrine (SPA com rotas por hash)
   ========================================================= */
(() => {
  // não deixa a loja ser aberta dentro de outro site (proteção contra clickjacking)
  if (window.top !== window.self) {
    try { window.top.location.replace(window.location.href); } catch { document.documentElement.innerHTML = ''; }
    return;
  }
  const S = FA.store;
  const A = FA.art;
  const st = S.state;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const app = $('#app');
  const brl = S.brl;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (n, cls = '') => `<svg class="ic ${cls}"><use href="#i-${n}"/></svg>`;
  const catName = (id) => (FA.categories.find((c) => c.id === id) || {}).name || id;
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const igUrl = () => `https://www.instagram.com/${encodeURIComponent(st.settings.instagram || 'floraalmaartesanal')}/`;

  const CARE = {
    velas: 'Na primeira vez, deixe a vela acesa até a cera derreter por igual até a borda (cerca de 2 horas). Antes de acender de novo, apare o pavio para uns 0,5 cm. Nunca deixe a vela acesa sem ninguém por perto, e mantenha longe de cortinas, crianças e pets.',
    sabonetes: 'Guarde o sabonete numa saboneteira que escorra a água, longe do jato do chuveiro: assim ele dura bem mais. Uso externo. Se houver qualquer irritação, suspenda o uso.',
    corpo: 'Uso externo. Faça um teste numa pequena área da pele antes do primeiro uso. Guarde em lugar fresco, longe do sol.',
    casa: 'Teste antes num cantinho escondido do tecido. Mantenha longe do alcance de crianças e pets e não borrife perto de chama.',
    kits: 'Cada peça do kit vem com as orientações de uso. Quer mandar um recado? Escreva a mensagem do cartão na finalização da compra.',
  };

  /* =========================================================
     UI helpers
     ========================================================= */
  function toast(msg, type = 'ok') {
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.innerHTML = `${icon(type === 'err' ? 'x' : 'check')}<span>${esc(msg)}</span>`;
    $('#toasts').appendChild(t);
    requestAnimationFrame(() => t.classList.add('is-in'));
    setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 400); }, 3200);
  }
  function modal(html, cls = '') {
    const m = $('#modal');
    m.querySelector('.modal__card').className = `modal__card ${cls}`;
    m.querySelector('.modal__card').innerHTML = `<button class="iconbtn modal__x" data-action="close-modal" aria-label="Fechar">${icon('x')}</button>${html}`;
    m.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
    return m.querySelector('.modal__card');
  }
  function closeModal() { $('#modal').setAttribute('aria-hidden', 'true'); unlockIfIdle(); }
  function unlockIfIdle() {
    if (!document.body.classList.contains('cart-open') && !document.body.classList.contains('search-open') && $('#modal').getAttribute('aria-hidden') === 'true') document.body.classList.remove('lock');
  }
  // scripts externos só carregam se o conteúdo bater com o hash (SRI)
  function loadScript(src, integrity) {
    return new Promise((res, rej) => {
      if ($(`script[src="${src}"]`)) return res();
      const s = document.createElement('script');
      if (integrity) { s.integrity = integrity; s.crossOrigin = 'anonymous'; }
      s.src = src; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  function flyToCart(fromEl) {
    const target = window.innerWidth < 960 ? $('.tabbar [data-action="open-cart"]') : $('.iconbtn--cart');
    if (!fromEl || !target) return;
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const dot = document.createElement('div');
    dot.className = 'fly';
    dot.style.left = a.left + a.width / 2 + 'px';
    dot.style.top = a.top + a.height / 2 + 'px';
    document.body.appendChild(dot);
    requestAnimationFrame(() => {
      dot.style.transform = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(.3)`;
      dot.style.opacity = '.4';
    });
    setTimeout(() => { dot.remove(); target.classList.add('bump'); setTimeout(() => target.classList.remove('bump'), 500); }, 650);
  }
  // barra fixa (celular): aparece enquanto o botão principal está fora da tela
  function watchBar(bar, target) {
    if (!bar || !target) return;
    new IntersectionObserver(([en]) => {
      const show = !en.isIntersecting;
      bar.classList.toggle('is-on', show);
      bar.setAttribute('aria-hidden', String(!show));
    }).observe(target);
  }
  const reveal = () => {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    $$('[data-reveal]:not(.is-in)').forEach((el, i) => { el.style.setProperty('--d', (i % 6) * 0.05 + 's'); io.observe(el); });
  };

  /* =========================================================
     Componentes
     ========================================================= */
  function priceBlock(p, big = false) {
    const inst = S.installment(p.price);
    return `<div class="price ${big ? 'price--big' : ''}">
      ${p.old_price > p.price ? `<s>${brl(p.old_price)}</s>` : ''}
      <b>${brl(p.price)}</b>
      ${inst.n > 1 ? `<span class="price__inst">ou ${inst.n}x de ${brl(inst.value)} sem juros</span>` : ''}
      ${Number(st.settings.pixDiscount) ? `<span class="price__pix">${icon('pix')} ${brl(S.pixPrice(p.price))} no Pix</span>` : ''}
    </div>`;
  }

  function card(p) {
    const off = S.discountPct(p);
    const out = p.stock <= 0;
    const wished = st.wish.includes(p.id);
    const many = p.options?.length > 1;
    return `<article class="pcard ${out ? 'is-out' : ''}" data-reveal>
      <a class="pcard__media" href="#/produto/${p.id}" style="--bg:${A.bg(p.art)}" aria-label="${esc(p.name)}">
        <div class="pcard__badges">
          ${p.is_new ? '<span class="tag tag--new">Novidade</span>' : ''}
          ${off ? `<span class="tag tag--off">-${off}%</span>` : ''}
          ${out ? '<span class="tag tag--out">Esgotado</span>' : p.stock <= 3 ? '<span class="tag tag--low">Últimas unidades</span>' : ''}
        </div>
        ${A.media(p)}
      </a>
      <button class="pcard__wish ${wished ? 'is-on' : ''}" data-action="wish" data-id="${p.id}" aria-label="Favoritar ${esc(p.name)}">${icon('heart')}</button>
      <div class="pcard__body">
        <span class="pcard__meta">${esc(p.sub)}${p.aroma && p.aroma !== 'Vários' ? ' · ' + esc(p.aroma) : ''}</span>
        <a class="pcard__name" href="#/produto/${p.id}">${esc(p.name)}</a>
        ${p.notes ? `<span class="pcard__notes">${esc(p.notes)}</span>` : ''}
        ${priceBlock(p)}
      </div>
      <button class="pcard__add" data-action="quick-add" data-id="${p.id}" ${out ? 'disabled' : ''}>
        ${out ? 'Esgotado' : many ? `${icon('drop')} Escolher ${esc((p.opt_label || 'aroma').toLowerCase())}` : `${icon('plus')} Pôr na sacola`}
      </button>
    </article>`;
  }

  function sectionHead(kicker, title, link) {
    return `<div class="shead" data-reveal>
      <div><span class="kicker">${kicker}</span><h2 class="h2">${title}</h2></div>
      ${link ? `<a class="link-arrow" href="${link[1]}" ${/^https?:/.test(link[1]) ? 'target="_blank" rel="noopener"' : ''}>${link[0]} ${icon('arrow')}</a>` : ''}
    </div>`;
  }

  const emptyArt = (kind = 'soap') => A.render({ kind, color: '#e4d6c5', accent: '#cdbba6', wax: '#efe5d7', deco: 'none' }, { lit: false });

  /* =========================================================
     HOME
     ========================================================= */
  function viewHome() {
    const s = st.settings;
    const products = st.products;
    const featured = products.filter((p) => p.featured);
    const promos = products.filter((p) => p.old_price > p.price);
    const news = products.filter((p) => p.is_new);
    const candles = products.filter((p) => p.cat === 'velas');
    const spot = candles.find((p) => p.featured && p.is_new) || candles.find((p) => p.featured) || candles[0] || products[0];
    const count = (cat) => products.filter((p) => p.cat === cat).length;
    const highlights = [
      ['Kits', '#/loja/kits', { kind: 'box', color: '#4a2c21', accent: '#d8b48c' }],
      ['Produção', '#/#feito-a-mao', { kind: 'soap', color: '#ecd3a0', accent: '#b98c4f', deco: 'oats' }],
      ['Momentos', '#/#aromas', { kind: 'jar', color: '#c9894a', wax: '#f4e6cc', accent: '#4a2c21', label: 'BAUNILHA' }],
      ['Clientes', igUrl(), { kind: 'sachet', color: '#ecdccb', accent: '#b0574f' }],
      ['Produtos', '#/loja', { kind: 'soap', color: '#c7b6dc', accent: '#7a64a0', deco: 'buds' }],
      ['Flora Alma', igUrl(), null],
    ];
    const hasMap = Number(s.lat) && Number(s.lng);
    const marquee = ['feito à mão', 'autocuidado que abraça', 'aroma que fica', 'de Feira de Santana com carinho'];

    const html = `
    <section class="hero">
      <div class="hero__dots" aria-hidden="true"></div>
      <div class="hero__branch hero__branch--a" aria-hidden="true">${A.branch('#d8b48c', 1.3)}</div>
      <div class="wrap hero__grid">
        <div class="hero__copy">
          <span class="kicker kicker--sand">${icon('leaf')} Feito à mão</span>
          <h1 class="hero__title"><span>Autocuidado</span><span>que <em>abraça.</em></span></h1>
          <p class="hero__lead">Sabonetes artesanais, velas aromáticas e mimos para presentear. Um cheirinho bom para o seu banho, a sua casa e as pessoas que você ama.</p>
          <div class="hero__ctas">
            <a class="btn btn--sand" href="#/loja">Conhecer a loja ${icon('arrow')}</a>
            <a class="btn btn--ghost-light" href="#/loja/kits">${icon('gift')} Montar um presente</a>
          </div>
          <ul class="hero__perks">
            ${Number(s.pixDiscount) ? `<li>${icon('pix')}<span><b>${s.pixDiscount}% off</b> no Pix</span></li>` : ''}
            <li>${icon('gift')}<span>Embalagem <b>para presente</b></span></li>
            <li>${icon('truck')}<span>Entrega em <b>Feira</b></span></li>
          </ul>
        </div>
        <div class="hero__stage" aria-hidden="true">
          <div class="hero__arch"><span class="hero__halo"></span></div>
          <div class="hero__wisps">${A.wisps('#8a5a3c')}</div>
          <div class="hero__candle">${A.render({ kind: 'jar', color: '#c9894a', wax: '#f4e6cc', accent: '#4a2c21', label: 'BAUNILHA' })}</div>
          <div class="hero__round">${A.render({ kind: 'soapround', color: '#ecd3a0', accent: '#b98c4f', deco: 'oats' })}</div>
          <div class="hero__soap">${A.render({ kind: 'soap', color: '#c7b6dc', accent: '#7a64a0', deco: 'buds' })}</div>
          <div class="hero__sprig">${A.sprig()}</div>
          <div class="hero__bubbles"><i></i><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        ${spot ? `<a class="hero__tagcard" href="#/produto/${spot.id}">
          <span class="kicker">${icon('flame')} Vela da vez</span>
          <b>${esc(spot.name)}</b>
          <span>${brl(spot.price)}${Number(s.pixDiscount) ? ` <small>· ${brl(S.pixPrice(spot.price))} no Pix</small>` : ''}</span>
          ${icon('arrow')}
        </a>` : ''}
      </div>
    </section>

    <section class="cats wrap">
      ${FA.categories.map((c) => `
        <a class="cat" href="#/loja/${c.id}" data-reveal>
          <div class="cat__art" style="--bg:${A.bg(c.art)}">${A.render(c.art)}</div>
          <div class="cat__txt"><b>${c.name}</b><small>${c.tagline}</small></div>
          <span class="cat__n">${count(c.id)}</span>
        </a>`).join('')}
    </section>

    <section class="section wrap">
      ${sectionHead('A vitrine', 'Os queridinhos do <em>ateliê</em>', ['Ver tudo', '#/loja'])}
      <div class="tabs" role="tablist" data-reveal>
        <button class="tab is-on" data-tab-target="featured">Mais pedidos</button>
        <button class="tab" data-tab-target="news">Novidades</button>
        <button class="tab" data-tab-target="promo">Promoções</button>
      </div>
      <div class="grid" data-tab-pane="featured">${featured.slice(0, 8).map(card).join('')}</div>
      <div class="grid" data-tab-pane="news" hidden>${news.slice(0, 8).map(card).join('') || '<p class="muted">Novidades chegando.</p>'}</div>
      <div class="grid" data-tab-pane="promo" hidden>${promos.slice(0, 8).map(card).join('') || '<p class="muted">Sem promoções no momento.</p>'}</div>
    </section>

    ${spot ? `
    <section class="spot">
      <div class="spot__marquee" aria-hidden="true"><div>${[...marquee, ...marquee].map((w) => `<span>${w}</span><i>✿</i>`).join('')}</div></div>
      <div class="wrap spot__grid">
        <div class="spot__art" data-reveal>
          <div class="spot__arch">
            <div class="spot__wisps">${A.wisps('#d8b48c')}</div>
            ${A.media(spot)}
          </div>
        </div>
        <div class="spot__copy" data-reveal>
          <span class="kicker kicker--sand">${icon('flame')} Vela da vez</span>
          <h2 class="h2 h2--light">${esc(spot.name)}</h2>
          ${spot.notes ? `<p class="spot__notes">${icon('leaf')} <em>${esc(spot.notes)}</em></p>` : ''}
          <p>${esc(spot.description)}</p>
          <dl class="spot__specs">${(spot.specs || []).slice(0, 4).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
          <div class="spot__buy">
            ${priceBlock(spot, true)}
            <a class="btn btn--sand" href="#/produto/${spot.id}">Quero essa ${icon('arrow')}</a>
          </div>
        </div>
      </div>
    </section>` : ''}

    <section class="section wrap quiz" id="aromas">
      <div class="quiz__intro" data-reveal>
        <span class="kicker">${icon('sparkle')} Guia de aromas</span>
        <h2 class="h2">Qual aroma combina com o seu <em>momento</em>?</h2>
        <p class="lead">Escolha como você quer se sentir e onde vai usar. A gente sugere os aromas certos para você — ou para quem você vai presentear.</p>
      </div>
      <div class="quiz__tool" data-reveal>${quizTool()}</div>
      <div class="quiz__res" id="quizRes"></div>
    </section>

    <section class="souv">
      <div class="wrap souv__grid">
        <div class="souv__art" data-reveal aria-hidden="true">
          <div class="souv__blob"></div>
          <div class="souv__a">${A.render({ kind: 'box', color: '#e8b9ae', accent: '#fbf7f0' })}</div>
          <div class="souv__b">${A.render({ kind: 'tin', color: '#cfc6bb', wax: '#f4ead8', accent: '#4a2c21', label: 'ANA & LUCAS' })}</div>
          <div class="souv__c">${A.render({ kind: 'soap', color: '#f3e3cf', accent: '#d8b48c', deco: 'petals' })}</div>
        </div>
        <div class="souv__copy" data-reveal>
          <span class="kicker">${icon('gift')} Lembrancinhas personalizadas</span>
          <h2 class="h2">Lembranças que <em>perfumam</em> a memória.</h2>
          <p class="lead">Casamento, maternidade, chá de bebê, aniversário ou evento da empresa: criamos mimos com o nome, as cores e o aroma da sua festa.</p>
          <ul class="svc-list">
            ${st.souvenirs.slice(0, 4).map((v) => `<li><span>${esc(v.name)}</span><i></i><b>${brl(v.price)}<small>/un.</small></b></li>`).join('')}
          </ul>
          <a class="btn btn--dark" href="#/lembrancinhas">Pedir orçamento ${icon('arrow')}</a>
        </div>
      </div>
    </section>

    <section class="section wrap made" id="feito-a-mao">
      ${sectionHead('Do ateliê para você', 'Feito à mão, <em>sem pressa</em>')}
      <ol class="made__steps">
        ${[
          ['leaf', 'Aromas escolhidos com cuidado', 'Cada fragrância é pensada para um momento: acordar, desacelerar, receber visita, dormir bem.'],
          ['drop', 'Mistura e molde à mão', 'Sabonetes e velas são feitos em pequenas quantidades, peça por peça, no nosso ateliê.'],
          ['clock', 'O tempo certo de cada peça', 'Cada peça descansa e firma antes de seguir para a embalagem. Sem pressa.'],
          ['gift', 'Embalado com carinho', 'Laço, tag e, se você quiser, um cartão escrito à mão para quem vai receber.'],
        ].map(([i, t, d], n) => `<li class="made__step" data-reveal><span class="made__n">0${n + 1}</span><span class="made__ic">${icon(i)}</span><b>${t}</b><p>${d}</p></li>`).join('')}
      </ol>
    </section>

    <section class="perks wrap">
      ${[
        Number(s.pixDiscount) ? ['pix', `${s.pixDiscount}% de desconto no Pix`, 'Pagamento na hora, com QR Code'] : null,
        S.installment(999).n > 1 ? ['card', `Até ${S.installment(999).n}x sem juros`, 'No cartão de crédito'] : null,
        ['gift', 'Embalagem para presente', `Laço e cartão escrito à mão · ${brl(s.giftWrap)}`],
        ['truck', 'Entrega em Feira de Santana', `Grátis acima de ${brl(s.freeShippingOver)}`],
      ].filter(Boolean).map(([i, t, d]) => `<div class="perk" data-reveal>${icon(i)}<div><b>${t}</b><small>${d}</small></div></div>`).join('')}
    </section>

    <section class="section wrap">
      ${sectionHead('@' + esc(s.instagram), 'Direto dos nossos <em>destaques</em>', ['Seguir no Instagram', igUrl()])}
      <div class="stories">
        ${highlights.map(([t, href, art]) => `
          <a class="story" href="${href}" ${/^https?:/.test(href) ? 'target="_blank" rel="noopener"' : ''} data-reveal>
            <span class="story__ring"><span class="story__art">${art ? A.render(art) : '<img src="assets/logo.jpg" alt=""/>'}</span></span>
            <small>${t}</small>
          </a>`).join('')}
      </div>
    </section>

    <section class="visit">
      <div class="wrap visit__grid">
        <div class="visit__copy" data-reveal>
          <span class="kicker">${icon('pin')} Ateliê em Feira de Santana</span>
          <h2 class="h2">Vamos <em>conversar</em>?</h2>
          <p class="lead">Tire dúvidas sobre aromas, encomende um presente especial ou combine a retirada do seu pedido.</p>
          <ul class="visit__info">
            <li>${icon('pin')}<span>${esc(s.address || s.city)}</span></li>
            <li>${icon('clock')}<span>${esc(s.hours)}</span></li>
            ${s.whatsapp ? `<li>${icon('wa')}<span>${S.fmtPhone(s.whatsapp)}</span></li>` : ''}
            <li>${icon('insta')}<span>@${esc(s.instagram)}</span></li>
          </ul>
          <div class="visit__ctas">
            <a class="btn btn--wa" target="_blank" rel="noopener" href="${S.waLink('Olá, Flora Alma! Vim pelo site e queria tirar uma dúvida.')}">${icon('wa')} Chamar no WhatsApp</a>
            <a class="btn btn--line" target="_blank" rel="noopener" href="${igUrl()}">${icon('insta')} Ver o Instagram</a>
          </div>
        </div>
        <div class="visit__card" data-reveal>
          ${hasMap ? `<div class="visit__map"><iframe title="Mapa do ateliê Flora Alma" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            src="https://maps.google.com/maps?q=${Number(s.lat)},${Number(s.lng)}&z=16&output=embed"></iframe></div>`
            : `<div class="visit__brand">
              <div class="visit__branch">${A.branch('#d8b48c', 1.2)}</div>
              <img src="assets/logo.jpg" alt="Flora Alma" width="120" height="120"/>
              <b>flora alma</b>
              <span>Autocuidado que abraça</span>
              <small>${esc(s.city)}</small>
            </div>`}
        </div>
      </div>
    </section>`;

    return {
      html,
      mount() {
        mountQuiz($('.quiz'));
        $$('[data-tab-target]').forEach((b) => b.addEventListener('click', () => {
          $$('[data-tab-target]').forEach((x) => x.classList.toggle('is-on', x === b));
          $$('[data-tab-pane]').forEach((p) => { p.hidden = p.dataset.tabPane !== b.dataset.tabTarget; });
          reveal();
        }));
      },
    };
  }

  /* ---------- Guia de aromas ---------- */
  const USES = [['tudo', 'Em tudo'], ['banho', 'No banho'], ['casa', 'Em casa'], ['presente', 'Para presentear']];
  const USE_CATS = { banho: ['sabonetes', 'corpo'], casa: ['velas', 'casa'], presente: ['kits'] };
  function quizTool() {
    return `<div class="quiz-tool">
      <p class="quiz-tool__q"><span class="step">1</span> Como você quer se sentir?</p>
      <div class="moods">${FA.moods.map((m, i) => `<button type="button" class="mood ${i === 0 ? 'is-on' : ''}" data-mood="${m.id}" aria-pressed="${i === 0}">
        <span class="mood__ic">${icon(m.icon)}</span><b>${m.name}</b><small>${m.notes}</small></button>`).join('')}</div>
      <p class="quiz-tool__q"><span class="step">2</span> Onde você vai usar?</p>
      <div class="seg seg--wrap">${USES.map(([v, l], i) => `<button type="button" class="seg__b ${i === 0 ? 'is-on' : ''}" data-use="${v}">${l}</button>`).join('')}</div>
    </div>`;
  }
  function mountQuiz(root) {
    if (!root) return;
    const sel = { mood: FA.moods[0].id, use: 'tudo' };
    const paint = () => {
      const m = FA.moods.find((x) => x.id === sel.mood);
      const cats = USE_CATS[sel.use];
      const inUse = st.products.filter((p) => p.stock > 0 && (!cats || cats.includes(p.cat)));
      let list = inUse.filter((p) => (p.moods || []).includes(sel.mood));
      if (!list.length) list = inUse;
      list = [...list].sort((a, b) => (b.featured - a.featured) || (a.sort - b.sort)).slice(0, 3);
      $('#quizRes').innerHTML = `<div class="quiz-out">
        <div class="quiz-out__profile">
          <span class="kicker">Seu momento</span>
          <h3>${esc(m.name)}</h3>
          <p class="quiz-out__notes">${icon('leaf')} <em>${esc(m.notes)}</em></p>
          <p>${esc(m.text)}</p>
          <a class="link-arrow" href="#/loja?mood=${m.id}">Ver tudo para ${esc(m.name.toLowerCase())} ${icon('arrow')}</a>
        </div>
        <div class="grid grid--quiz">${list.map(card).join('')}</div>
      </div>`;
      reveal();
    };
    root.addEventListener('click', (e) => {
      const mb = e.target.closest('[data-mood]');
      if (mb) { sel.mood = mb.dataset.mood; $$('[data-mood]', root).forEach((x) => { x.classList.toggle('is-on', x === mb); x.setAttribute('aria-pressed', String(x === mb)); }); paint(); }
      const ub = e.target.closest('[data-use]');
      if (ub) { sel.use = ub.dataset.use; $$('[data-use]', root).forEach((x) => x.classList.toggle('is-on', x === ub)); paint(); }
    });
    paint();
  }

  /* =========================================================
     LOJA (catálogo + filtros)
     ========================================================= */
  function viewShop(cat, params) {
    const f = {
      cat: cat || params.get('cat') || '',
      q: params.get('q') || '',
      sub: params.get('sub') || '',
      aroma: params.get('aroma') || '',
      mood: params.get('mood') || '',
      sort: params.get('sort') || 'relevancia',
      promo: params.get('promo') === '1',
      stock: params.get('stock') === '1',
      max: Number(params.get('max')) || 0,
    };
    const base = () => st.products.filter((p) => !f.cat || p.cat === f.cat);
    const maxPrice = Math.ceil(Math.max(20, ...base().map((p) => p.price)) / 10) * 10;

    function filtered() {
      const q = norm(f.q);
      const list = base().filter((p) => {
        const hay = norm(`${p.name} ${p.aroma} ${p.sub} ${p.cat} ${p.notes} ${(p.options || []).join(' ')}`);
        return (!q || q.split(/\s+/).every((w) => hay.includes(w)))
          && (!f.sub || p.sub === f.sub)
          && (!f.aroma || p.aroma === f.aroma)
          && (!f.mood || (p.moods || []).includes(f.mood))
          && (!f.promo || p.old_price > p.price)
          && (!f.stock || p.stock > 0)
          && (!f.max || p.price <= f.max);
      });
      const sorters = {
        relevancia: (a, b) => (b.featured - a.featured) || (a.sort - b.sort),
        menor: (a, b) => a.price - b.price,
        maior: (a, b) => b.price - a.price,
        desconto: (a, b) => S.discountPct(b) - S.discountPct(a),
        az: (a, b) => a.name.localeCompare(b.name),
      };
      return list.sort(sorters[f.sort] || sorters.relevancia);
    }

    const subs = [...new Set(base().map((p) => p.sub).filter(Boolean))];
    const aromas = [...new Set(base().map((p) => p.aroma).filter((a) => a && a !== 'Vários'))].sort();
    const moodName = (FA.moods.find((m) => m.id === f.mood) || {}).name;
    const title = f.cat ? catName(f.cat) : f.q ? `Busca: “${esc(f.q)}”` : moodName ? `Para ${esc(moodName.toLowerCase())}` : 'Todos os produtos';

    const filtersHtml = `
      <div class="filters__group">
        <h4>Categoria</h4>
        <div class="chips">
          <a class="chip ${!f.cat ? 'is-on' : ''}" href="#/loja">Tudo</a>
          ${FA.categories.map((c) => `<a class="chip ${f.cat === c.id ? 'is-on' : ''}" href="#/loja/${c.id}">${c.name}</a>`).join('')}
        </div>
      </div>
      <div class="filters__group"><h4>Momento</h4><div class="chips">
        ${FA.moods.map((m) => `<button class="chip ${f.mood === m.id ? 'is-on' : ''}" data-f="mood" data-v="${m.id}">${icon(m.icon)} ${m.name}</button>`).join('')}
      </div></div>
      ${subs.length > 1 ? `<div class="filters__group"><h4>Tipo</h4><div class="chips">
        ${subs.map((s) => `<button class="chip ${f.sub === s ? 'is-on' : ''}" data-f="sub" data-v="${esc(s)}">${esc(s)}</button>`).join('')}
      </div></div>` : ''}
      ${aromas.length > 1 ? `<div class="filters__group"><h4>Aroma</h4><div class="chips">
        ${aromas.map((b) => `<button class="chip ${f.aroma === b ? 'is-on' : ''}" data-f="aroma" data-v="${esc(b)}">${esc(b)}</button>`).join('')}
      </div></div>` : ''}
      <div class="filters__group">
        <h4>Preço até <b class="maxlabel">${f.max ? brl(f.max) : brl(maxPrice)}</b></h4>
        <input type="range" class="range" min="10" max="${maxPrice}" step="5" value="${f.max || maxPrice}" data-f="max" aria-label="Preço máximo" style="--p:${(((f.max || maxPrice) - 10) / Math.max(1, maxPrice - 10)) * 100}%" />
      </div>
      <div class="filters__group">
        <label class="check"><input type="checkbox" data-f="promo" ${f.promo ? 'checked' : ''}/><span></span>Só promoções</label>
        <label class="check"><input type="checkbox" data-f="stock" ${f.stock ? 'checked' : ''}/><span></span>Só com estoque</label>
      </div>
      <button class="btn btn--line btn--block" data-f="clear">Limpar filtros</button>`;

    const html = `
      <section class="pagehead">
        <div class="wrap">
          <nav class="crumbs"><a href="#/">Início</a> / <a href="#/loja">Loja</a>${f.cat ? ` / <span>${catName(f.cat)}</span>` : ''}</nav>
          <h1 class="h1">${title}</h1>
          ${f.cat ? `<p class="pagehead__sub">${esc((FA.categories.find((c) => c.id === f.cat) || {}).tagline || '')}</p>` : ''}
        </div>
      </section>
      <section class="wrap shop">
        <aside class="filters" id="filters">
          <div class="filters__head"><b>Filtros</b><button class="iconbtn" data-action="close-filters" aria-label="Fechar filtros">${icon('x')}</button></div>
          ${filtersHtml}
        </aside>
        <div class="shop__main">
          <div class="shop__bar">
            <button class="btn btn--line btn--sm show-sm" data-action="open-filters">${icon('filter')} Filtros</button>
            <div class="searchinline">${icon('search')}<input type="search" placeholder="Buscar nesta seção…" value="${esc(f.q)}" data-f="q" aria-label="Buscar nesta seção"/></div>
            <span class="shop__count" id="shopCount"></span>
            <select class="select" data-f="sort" aria-label="Ordenar">
              ${[['relevancia', 'Relevância'], ['menor', 'Menor preço'], ['maior', 'Maior preço'], ['desconto', 'Maior desconto'], ['az', 'A–Z']].map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="grid grid--shop" id="shopGrid"></div>
        </div>
      </section>`;

    function paint() {
      const list = filtered();
      $('#shopGrid').innerHTML = list.length ? list.map(card).join('') : `
        <div class="empty">${emptyArt('soap')}
          <h3>Nada por aqui… ainda</h3><p>Tente outros filtros ou fale com a gente no WhatsApp: se não estiver na vitrine, a gente pode fazer sob encomenda.</p>
          <a class="btn btn--dark" target="_blank" rel="noopener" href="${S.waLink('Olá, Flora Alma! Procuro um produto que não achei no site: ')}">${icon('wa')} Pedir no WhatsApp</a></div>`;
      $('#shopCount').textContent = `${list.length} ${list.length === 1 ? 'produto' : 'produtos'}`;
      const qs = new URLSearchParams();
      ['q', 'sub', 'aroma', 'mood', 'sort'].forEach((k) => { if (f[k] && !(k === 'sort' && f[k] === 'relevancia')) qs.set(k, f[k]); });
      if (f.promo) qs.set('promo', '1');
      if (f.stock) qs.set('stock', '1');
      if (f.max && f.max < maxPrice) qs.set('max', f.max);
      // caminho absoluto: nas páginas de SEO (com <base>) o endereço continua o da própria página
      history.replaceState(null, '', `${location.pathname}#/loja${f.cat ? '/' + f.cat : ''}${qs.toString() ? '?' + qs : ''}`);
      reveal();
    }

    return {
      html,
      mount() {
        paint();
        const root = $('.shop');
        root.addEventListener('click', (e) => {
          const b = e.target.closest('button[data-f]');
          if (!b) return;
          const k = b.dataset.f;
          if (k === 'clear') { Object.assign(f, { q: '', sub: '', aroma: '', mood: '', promo: false, stock: false, max: 0, sort: 'relevancia' }); router(); return; }
          f[k] = f[k] === b.dataset.v ? '' : b.dataset.v;
          $$(`button[data-f="${k}"]`, root).forEach((x) => x.classList.toggle('is-on', f[k] === x.dataset.v));
          paint();
        });
        root.addEventListener('input', (e) => {
          const el = e.target.closest('[data-f]');
          if (!el) return;
          const k = el.dataset.f;
          if (el.type === 'checkbox') f[k] = el.checked;
          else if (k === 'max') { f.max = +el.value >= maxPrice ? 0 : +el.value; $('.maxlabel').textContent = brl(+el.value); el.style.setProperty('--p', ((+el.value - 10) / Math.max(1, maxPrice - 10)) * 100 + '%'); }
          else f[k] = el.value;
          paint();
        });
      },
    };
  }

  /* =========================================================
     PRODUTO
     ========================================================= */
  function viewProduct(id) {
    const p = S.product(id);
    if (!p) return viewNotFound();
    const off = S.discountPct(p);
    const out = p.stock <= 0;
    const related = st.products.filter((x) => x.id !== p.id && x.cat === p.cat).slice(0, 4);
    const pairs = st.products.filter((x) => x.id !== p.id && x.cat !== p.cat && (x.moods || []).some((m) => (p.moods || []).includes(m))).slice(0, 4);
    const moods = FA.moods.filter((m) => (p.moods || []).includes(m.id));
    const label = p.opt_label || 'Aroma';
    let opt = p.options?.length === 1 ? p.options[0] : '';

    const html = `
      <section class="wrap pdp">
        <nav class="crumbs"><a href="#/">Início</a> / <a href="#/loja/${p.cat}">${catName(p.cat)}</a> / <span>${esc(p.name)}</span></nav>
        <div class="pdp__grid">
          <div class="pdp__media" style="--bg:${A.bg(p.art)}">
            <div class="pcard__badges">
              ${p.is_new ? '<span class="tag tag--new">Novidade</span>' : ''}${off ? `<span class="tag tag--off">-${off}%</span>` : ''}
            </div>
            ${!p.image && ['jar', 'tin', 'cup'].includes(p.art?.kind) ? `<div class="pdp__wisps" aria-hidden="true">${A.wisps('#c9a27a')}</div>` : ''}
            ${A.media(p)}
            <button class="pcard__wish pdp__wish ${st.wish.includes(p.id) ? 'is-on' : ''}" data-action="wish" data-id="${p.id}" aria-label="Favoritar">${icon('heart')}</button>
          </div>
          <div class="pdp__info">
            <span class="pcard__meta">${esc(p.sub)}${p.aroma && p.aroma !== 'Vários' ? ' · ' + esc(p.aroma) : ''}</span>
            <h1 class="pdp__title">${esc(p.name)}</h1>
            ${p.notes ? `<p class="pdp__notes">${icon('leaf')} <em>${esc(p.notes)}</em></p>` : ''}
            ${priceBlock(p, true)}
            ${moods.length ? `<div class="pdp__moods">${moods.map((m) => `<a class="moodtag" href="#/loja?mood=${m.id}">${icon(m.icon)} ${m.name}</a>`).join('')}</div>` : ''}

            ${p.options?.length ? `<div class="opt"><div class="opt__head"><b>${esc(label)}:</b> <span class="opt-name">${esc(opt) || 'escolha uma opção'}</span></div>
              <div class="sizes">${p.options.map((s) => `<button class="size ${s === opt ? 'is-on' : ''}" data-opt="${esc(s)}">${esc(s)}</button>`).join('')}</div></div>` : ''}

            <div class="pdp__buy">
              <div class="qty"><button data-q="-1" aria-label="Diminuir">${icon('minus')}</button><input value="1" inputmode="numeric" aria-label="Quantidade"/><button data-q="1" aria-label="Aumentar">${icon('plus')}</button></div>
              <button class="btn btn--dark btn--grow" data-buy="add" ${out ? 'disabled' : ''}>${out ? 'Esgotado' : `${icon('bag')} Pôr na sacola`}</button>
            </div>
            <button class="btn btn--sand btn--block" data-buy="now" ${out ? 'disabled' : ''}>Comprar agora</button>
            <p class="pdp__stock ${p.stock <= 3 ? 'is-low' : ''}">${out ? 'Sem estoque no momento. ' : p.stock <= 3 ? `Restam só ${p.stock} unidade${p.stock > 1 ? 's' : ''}! ` : `${icon('check')} Pronta entrega · `}<a target="_blank" rel="noopener" href="${S.waLink(`Olá! Tenho interesse em: ${p.name}`)}">${out ? 'avise-me pelo WhatsApp' : 'tirar dúvida no WhatsApp'}</a></p>
            <ul class="pdp__perks">
              ${Number(st.settings.pixDiscount) ? `<li>${icon('pix')}<span><b>${st.settings.pixDiscount}% off</b> no Pix</span></li>` : ''}
              <li>${icon('gift')}<span>Embalagem <b>para presente</b></span></li>
              <li>${icon('truck')}<span>Entrega em <b>Feira</b></span></li>
            </ul>

            <div class="ship">
              <b>${icon('truck')} Calcule a entrega</b>
              <div class="ship__row"><input class="input" placeholder="Seu CEP" inputmode="numeric" maxlength="9" id="shipCep" aria-label="CEP"/><button class="btn btn--line btn--sm" id="shipBtn">Calcular</button></div>
              <div class="ship__out" id="shipOut"><p>${icon('store')}<span><b>Retirada combinada:</b> grátis, em Feira de Santana</span></p></div>
            </div>

            <div class="pdp__tabs">
              <details open><summary>Sobre</summary><p>${esc(p.description)}</p></details>
              ${p.specs?.length ? `<details open><summary>Detalhes</summary><dl class="specs">${p.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></details>` : ''}
              ${CARE[p.cat] ? `<details><summary>Como usar e cuidados</summary><p>${CARE[p.cat]}</p></details>` : ''}
              <details><summary>Para presentear</summary><p>Na finalização da compra, marque “É para presente” e a gente embala com laço e cartão escrito à mão${Number(st.settings.giftWrap) ? ` (+ ${brl(st.settings.giftWrap)})` : ''}. Você escolhe a mensagem.</p></details>
            </div>
          </div>
        </div>
        <div class="buybar" id="buybar" aria-hidden="true">
          <div class="buybar__info"><small>${esc(p.name)}</small><b>${brl(p.price)}</b></div>
          <button class="btn btn--sand btn--sm" data-buy="add" tabindex="-1" ${out ? 'disabled' : ''}>${out ? 'Esgotado' : `${icon('bag')} Pôr na sacola`}</button>
        </div>
      </section>
      ${pairs.length ? `<section class="section wrap">${sectionHead('Combina com', 'Para completar o <em>ritual</em>')}<div class="grid">${pairs.map(card).join('')}</div></section>` : ''}
      ${related.length ? `<section class="section wrap">${sectionHead(esc(catName(p.cat)), 'Você também pode <em>gostar</em>', ['Ver todos', `#/loja/${p.cat}`])}<div class="grid">${related.map(card).join('')}</div></section>` : ''}`;

    return {
      html,
      mount() {
        const root = $('.pdp');
        const qtyIn = $('.qty input', root);
        root.addEventListener('click', (e) => {
          const ob = e.target.closest('[data-opt]');
          if (ob) {
            opt = ob.dataset.opt;
            $$('[data-opt]', root).forEach((b) => b.classList.toggle('is-on', b === ob));
            $('.opt-name', root).textContent = opt;
          }
          const q = e.target.closest('[data-q]');
          if (q) qtyIn.value = Math.max(1, Math.min(p.stock || 1, (+qtyIn.value || 1) + +q.dataset.q));
          const buy = e.target.closest('[data-buy]');
          if (buy) {
            if (p.options?.length > 1 && !opt) {
              toast(`Escolha o ${label.toLowerCase()}`, 'err');
              const sz = $('.sizes', root);
              sz.scrollIntoView({ behavior: 'smooth', block: 'center' });
              sz.classList.add('shake');
              setTimeout(() => sz.classList.remove('shake'), 500);
              return;
            }
            const r = S.addToCart(p.id, opt, Math.max(1, +qtyIn.value || 1));
            if (!r.ok) return toast(r.msg, 'err');
            if (buy.dataset.buy === 'now') { location.hash = '#/finalizar'; return; }
            flyToCart(buy);
            toast('Na sacola!');
          }
        });
        qtyIn.addEventListener('change', () => { qtyIn.value = Math.max(1, Math.min(p.stock || 1, +qtyIn.value || 1)); });
        // barra de compra fixa (celular) aparece quando o botão principal sai da tela
        const bar = $('#buybar');
        new IntersectionObserver(([en]) => {
          const show = !en.isIntersecting && en.boundingClientRect.top < 0;
          bar.classList.toggle('is-on', show);
          bar.setAttribute('aria-hidden', String(!show));
        }).observe($('.pdp__buy', root));
        // entrega
        const cepIn = $('#shipCep');
        cepIn.addEventListener('input', () => { cepIn.value = maskCep(cepIn.value); });
        $('#shipBtn').addEventListener('click', () => {
          const s = st.settings;
          const ok = S.isLocalCep(cepIn.value);
          const sub = p.price * (+qtyIn.value || 1);
          const free = sub >= Number(s.freeShippingOver);
          $('#shipOut').innerHTML = `
            <p>${icon('store')}<span><b>Retirada combinada:</b> grátis</span></p>
            ${S.onlyDigits(cepIn.value).length !== 8 ? '<p class="err">Digite um CEP válido.</p>'
              : ok ? `<p>${icon('truck')}<span><b>Entrega em Feira de Santana:</b> ${free ? 'grátis' : brl(s.localDelivery)} · combinamos o melhor dia</span></p>`
              : `<p>${icon('truck')}<span><b>Envio para sua cidade:</b> valor e prazo combinados pelo WhatsApp depois do pedido.</span></p>`}`;
        });
      },
    };
  }

  /* =========================================================
     SACOLA (drawer)
     ========================================================= */
  function renderCart() {
    const lines = S.cartLines();
    const t = S.totals();
    const s = st.settings;
    const missing = Math.max(0, Number(s.freeShippingOver) - (t.subtotal - t.discount));
    const pct = Math.min(100, ((t.subtotal - t.discount) / Number(s.freeShippingOver || 1)) * 100);
    $('#cart').innerHTML = `
      <div class="drawer__head"><h3>Sua sacola <small>${S.cartCount()} ${S.cartCount() === 1 ? 'item' : 'itens'}</small></h3>
        <button class="iconbtn" data-action="close-all" aria-label="Fechar sacola">${icon('x')}</button></div>
      ${lines.length ? `
        <div class="freebar"><p>${missing > 0 ? `Faltam <b>${brl(missing)}</b> para entrega <b>grátis</b> em Feira` : `${icon('check')} Você ganhou <b>entrega grátis</b> em Feira!`}</p><div class="freebar__track"><i style="width:${pct}%"></i></div></div>
        <ul class="cart-lines">
          ${lines.map((l) => `<li class="cline">
            <a class="cline__art" href="#/produto/${l.id}" style="--bg:${A.bg(l.product.art)}">${A.media(l.product)}</a>
            <div class="cline__info">
              <a href="#/produto/${l.id}" class="cline__name">${esc(l.product.name)}</a>
              ${l.variant ? `<small>${esc(l.product.opt_label || 'Aroma')}: ${esc(l.variant)}</small>` : ''}
              <div class="cline__row">
                <div class="qty qty--sm"><button data-action="qty" data-key="${esc(l.key)}" data-d="-1" aria-label="Diminuir">${icon('minus')}</button><span>${l.qty}</span><button data-action="qty" data-key="${esc(l.key)}" data-d="1" aria-label="Aumentar">${icon('plus')}</button></div>
                <b>${brl(l.product.price * l.qty)}</b>
              </div>
            </div>
            <button class="iconbtn iconbtn--sm" data-action="remove" data-key="${esc(l.key)}" aria-label="Remover">${icon('trash')}</button>
          </li>`).join('')}
        </ul>
        <div class="drawer__foot">
          <form class="coupon" data-coupon><input class="input" placeholder="Cupom de desconto" value="${esc(st.coupon?.code || '')}" aria-label="Cupom"/><button class="btn btn--line btn--sm">Aplicar</button></form>
          <div class="sum"><span>Subtotal</span><span>${brl(t.subtotal)}</span></div>
          ${t.discount ? `<div class="sum sum--green"><span>Cupom ${esc(st.coupon.code)}</span><span>-${brl(t.discount)}</span></div>` : ''}
          <div class="sum sum--total"><span>Total</span><span>${brl(t.subtotal - t.discount)}</span></div>
          ${Number(s.pixDiscount) ? `<p class="sum__pix">${icon('pix')} ou <b>${brl(S.pixPrice(t.subtotal - t.discount))}</b> no Pix</p>` : ''}
          <a class="btn btn--dark btn--block" href="#/finalizar" data-action="close-all">Finalizar compra ${icon('arrow')}</a>
          <button class="btn btn--text btn--block" data-action="close-all">Continuar comprando</button>
        </div>` : `
        <div class="empty empty--cart">
          ${emptyArt('box')}
          <h3>Sua sacola está vazia</h3><p>Que tal um sabonete novo ou uma vela para deixar a casa cheirosa?</p>
          <a class="btn btn--dark" href="#/loja" data-action="close-all">Ir para a loja</a>
        </div>`}`;
  }
  function openCart() { renderCart(); document.body.classList.add('cart-open', 'lock'); $('#cart').setAttribute('aria-hidden', 'false'); }
  function closeAll() {
    document.body.classList.remove('cart-open', 'search-open', 'filters-open');
    $('#cart').setAttribute('aria-hidden', 'true');
    $('#search').setAttribute('aria-hidden', 'true');
    closeModal();
    document.body.classList.remove('lock');
  }

  /* =========================================================
     CHECKOUT
     ========================================================= */
  const maskCep = (v) => S.onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
  const maskPhone = (v) => {
    const d = S.onlyDigits(v).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  };

  function viewCheckout() {
    const lines = S.cartLines();
    if (!lines.length) {
      return { html: `<section class="wrap narrow"><div class="empty">${emptyArt('box')}<h3>Sua sacola está vazia</h3><p>Adicione produtos para finalizar a compra.</p><a class="btn btn--dark" href="#/loja">Ir para a loja</a></div></section>` };
    }
    const s = st.settings;
    const saved = S.LS.get('customer', {});
    const f = { method: saved.method || 'retirada', payment: 'pix', cep: saved.cep || '', gift: false };

    const html = `
      <section class="pagehead pagehead--slim"><div class="wrap"><nav class="crumbs"><a href="#/">Início</a> / <span>Finalizar compra</span></nav><h1 class="h1">Finalizar compra</h1></div></section>
      <form class="wrap checkout" id="checkout" novalidate>
        <div class="checkout__main">
          <fieldset class="box">
            <legend><span class="step">1</span> Seus dados</legend>
            <div class="row2">
              <label class="field"><span>Nome completo</span><input class="input" name="name" required autocomplete="name" value="${esc(saved.name || '')}"/></label>
              <label class="field"><span>WhatsApp</span><input class="input" name="phone" required inputmode="tel" autocomplete="tel" placeholder="(75) 9 9999-9999" value="${esc(saved.phone ? maskPhone(saved.phone) : '')}"/></label>
            </div>
            <label class="field"><span>E-mail <small>(opcional)</small></span><input class="input" name="email" type="email" autocomplete="email" value="${esc(saved.email || '')}"/></label>
          </fieldset>

          <fieldset class="box">
            <legend><span class="step">2</span> Entrega</legend>
            <div class="radios">
              ${[
                ['retirada', 'store', 'Retirada combinada', 'Grátis · combinamos dia e local pelo WhatsApp'],
                ['local', 'truck', 'Entrega em Feira de Santana', `${brl(s.localDelivery)} · grátis acima de ${brl(s.freeShippingOver)}`],
                ['envio', 'box', 'Envio para outra cidade', 'Correios ou transportadora · valor combinado no WhatsApp'],
              ].map(([v, i, t, d]) => `<label class="radio"><input type="radio" name="method" value="${v}" ${f.method === v ? 'checked' : ''}/><span class="radio__box">${icon(i)}<span><b>${t}</b><small>${d}</small></span></span></label>`).join('')}
            </div>
            <div class="address" ${f.method === 'retirada' ? 'hidden' : ''}>
              <div class="row3">
                <label class="field"><span>CEP</span><input class="input" name="cep" inputmode="numeric" maxlength="9" value="${esc(maskCep(saved.cep || ''))}"/><small class="hint" id="cepHint"></small></label>
                <label class="field field--span2"><span>Rua</span><input class="input" name="street" value="${esc(saved.street || '')}"/></label>
              </div>
              <div class="row3">
                <label class="field"><span>Número</span><input class="input" name="number" value="${esc(saved.number || '')}"/></label>
                <label class="field field--span2"><span>Complemento</span><input class="input" name="complement" value="${esc(saved.complement || '')}"/></label>
              </div>
              <div class="row3">
                <label class="field"><span>Bairro</span><input class="input" name="district" value="${esc(saved.district || '')}"/></label>
                <label class="field"><span>Cidade</span><input class="input" name="city" value="${esc(saved.city || 'Feira de Santana')}"/></label>
                <label class="field"><span>UF</span><input class="input" name="uf" maxlength="2" value="${esc(saved.uf || 'BA')}"/></label>
              </div>
            </div>
          </fieldset>

          <fieldset class="box">
            <legend><span class="step">3</span> É para presente?</legend>
            <label class="radio"><input type="checkbox" name="gift"/><span class="radio__box">${icon('gift')}<span><b>Sim, embrulha pra presente ${Number(s.giftWrap) ? `<em class="pill pill--sand">+ ${brl(s.giftWrap)}</em>` : ''}</b><small>Laço, tag e cartão escrito à mão com a sua mensagem</small></span></span></label>
            <div class="giftfields" hidden>
              <label class="field"><span>Para quem? <small>(opcional)</small></span><input class="input" name="giftTo" maxlength="80" placeholder="Ex.: Mãe, Ana, Equipe do RH"/></label>
              <label class="field"><span>Mensagem do cartão <small id="giftCount">0/240</small></span><textarea class="input" name="giftMsg" rows="3" maxlength="240" placeholder="Escreva aqui o recado que vai no cartão"></textarea></label>
            </div>
          </fieldset>

          <fieldset class="box">
            <legend><span class="step">4</span> Pagamento</legend>
            <div class="radios">
              <label class="radio"><input type="radio" name="payment" value="pix" checked/><span class="radio__box">${icon('pix')}<span><b>Pix ${Number(s.pixDiscount) ? `<em class="pill">-${s.pixDiscount}%</em>` : ''}</b><small>QR Code e copia-e-cola na próxima tela</small></span></span></label>
              <label class="radio"><input type="radio" name="payment" value="cartao"/><span class="radio__box">${icon('card')}<span><b>Cartão de crédito</b><small>${S.installment(999).n > 1 ? `Até ${S.installment(999).n}x sem juros · ` : ''}link de pagamento pelo WhatsApp</small></span></span></label>
              <label class="radio"><input type="radio" name="payment" value="entrega"/><span class="radio__box">${icon('store')}<span><b>Na entrega ou retirada</b><small>Dinheiro, Pix ou cartão na hora de receber</small></span></span></label>
            </div>
            <label class="field installments" hidden><span>Parcelas</span><select class="select" name="installments"></select></label>
            <label class="field"><span>Observações <small>(opcional)</small></span><textarea class="input" name="notes" rows="2" placeholder="Ex.: melhor horário para entrega, ponto de referência…"></textarea></label>
          </fieldset>
        </div>

        <aside class="checkout__side">
          <div class="box box--sticky">
            <h3 class="box__title">Resumo do pedido</h3>
            <ul class="mini-lines">${lines.map((l) => `<li><span class="mini-lines__art" style="--bg:${A.bg(l.product.art)}">${A.media(l.product)}</span><span class="mini-lines__name">${l.qty}x ${esc(l.product.name)}${l.variant ? `<small>${esc(l.variant)}</small>` : ''}</span><b>${brl(l.product.price * l.qty)}</b></li>`).join('')}</ul>
            <div class="coupon coupon--inline" data-coupon-inline><input class="input" placeholder="Cupom" value="${esc(st.coupon?.code || '')}" aria-label="Cupom"/><button type="button" class="btn btn--line btn--sm">Aplicar</button></div>
            <div id="sumBox"></div>
            <button class="btn btn--dark btn--block btn--lg" type="submit" id="placeBtn">Finalizar pedido ${icon('arrow')}</button>
            <p class="secure">${icon('shield')}<span>Conexão protegida. Seus dados ficam só com a Flora Alma e o pedido é confirmado pelo WhatsApp. Ao finalizar, você concorda com a nossa <a href="#/privacidade">política de privacidade</a>.</span></p>
          </div>
        </aside>
      </form>
      <div class="paybar" id="paybar" aria-hidden="true">
        <div class="paybar__info"><small>Total do pedido</small><b id="payTotal"></b></div>
        <button class="btn btn--sand btn--sm" type="submit" form="checkout" tabindex="-1">Finalizar ${icon('arrow')}</button>
      </div>`;

    return {
      html,
      mount() {
        const form = $('#checkout');
        let busy = false;
        watchBar($('#paybar'), $('#placeBtn'));
        const val = (n) => form.elements[n]?.value?.trim() || '';
        const paintSum = () => {
          f.method = form.elements.method.value;
          f.payment = form.elements.payment.value;
          f.cep = val('cep');
          f.gift = form.elements.gift.checked;
          const t = S.totals({ payment: f.payment, method: f.method, cep: f.cep, gift: f.gift });
          $('.address', form).hidden = f.method === 'retirada';
          $('.giftfields', form).hidden = !f.gift;
          const inst = $('.installments', form);
          inst.hidden = f.payment !== 'cartao';
          const sel = form.elements.installments;
          if (f.payment === 'cartao') {
            const cur = +sel.value || 1;
            const n = S.installment(t.total).n;
            sel.innerHTML = Array.from({ length: n }, (_, i) => i + 1)
              .map((k) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${k}x de ${brl(t.total / k)} sem juros</option>`).join('');
          }
          const localWarn = f.method === 'local' && S.onlyDigits(f.cep).length === 8 && !t.localOk;
          $('#sumBox').innerHTML = `
            <div class="sum"><span>Subtotal</span><span>${brl(t.subtotal)}</span></div>
            ${t.discount ? `<div class="sum sum--green"><span>Cupom ${esc(st.coupon.code)}</span><span>-${brl(t.discount)}</span></div>` : ''}
            ${t.pixDiscount ? `<div class="sum sum--green"><span>Desconto Pix</span><span>-${brl(t.pixDiscount)}</span></div>` : ''}
            ${t.giftFee ? `<div class="sum"><span>Embalagem para presente</span><span>${brl(t.giftFee)}</span></div>` : ''}
            <div class="sum"><span>Entrega</span><span>${t.shippingLabel}</span></div>
            ${localWarn ? '<p class="err">Esse CEP não é de Feira de Santana. Escolha “Envio para outra cidade”.</p>' : ''}
            <div class="sum sum--total"><span>Total</span><span>${brl(t.total)}</span></div>`;
          $('#payTotal').textContent = brl(t.total);
        };
        form.addEventListener('change', paintSum);
        form.elements.giftMsg.addEventListener('input', (e) => { $('#giftCount').textContent = `${e.target.value.length}/240`; });
        form.elements.phone.addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });
        form.elements.cep.addEventListener('input', async (e) => {
          e.target.value = maskCep(e.target.value);
          const d = S.onlyDigits(e.target.value);
          paintSum();
          if (d.length !== 8) return;
          $('#cepHint').textContent = 'Buscando endereço…';
          try {
            const r = await fetch(`https://viacep.com.br/ws/${d}/json/`).then((x) => x.json());
            if (r.erro) throw 0;
            form.elements.street.value = r.logradouro || form.elements.street.value;
            form.elements.district.value = r.bairro || '';
            form.elements.city.value = r.localidade || '';
            form.elements.uf.value = r.uf || '';
            $('#cepHint').textContent = '';
            form.elements.number.focus();
          } catch { $('#cepHint').textContent = 'CEP não encontrado. Preencha à mão.'; }
        });
        const applyC = async (input) => {
          const r = await S.applyCoupon(input.value);
          toast(r.msg || (r.ok ? 'Cupom removido' : 'Cupom inválido'), r.ok ? 'ok' : 'err');
          paintSum();
        };
        $('[data-coupon-inline] button', form).addEventListener('click', () => applyC($('[data-coupon-inline] input', form)));

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (busy) return;
          const errs = [];
          if (val('name').length < 3) errs.push('name');
          if (S.onlyDigits(val('phone')).length < 10) errs.push('phone');
          if (f.method !== 'retirada') ['cep', 'street', 'number', 'district', 'city'].forEach((n) => { if (!val(n)) errs.push(n); });
          if (f.method === 'local' && !S.isLocalCep(val('cep'))) errs.push('cep');
          $$('.input', form).forEach((i) => i.classList.toggle('is-err', errs.includes(i.name)));
          if (errs.length) { toast('Confira os campos destacados', 'err'); form.querySelector('.is-err')?.focus(); return; }

          const customer = { name: val('name'), phone: S.onlyDigits(val('phone')), email: val('email') };
          const delivery = { method: f.method, cep: S.onlyDigits(val('cep')), street: val('street'), number: val('number'), complement: val('complement'), district: val('district'), city: val('city'), uf: val('uf').toUpperCase() };
          const gift = f.gift ? { wrap: true, to: val('giftTo'), message: val('giftMsg') } : { wrap: false };
          S.LS.set('customer', { ...customer, ...delivery });
          const btn = $('#placeBtn');
          busy = true;
          btn.disabled = true;
          btn.innerHTML = '<span class="spinner"></span> Enviando pedido…';
          try {
            const order = await S.placeOrder({ customer, delivery, gift, payment: f.payment, installments: +form.elements.installments.value || 1, notes: val('notes') });
            location.hash = `#/pedido/${order.id}`;
          } catch (err) {
            toast(err.message || 'Não foi possível concluir o pedido', 'err');
            busy = false;
            btn.disabled = false;
            btn.innerHTML = `Finalizar pedido ${icon('arrow')}`;
          }
        });
        paintSum();
      },
    };
  }

  /* =========================================================
     PEDIDO CONCLUÍDO
     ========================================================= */
  function viewOrderDone(id) {
    const o = st.myOrders.find((x) => x.id === id);
    if (!o) return viewNotFound('Pedido não encontrado neste aparelho.');
    const s = st.settings;
    const wa = S.waLink(S.orderMessage(o));
    const pix = o.payment === 'pix' ? S.pixPayload(Number(o.total), o.id) : '';
    const g = o.gift || {};
    const html = `
      <section class="wrap narrow done">
        <div class="done__check">${icon('check')}</div>
        <span class="kicker">Pedido ${esc(o.id)}</span>
        <h1 class="h1">Pedido recebido, ${esc(o.customer.name.split(' ')[0])}!</h1>
        ${o.offline ? '<p class="lead">Estamos sem conexão com o sistema agora.</p>' : ''}

        ${o.payment === 'pix' ? `
        <div class="box pixbox">
          <h3 class="box__title">${icon('pix')} Pague com Pix · ${brl(o.total)}</h3>
          ${pix ? `<div class="pixbox__grid"><div id="qr" class="qr"></div>
            <div><p class="muted small">Abra o app do seu banco, escolha Pix copia e cola e cole o código:</p>
            <textarea class="input mono" rows="4" readonly id="pixCode">${esc(pix)}</textarea>
            <button class="btn btn--dark btn--block" data-copy="#pixCode" data-msg="Código Pix copiado!">${icon('copy')} Copiar código Pix</button></div></div>
            <p class="pixbox__safe">${icon('shield')}<span>Antes de confirmar, veja no app do banco se o recebedor é <b>${esc(s.pixName || s.storeName)}</b>. A Flora Alma nunca pede pagamento para outra pessoa.</span></p>`
            : '<p>A chave Pix vai pelo WhatsApp junto com a confirmação do pedido.</p>'}
        </div>` : o.payment === 'cartao' ? `<div class="box"><p>${icon('card')} Você vai receber o <b>link de pagamento</b>${o.installments > 1 ? ` em ${o.installments}x` : ''} pelo WhatsApp.</p></div>`
          : `<div class="box"><p>${icon('store')} Pague na entrega ou na retirada: dinheiro, Pix ou cartão.</p></div>`}

        ${g.wrap ? `<div class="box giftbox">${icon('gift')}<div><b>Vai embrulhado para presente${g.to ? ` para ${esc(g.to)}` : ''}</b>${g.message ? `<p class="giftbox__msg">“${esc(g.message)}”</p>` : '<p class="muted small">Sem mensagem no cartão.</p>'}</div></div>` : ''}

        <div class="box">
          <h3 class="box__title">Resumo</h3>
          <ul class="mini-lines">${o.items.map((i) => `<li><span class="mini-lines__name">${i.qty}x ${esc(i.name)}${i.variant ? `<small>${esc(i.variant)}</small>` : ''}</span><b>${brl(i.price * i.qty)}</b></li>`).join('')}</ul>
          <div class="sum"><span>Subtotal</span><span>${brl(o.subtotal)}</span></div>
          ${Number(o.discount) ? `<div class="sum sum--green"><span>Cupom</span><span>-${brl(o.discount)}</span></div>` : ''}
          ${Number(o.pix_discount) ? `<div class="sum sum--green"><span>Desconto Pix</span><span>-${brl(o.pix_discount)}</span></div>` : ''}
          ${Number(o.gift_fee) ? `<div class="sum"><span>Embalagem para presente</span><span>${brl(o.gift_fee)}</span></div>` : ''}
          <div class="sum"><span>${S.SHIP[o.delivery.method]}</span><span>${Number(o.shipping) ? brl(o.shipping) : o.delivery.method === 'envio' ? 'A combinar' : 'Grátis'}</span></div>
          <div class="sum sum--total"><span>Total</span><span>${brl(o.total)}</span></div>
        </div>
        <div class="done__links">
          <a class="btn btn--wa" target="_blank" rel="noopener" href="${wa}">${icon('wa')} Enviar pedido no WhatsApp</a>
          <a class="btn btn--line" href="#/pedidos">Meus pedidos</a>
          <a class="btn btn--dark" href="#/loja">Continuar comprando</a>
        </div>
        ${!s.whatsapp ? '<p class="muted small">Dica: o WhatsApp da loja ainda não foi configurado no painel, então o WhatsApp vai pedir para escolher o contato.</p>' : ''}
      </section>`;
    return {
      html,
      async mount() {
        if (pix) {
          try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js', 'sha384-3zSEDfvllQohrq0PHL1fOXJuC/jSOO34H46t6UQfobFOmxE5BpjjaIJY5F2/bMnU');
            new window.QRCode($('#qr'), { text: pix, width: 200, height: 200, correctLevel: window.QRCode.CorrectLevel.M });
          } catch { $('#qr').innerHTML = '<p class="muted small">Não foi possível gerar o QR. Use o copia e cola.</p>'; }
        }
      },
    };
  }

  /* =========================================================
     LEMBRANCINHAS (orçamento para eventos)
     ========================================================= */
  const EVENTS = [['Casamento', 'heart'], ['Maternidade', 'sparkle'], ['Chá de bebê', 'drop'], ['Aniversário', 'gift'], ['Batizado', 'leaf'], ['Formatura', 'sun'], ['Corporativo', 'users'], ['Outro', 'flame']];
  const AROMA_OPTS = ['Lavanda', 'Flor de algodão', 'Baunilha & canela', 'Alecrim & hortelã', 'Rosas', 'Capim-limão', 'Quero ajuda para escolher'];
  function viewLembrancinhas() {
    const s = st.settings;
    const lead = Number(s.leadDays) || 15;
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const min = new Date(); min.setDate(min.getDate() + lead);
    const saved = S.LS.get('customer', {});
    const sel = { event: '', date: '', qty: Math.max(50, Number(s.minQty) || 20), items: [] };
    const minFor = () => Math.max(Number(s.minQty) || 1, ...st.souvenirs.filter((v) => sel.items.includes(v.id)).map((v) => Number(v.min_qty) || 1));

    const html = `
      <section class="lbhero">
        <div class="hero__dots" aria-hidden="true"></div>
        <div class="wrap lbhero__grid">
          <div>
            <span class="kicker kicker--sand">${icon('gift')} Lembrancinhas personalizadas</span>
            <h1 class="h1 h1--light">Lembranças que <em>perfumam</em> a memória.</h1>
            <p class="lead lead--light">Mimos artesanais com o nome, as cores e o aroma do seu evento. Conte sobre a festa, escolha os itens e receba o orçamento no WhatsApp.</p>
            <ol class="lbhero__steps"><li><b>1</b> Conte sobre o evento</li><li><b>2</b> Escolha os mimos</li><li><b>3</b> Receba o orçamento</li></ol>
          </div>
          <div class="lbhero__art" aria-hidden="true">
            <div class="lbhero__a">${A.render({ kind: 'box', color: '#fbf7f0', accent: '#d8b48c' })}</div>
            <div class="lbhero__b">${A.render({ kind: 'tin', color: '#cfc6bb', wax: '#f4ead8', accent: '#d8b48c', label: 'OBRIGADO' })}</div>
            <div class="lbhero__c">${A.render({ kind: 'soap', color: '#f3d9d3', accent: '#b0574f', deco: 'petals' })}</div>
          </div>
        </div>
      </section>
      <section class="wrap lemb" id="lemb">
        <div class="lemb__main">
          <div class="box">
            <h3 class="box__title"><span class="step">1</span> Qual é o evento?</h3>
            <div class="events">${EVENTS.map(([e, i]) => `<button type="button" class="event" data-event="${e}">${icon(i)}<span>${e}</span></button>`).join('')}</div>
            <div class="row2">
              <label class="field"><span>Data do evento <small>(a partir de ${min.toLocaleDateString('pt-BR')})</small></span><input class="input" type="date" name="date" min="${iso(min)}" id="lbDate"/></label>
              <label class="field"><span>Aroma preferido</span><select class="select select--full" id="lbAroma"><option value="">Pode ser surpresa</option>${AROMA_OPTS.map((a) => `<option>${a}</option>`).join('')}</select></label>
            </div>
          </div>
          <div class="box">
            <h3 class="box__title"><span class="step">2</span> Escolha os mimos</h3>
            <div class="svc-grid">
              ${st.souvenirs.map((v) => `<label class="svc"><input type="checkbox" value="${esc(v.id)}"/><span class="svc__box">
                <span class="svc__top"><b>${esc(v.name)}</b><span class="svc__check">${icon('check')}</span></span>
                <small>${esc(v.description)}</small>
                <span class="svc__foot"><b>${brl(v.price)}</b> <em>por unidade</em> <span class="muted">· mín. ${v.min_qty} un.</span></span>
              </span></label>`).join('')}
            </div>
            <div class="qtybox">
              <div><b>Quantas unidades de cada?</b><small id="lbMin"></small></div>
              <div class="qty"><button type="button" data-lq="-10" aria-label="Menos 10">${icon('minus')}</button><input id="lbQty" value="${sel.qty}" inputmode="numeric" aria-label="Quantidade"/><button type="button" data-lq="10" aria-label="Mais 10">${icon('plus')}</button></div>
            </div>
            <input type="range" class="range" min="10" max="300" step="5" value="${sel.qty}" id="lbRange" aria-label="Quantidade"/>
          </div>
          <div class="box">
            <h3 class="box__title"><span class="step">3</span> Personalização e contato</h3>
            <form id="lbForm" novalidate>
              <label class="field"><span>Como quer personalizar? <small>(nomes, data, cores, tema)</small></span><textarea class="input" name="custom" rows="2" maxlength="300" placeholder="Ex.: Ana & Lucas · 12.04 · tons de verde-oliva e creme"></textarea></label>
              <div class="row2">
                <label class="field"><span>Seu nome</span><input class="input" name="name" autocomplete="name" value="${esc(saved.name || '')}"/></label>
                <label class="field"><span>WhatsApp</span><input class="input" name="phone" inputmode="tel" placeholder="(75) 9 9999-9999" value="${esc(saved.phone ? maskPhone(saved.phone) : '')}"/></label>
              </div>
              <label class="field"><span>Mais alguma coisa? <small>(opcional)</small></span><textarea class="input" name="notes" rows="2" maxlength="500" placeholder="Ex.: preciso de embalagem individual, entrega no local da festa…"></textarea></label>
            </form>
          </div>
        </div>
        <aside class="lemb__side">
          <div class="box box--sticky box--dark" id="lbSum"></div>
        </aside>
      </section>
      <div class="paybar" id="lbBar" aria-hidden="true">
        <div class="paybar__info"><small>Estimativa</small><b id="lbBarTotal">—</b></div>
        <button class="btn btn--sand btn--sm" type="button" id="lbBarBtn" tabindex="-1">Pedir orçamento ${icon('arrow')}</button>
      </div>`;

    return {
      html,
      mount() {
        const root = $('#lemb');
        let busy = false;
        watchBar($('#lbBar'), $('#lbSum'));
        $('#lbBarBtn').addEventListener('click', () => submit());
        const qtyIn = $('#lbQty');
        const range = $('#lbRange');
        const form = $('#lbForm');
        const setQty = (n) => {
          sel.qty = Math.max(1, Math.min(2000, Math.round(+n || 0)));
          qtyIn.value = sel.qty;
          range.value = Math.min(300, sel.qty);
          range.style.setProperty('--p', ((Math.min(300, sel.qty) - 10) / 290) * 100 + '%');
          paintSum();
        };
        const paintSum = () => {
          const items = st.souvenirs.filter((v) => sel.items.includes(v.id));
          const unit = items.reduce((t, v) => t + Number(v.price), 0);
          const mq = minFor();
          $('#lbMin').textContent = items.length ? `mínimo de ${mq} unidades para os itens escolhidos` : `mínimo de ${mq} unidades`;
          $('#lbSum').innerHTML = `
            <h3 class="box__title">Seu orçamento</h3>
            <ul class="booksum">
              <li>${icon('sparkle')}<span>${sel.event ? esc(sel.event) : '<em>Escolha o evento</em>'}</span></li>
              <li>${icon('cal')}<span>${sel.date ? new Date(sel.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) : '<em>Escolha a data</em>'}</span></li>
              <li>${icon('gift')}<span>${items.length ? items.map((v) => esc(v.name)).join(', ') : '<em>Nenhum mimo escolhido</em>'}</span></li>
              <li>${icon('users')}<span><b>${sel.qty}</b> unidades de cada${sel.qty < mq ? ` <em class="warn">· mínimo ${mq}</em>` : ''}</span></li>
            </ul>
            <div class="sum sum--total sum--light"><span>Estimativa</span><span class="sum__val">${unit ? `${brl(unit * sel.qty)}<small>${brl(unit)} por convidado</small>` : '—'}</span></div>
            <p class="small muted-light">O valor final vem no orçamento, conforme a personalização e a embalagem escolhidas. Ao enviar, você concorda com a nossa <a href="#/privacidade">política de privacidade</a>.</p>
            <button class="btn btn--sand btn--block btn--lg" id="lbBtn">Pedir orçamento ${icon('arrow')}</button>`;
          $('#lbBtn').addEventListener('click', () => submit());
          $('#lbBarTotal').textContent = unit ? brl(unit * sel.qty) : '—';
        };
        root.addEventListener('click', (e) => {
          const ev = e.target.closest('[data-event]');
          if (ev) { sel.event = ev.dataset.event; $$('[data-event]', root).forEach((x) => x.classList.toggle('is-on', x === ev)); paintSum(); }
          const lq = e.target.closest('[data-lq]');
          if (lq) setQty(sel.qty + +lq.dataset.lq);
        });
        root.addEventListener('change', (e) => {
          if (e.target.closest('.svc input')) { sel.items = $$('.svc input:checked', root).map((x) => x.value); paintSum(); }
          if (e.target.id === 'lbDate') { sel.date = e.target.value; paintSum(); }
        });
        qtyIn.addEventListener('change', () => setQty(qtyIn.value));
        range.addEventListener('input', () => setQty(range.value));
        form.elements.phone.addEventListener('input', (e) => { e.target.value = maskPhone(e.target.value); });

        async function submit() {
          if (busy) return;
          const name = form.elements.name.value.trim();
          const phone = S.onlyDigits(form.elements.phone.value);
          if (!sel.event) return toast('Escolha o tipo de evento', 'err');
          if (!sel.date || sel.date < iso(min)) { $('#lbDate').classList.add('is-err'); return toast(`Escolha uma data a partir de ${min.toLocaleDateString('pt-BR')}`, 'err'); }
          $('#lbDate').classList.remove('is-err');
          if (!sel.items.length) return toast('Escolha pelo menos um mimo', 'err');
          if (sel.qty < minFor()) return toast(`A quantidade mínima é ${minFor()} unidades`, 'err');
          if (name.length < 2 || phone.length < 10) {
            form.elements.name.classList.toggle('is-err', name.length < 2);
            form.elements.phone.classList.toggle('is-err', phone.length < 10);
            return toast('Informe seu nome e WhatsApp', 'err');
          }
          const btn = $('#lbBtn');
          busy = true;
          btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enviando…';
          try {
            const r = await S.requestSouvenirs({
              event: sel.event, event_date: sel.date, qty: sel.qty, items: sel.items, aroma: $('#lbAroma').value,
              custom: form.elements.custom.value.trim(), name, phone, notes: form.elements.notes.value.trim(),
            });
            S.LS.set('customer', { ...S.LS.get('customer', {}), name, phone });
            const wa = S.waLink(S.requestMessage(r));
            $('.lemb__main').innerHTML = `<div class="box done done--inline">
              <div class="done__check">${icon('check')}</div>
              <span class="kicker">Pedido de orçamento ${esc(r.id)}</span>
              <h2 class="h2">Recebemos o seu pedido!</h2>
              <p class="lead">${esc(r.event)} · ${new Date(r.event_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })} · ${r.qty} unidades. Envie pelo WhatsApp para a gente montar o seu orçamento:</p>
              <a class="btn btn--wa btn--lg" target="_blank" rel="noopener" href="${wa}">${icon('wa')} Enviar no WhatsApp</a>
            </div>`;
            $('#lbSum').innerHTML = `<h3 class="box__title">Tudo certo ✿</h3><p class="muted-light">Respondemos com o orçamento, as opções de embalagem e o prazo de produção. Qualquer dúvida, é só chamar.</p>`;
            $('#lbBar').remove();
            window.scrollTo({ top: $('.lemb').offsetTop - 90, behavior: 'smooth' });
          } catch (err) {
            toast(err.message, 'err');
            busy = false;
            btn.disabled = false; btn.innerHTML = `Pedir orçamento ${icon('arrow')}`;
          }
        }
        setQty(sel.qty);
      },
    };
  }

  /* =========================================================
     FAVORITOS / MEUS PEDIDOS / 404
     ========================================================= */
  function viewFavs() {
    const list = st.wish.map(S.product).filter(Boolean);
    return {
      html: `<section class="pagehead"><div class="wrap"><nav class="crumbs"><a href="#/">Início</a> / <span>Favoritos</span></nav><h1 class="h1">Seus favoritos</h1></div></section>
      <section class="wrap section section--tight">${list.length ? `<div class="grid">${list.map(card).join('')}</div>` : `<div class="empty">${emptyArt('sachet')}<h3>Nenhum favorito ainda</h3><p>Toque no coração dos produtos para guardar aqui.</p><a class="btn btn--dark" href="#/loja">Explorar a loja</a></div>`}</section>`,
    };
  }

  const STATUS = { novo: 'Recebido', pago: 'Pago', preparando: 'Preparando', enviado: 'A caminho / pronto p/ retirada', entregue: 'Entregue', cancelado: 'Cancelado' };
  function viewMyOrders() {
    const list = st.myOrders;
    return {
      html: `<section class="pagehead"><div class="wrap"><nav class="crumbs"><a href="#/">Início</a> / <span>Meus pedidos</span></nav><h1 class="h1">Meus pedidos</h1></div></section>
      <section class="wrap narrow section section--tight">
        ${list.length ? list.map((o) => `<a class="order" href="#/pedido/${esc(o.id)}">
          <div><b>${esc(o.id)}</b><small>${new Date(o.created_at).toLocaleDateString('pt-BR')} · ${o.items.reduce((t, i) => t + (Number(i.qty) || 0), 0)} itens</small></div>
          <span class="status status--${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span>
          <b>${brl(o.total)}</b>
        </a>`).join('') : `<div class="empty">${emptyArt('box')}<h3>Nenhum pedido neste aparelho</h3><p>Os pedidos feitos aqui aparecem nesta lista.</p><a class="btn btn--dark" href="#/loja">Ir para a loja</a></div>`}
        ${st.myRequests.length ? `<h2 class="h3 mt">Orçamentos de lembrancinhas</h2>${st.myRequests.map((r) => `<div class="order"><div><b>${esc(r.id)}</b><small>${esc(r.event)} · ${new Date(r.event_date + 'T12:00:00').toLocaleDateString('pt-BR')} · ${Number(r.qty) || 0} un.</small></div><span class="status">${esc((r.items || []).map((x) => x.name).join(', '))}</span><b>${brl(r.estimate)}</b></div>`).join('')}` : ''}
        <div class="forget">
          <p>${icon('shield')}<span>Seus pedidos, a sacola e os dados de entrega ficam guardados só neste aparelho para agilizar a próxima compra. Usando um computador compartilhado? Apague tudo daqui.</span></p>
          <button class="btn btn--line btn--sm" data-forget>Esquecer meus dados neste aparelho</button>
        </div>
      </section>`,
      mount() {
        S.refreshOrderStatus();
        $('[data-forget]').addEventListener('click', () => {
          if (!confirm('Apagar deste aparelho seus pedidos, sacola, favoritos e dados de entrega? Os pedidos continuam registrados na loja.')) return;
          S.forgetMe();
          toast('Pronto! Seus dados foram apagados deste aparelho.');
          router();
        });
      },
    };
  }

  /* ---------- Política de privacidade (LGPD) ---------- */
  function viewPrivacy() {
    const s = st.settings;
    const sec = (t, body) => `<h2 class="h3">${t}</h2>${body}`;
    return {
      html: `<section class="pagehead"><div class="wrap"><nav class="crumbs"><a href="#/">Início</a> / <span>Privacidade</span></nav><h1 class="h1">Política de privacidade</h1><p class="pagehead__sub">Como cuidamos dos seus dados, do jeito mais simples possível.</p></div></section>
      <section class="wrap narrow section section--tight prose">
        ${sec('Quem somos', `<p>${esc(s.storeName)}, ateliê de sabonetes artesanais e velas aromáticas em ${esc(s.city)}. Fale com a gente pelo WhatsApp${s.whatsapp ? ` ${esc(S.fmtPhone(s.whatsapp))}` : ''} ou pelo Instagram <a href="${igUrl()}" target="_blank" rel="noopener">@${esc(s.instagram)}</a>.</p>`)}
        ${sec('O que coletamos', `<ul><li><b>Na compra:</b> nome, WhatsApp, e-mail (opcional), endereço (só se você escolher entrega), mensagem do cartão de presente e observações.</li><li><b>No orçamento de lembrancinhas:</b> nome, WhatsApp, dados do evento e da personalização.</li></ul>`)}
        ${sec('Para que usamos', '<p>Só para preparar, entregar e confirmar o seu pedido ou orçamento, combinar pagamento e entrega e falar com você sobre ele. <b>Não vendemos nem compartilhamos seus dados</b> com ninguém para propaganda.</p>')}
        ${sec('Pagamentos', '<p>O site <b>não pede nem guarda dados de cartão</b>. No Pix, o pagamento vai direto para a conta da loja (confira o nome do recebedor no app do banco). No cartão, mandamos um link de pagamento pelo WhatsApp.</p>')}
        ${sec('Onde seus dados ficam', '<p>Num banco de dados protegido (Supabase), com conexão criptografada (HTTPS). Só a equipe do ateliê, com login e senha, consegue ver os pedidos. Cada acesso da equipe e cada alteração no painel ficam registrados.</p>')}
        ${sec('Neste aparelho', '<p>O site guarda no seu navegador a sacola, os favoritos, seus pedidos e os dados de entrega, para facilitar a próxima compra. Você pode apagar tudo em <a href="#/pedidos">Meus pedidos</a> → “Esquecer meus dados neste aparelho”. Não usamos cookies de rastreamento nem anúncios.</p>')}
        ${sec('Serviços usados', '<p>Supabase (banco de dados), Google Fonts (letras do site) e ViaCEP (preencher o endereço pelo CEP).</p>')}
        ${sec('Seus direitos (LGPD)', '<p>Você pode pedir a qualquer momento para ver, corrigir ou <b>apagar</b> seus dados. É só chamar a gente no WhatsApp ou no Instagram. Guardamos as informações só pelo tempo necessário para o pedido e para obrigações legais.</p>')}
      </section>`,
    };
  }

  function viewNotFound(msg) {
    return { html: `<section class="wrap narrow"><div class="empty">${emptyArt('jar')}<h3>Esse aroma se perdeu no ar</h3><p>${esc(msg || 'Essa página não existe.')}</p><a class="btn btn--dark" href="#/">Voltar ao início</a></div></section>` };
  }

  /* =========================================================
     Busca global
     ========================================================= */
  function openSearch() {
    document.body.classList.add('search-open', 'lock');
    $('#search').setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#searchInput').focus(), 50);
    paintSearch();
  }
  function paintSearch() {
    const q = norm($('#searchInput').value.trim());
    const list = q ? st.products.filter((p) => norm(`${p.name} ${p.aroma} ${p.sub} ${p.notes} ${(p.options || []).join(' ')}`).includes(q)).slice(0, 6) : st.products.filter((p) => p.featured).slice(0, 6);
    $('#searchResults').innerHTML = `<small class="kicker">${q ? `${list.length} resultado(s)` : 'Mais procurados'}</small>
      ${list.map((p) => `<a class="sres" href="#/produto/${p.id}" data-action="close-all"><span class="sres__art" style="--bg:${A.bg(p.art)}">${A.media(p)}</span><span><b>${esc(p.name)}</b><small>${esc(p.notes || p.sub)} · ${brl(p.price)}</small></span>${icon('arrow')}</a>`).join('')}
      ${q ? `<a class="btn btn--dark btn--block" href="#/loja?q=${encodeURIComponent(q)}" data-action="close-all">Ver todos os resultados</a>` : ''}`;
  }
  $('#searchInput').addEventListener('input', paintSearch);
  $('#searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { location.hash = `#/loja?q=${encodeURIComponent(e.target.value.trim())}`; closeAll(); }
  });

  /* =========================================================
     Layout global: avisos, rodapé, contadores
     ========================================================= */
  function paintChrome() {
    const s = st.settings;
    const items = (s.ticker || []).map((t) => `<span>${esc(t)}</span><i>✿</i>`).join('');
    $('#ticker').innerHTML = `<div>${items}</div><div aria-hidden="true">${items}</div>`;
    $('#footer').innerHTML = `
      <div class="footer__top wrap">
        <div class="footer__brand">
          <img src="assets/logo.jpg" alt="Flora Alma" width="84" height="84"/>
          <p>Sabonetes artesanais e velas aromáticas feitos à mão em Feira de Santana. Autocuidado que abraça.</p>
          <div class="footer__social">
            <a class="iconbtn iconbtn--light" target="_blank" rel="noopener" href="${igUrl()}" aria-label="Instagram">${icon('insta')}</a>
            <a class="iconbtn iconbtn--light" target="_blank" rel="noopener" href="${S.waLink('Olá, Flora Alma!')}" aria-label="WhatsApp">${icon('wa')}</a>
          </div>
        </div>
        <div><h4>Loja</h4>${FA.categories.map((c) => `<a href="#/loja/${c.id}">${c.name}</a>`).join('')}</div>
        <div><h4>Ajuda</h4><a href="#/lembrancinhas">Lembrancinhas</a><a href="#/#aromas">Guia de aromas</a><a href="#/pedidos">Meus pedidos</a><a href="#/favoritos">Favoritos</a><a href="#/privacidade">Privacidade</a></div>
        <div><h4>Contato</h4><p>${icon('pin')} ${esc(s.city)}</p><p>${icon('clock')} ${esc(s.hours)}</p>${s.whatsapp ? `<p>${icon('wa')} ${S.fmtPhone(s.whatsapp)}</p>` : ''}<p>${icon('insta')} @${esc(s.instagram)}</p></div>
      </div>
      <div class="footer__giant" aria-hidden="true">flora alma</div>
      <div class="footer__bottom wrap">
        <span>© ${new Date().getFullYear()} ${esc(s.storeName)} · ${esc(s.city)}</span>
        <span class="footer__pay">${icon('pix')} Pix ${icon('card')} Cartão ${icon('store')} Na entrega</span>
        <a href="#/atelie" class="footer__admin">Área do ateliê</a>
      </div>`;
  }
  function paintCounters() {
    const n = S.cartCount();
    ['#cartCount', '#cartCount2'].forEach((sel) => { const el = $(sel); el.textContent = n; el.hidden = n === 0; });
    $('#wishCount').hidden = st.wish.length === 0;
  }
  S.on(() => {
    paintCounters();
    if (document.body.classList.contains('cart-open')) renderCart();
    $$('.pcard__wish').forEach((b) => b.classList.toggle('is-on', st.wish.includes(b.dataset.id)));
  });

  /* =========================================================
     Ações globais (delegação)
     ========================================================= */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      const t = $(cp.dataset.copy);
      const ok = () => toast(cp.dataset.msg || 'Copiado!');
      navigator.clipboard?.writeText(t.value).then(ok, () => { t.select(); document.execCommand('copy'); ok(); });
    }
    if (e.target === $('#modal')) closeModal();
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'open-cart') openCart();
    else if (a === 'close-all') closeAll();
    else if (a === 'close-modal') closeModal();
    else if (a === 'open-search') openSearch();
    else if (a === 'open-filters') document.body.classList.add('filters-open', 'lock');
    else if (a === 'close-filters') { document.body.classList.remove('filters-open'); unlockIfIdle(); }
    else if (a === 'wish') { e.preventDefault(); const on = S.toggleWish(el.dataset.id); toast(on ? 'Guardado nos favoritos' : 'Removido dos favoritos'); }
    else if (a === 'qty') { const l = st.cart.find((x) => x.key === el.dataset.key); if (l) S.setQty(l.key, l.qty + +el.dataset.d); }
    else if (a === 'remove') S.removeFromCart(el.dataset.key);
    else if (a === 'quick-add') {
      const p = S.product(el.dataset.id);
      if (p.options?.length > 1) { location.hash = `#/produto/${p.id}`; return; }
      const r = S.addToCart(p.id, p.options?.[0] || '', 1);
      if (!r.ok) return toast(r.msg, 'err');
      flyToCart(el);
      toast(`${p.name} na sacola`);
    }
  });
  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-coupon]');
    if (!f) return;
    e.preventDefault();
    const r = await S.applyCoupon($('input', f).value);
    toast(r.msg || (r.ok ? 'Cupom removido' : 'Cupom inválido'), r.ok ? 'ok' : 'err');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });

  // cabeçalho encolhe ao rolar
  window.addEventListener('scroll', () => { document.body.classList.toggle('scrolled', window.scrollY > 40); }, { passive: true });

  /* =========================================================
     Roteador
     ========================================================= */
  const routes = [
    [/^\/?$/, () => viewHome()],
    [/^\/loja(?:\/([\w-]+))?$/, (m, q) => viewShop(m[1], q)],
    [/^\/produto\/([\w-]+)$/, (m) => viewProduct(m[1])],
    [/^\/(?:finalizar|checkout)$/, () => viewCheckout()],
    [/^\/pedido\/([\w-]+)$/, (m) => viewOrderDone(m[1])],
    [/^\/lembrancinhas$/, () => viewLembrancinhas()],
    [/^\/favoritos$/, () => viewFavs()],
    [/^\/pedidos$/, () => viewMyOrders()],
    [/^\/privacidade$/, () => viewPrivacy()],
    [/^\/(?:atelie|admin|lojista)(?:\/([\w-]+))?$/, (m, q) => FA.adminView(m[1] || 'painel', q)],
  ];

  /* ---------- SEO: título e descrição de cada tela ---------- */
  const DEFAULT_TITLE = document.title;
  const DEFAULT_DESC = $('meta[name="description"]')?.getAttribute('content') || '';
  function metaFor(path) {
    const [, seg, sub] = path.split('/');
    if (seg === 'produto') {
      const p = S.product(sub);
      if (p) return { title: p.name, desc: `${p.name}${p.notes ? ` · ${p.notes}` : ''}. ${p.description}` };
    }
    if (seg === 'loja') {
      const c = FA.categories.find((x) => x.id === sub);
      return c ? { title: `${c.name} artesanais`, desc: `${c.name} da Flora Alma: ${c.tagline.toLowerCase()}. Feitos à mão em Feira de Santana - BA.` }
        : { title: 'Loja', desc: 'Sabonetes artesanais, velas aromáticas, kits de presente e mimos para a casa, feitos à mão pela Flora Alma.' };
    }
    if (seg === 'lembrancinhas') return { title: 'Lembrancinhas personalizadas para eventos', desc: 'Mini sabonetes, mini velas e sachês personalizados para casamento, maternidade, chá de bebê e eventos. Peça seu orçamento.' };
    if (seg === 'privacidade') return { title: 'Política de privacidade' };
    if (seg === 'finalizar' || seg === 'checkout') return { title: 'Finalizar compra' };
    if (seg === 'favoritos') return { title: 'Favoritos' };
    if (seg === 'pedidos' || seg === 'pedido') return { title: 'Meus pedidos' };
    if (/^(atelie|admin|lojista)$/.test(seg || '')) return { title: 'Área do ateliê' };
    return {};
  }
  function setMeta(m) {
    document.title = m.title ? `${m.title} | Flora Alma` : DEFAULT_TITLE;
    $('meta[name="description"]')?.setAttribute('content', (m.desc || DEFAULT_DESC).slice(0, 160));
  }

  async function router() {
    // páginas estáticas de SEO (produto/…, loja/…) já nascem numa rota
    const raw = decodeURI(location.hash.slice(1) || (document.body.dataset.route || '#/').slice(1));
    // retorno do link de confirmação de e-mail do Supabase (#access_token=… ou #error=…)
    if (/access_token=|error_description=/.test(raw)) {
      if (/error_description=/.test(raw)) toast('O link de confirmação expirou ou já foi usado. Entre com seu e-mail e senha.', 'err');
      await S.sb?.auth.getSession();
      history.replaceState(null, '', location.pathname + '#/atelie');
      return router();
    }
    const [pathFull, qs] = raw.split('?');
    const path = pathFull.split('#')[0] || '/';
    const params = new URLSearchParams(qs || '');
    let view = null;
    for (const [re, fn] of routes) {
      const m = path.match(re);
      if (m) { view = await fn(m, params); break; }
    }
    if (!view) view = viewNotFound();
    closeAll();
    document.body.classList.toggle('is-admin', /^\/(atelie|admin|lojista)/.test(path));
    app.classList.remove('page-in');
    app.innerHTML = view.html;
    void app.offsetWidth;
    app.classList.add('page-in');
    if (!params.has('keep')) window.scrollTo(0, 0);
    view.mount?.();
    reveal();
    setMeta(metaFor(path));
    // menu ativo
    const seg = path.split('/')[1] || 'home';
    const sub = path.split('/')[2];
    $$('[data-nav]').forEach((a) => a.classList.toggle('is-on', seg === 'loja' ? a.dataset.nav === (sub || 'loja') : a.dataset.nav === seg));
    $$('[data-tab]').forEach((a) => a.classList.toggle('is-on', a.dataset.tab === (seg === 'produto' ? 'loja' : seg)));
    if (raw.includes('#')) {
      const anchor = raw.split('#')[1];
      setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }
  window.addEventListener('hashchange', router);

  FA.ui = { esc, icon, toast, modal, closeModal, brl, router, maskPhone, reveal };

  S.load().then(() => {
    paintChrome();
    paintCounters();
    router();
  });
})();
