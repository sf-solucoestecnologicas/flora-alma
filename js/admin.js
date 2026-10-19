/* =========================================================
   Flora Alma — painel do ateliê (#/atelie)
   Login: Supabase Auth. Permissão: tabela flora.admins
   (acesso novo só pelo link de convite).
   ========================================================= */
(() => {
  const S = FA.store;
  const A = FA.art;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const { esc, icon, toast, modal, closeModal, brl } = FA.ui;
  const D = { data: null };

  const TABS = [
    ['painel', 'chart', 'Visão geral', 'Painel'],
    ['produtos', 'grid', 'Produtos', 'Produtos'],
    ['pedidos', 'bag', 'Pedidos', 'Pedidos'],
    ['lembrancinhas', 'gift', 'Lembrancinhas', 'Lembranças'],
    ['config', 'gear', 'Configurações', 'Ajustes'],
  ];
  const OSTATUS = [['novo', 'Novo'], ['pago', 'Pago'], ['preparando', 'Preparando'], ['enviado', 'Enviado/Pronto'], ['entregue', 'Entregue'], ['cancelado', 'Cancelado']];
  const RSTATUS = [['novo', 'Novo'], ['orcado', 'Orçamento enviado'], ['aprovado', 'Aprovado'], ['producao', 'Em produção'], ['entregue', 'Entregue'], ['cancelado', 'Cancelado']];
  const OPEN_REQ = ['novo', 'orcado', 'aprovado', 'producao'];
  const KINDS = [['soap', 'Sabonete em barra'], ['soapround', 'Sabonete redondo / shampoo em barra'], ['jar', 'Vela no pote de vidro'], ['tin', 'Vela na lata'], ['cup', 'Vela na xícara'], ['box', 'Caixa / kit presente'], ['tube', 'Bisnaga (creme)'], ['spray', 'Frasco spray'], ['bottle', 'Frasco alto'], ['diffuser', 'Difusor de varetas'], ['sachet', 'Sachê']];
  const DECOS = [['', 'Liso'], ['buds', 'Botões de lavanda'], ['herbs', 'Ervas'], ['oats', 'Aveia'], ['coffee', 'Café'], ['specks', 'Pontinhos claros'], ['petals', 'Pétalas'], ['swirl', 'Mármore']];
  const slug = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const fmtDT = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const label = (list, k) => (list.find((s) => s[0] === k) || [, k])[1];

  /* ---------- Entrada ---------- */
  FA.adminView = async (tab, params) => {
    if (!S.sb) return shell('<div class="adm-empty"><h2>Sem conexão com o banco</h2><p>Verifique sua internet e recarregue a página.</p></div>', tab, false);
    if (tab === 'criar-acesso') return signupView(params?.get('convite') || '');
    const session = await S.admin.session();
    if (!session) return loginView();
    let ok = await S.admin.isAdmin();
    // convite guardado de um cadastro que precisou confirmar e-mail
    const pending = S.LS.get('convite', '');
    if (!ok && pending) {
      try { await S.admin.redeem(pending); ok = true; } catch { /* convite trocado */ }
      S.LS.set('convite', '');
    }
    if (!ok) return deniedView(session.user.email);
    try {
      D.data = await S.admin.bootstrap();
    } catch (e) {
      return shell(`<div class="adm-empty"><h2>Erro ao carregar</h2><p>${esc(e.message)}</p></div>`, tab);
    }
    const views = { painel: vPainel, produtos: vProdutos, pedidos: vPedidos, lembrancinhas: vLembrancinhas, config: vConfig };
    return (views[tab] || vPainel)(session);
  };

  function shell(content, tab, withNav = true, mount) {
    return {
      html: `<section class="adm ${withNav ? '' : 'adm--solo'}">
        ${withNav ? `<aside class="adm__side">
          <div class="adm__brand"><img src="assets/logo.jpg" alt="" width="40" height="40"/><div><b>Ateliê</b><small>Painel Flora Alma</small></div></div>
          <nav>${TABS.map(([id, ic, lbl, short]) => `<a href="#/atelie/${id}" class="${tab === id ? 'is-on' : ''}" aria-label="${lbl}">${icon(ic)}<span class="l-long">${lbl}</span><span class="l-short">${short}</span>${id === 'pedidos' && D.data ? badgeNew() : ''}${id === 'lembrancinhas' && D.data ? badgeReq() : ''}</a>`).join('')}</nav>
          <div class="adm__side-foot">
            <a href="#/" class="adm__link adm__link--store">${icon('store')}<span>Ver loja</span></a>
            <button class="adm__link" data-adm="logout" aria-label="Sair">${icon('logout')}<span>Sair</span></button>
          </div>
        </aside>` : ''}
        <div class="adm__main">${content}</div>
      </section>`,
      mount() {
        $$('[data-adm="logout"]').forEach((b) => b.addEventListener('click', async () => { await S.admin.signOut(); location.hash = '#/atelie'; FA.ui.router(); }));
        mount?.();
      },
    };
  }
  const badgeNew = () => { const n = D.data.orders.filter((o) => o.status === 'novo').length; return n ? `<em class="adm__badge">${n}</em>` : ''; };
  const badgeReq = () => { const n = D.data.requests.filter((r) => r.status === 'novo').length; return n ? `<em class="adm__badge">${n}</em>` : ''; };
  const head = (title, sub, actions = '') => `<header class="adm__head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="adm__actions">${actions}</div></header>`;

  /* ---------- Entrar ---------- */
  function loginView() {
    return shell(`
      <div class="adm-login">
        <img src="assets/logo.jpg" alt="Flora Alma" width="96" height="96"/>
        <h1>Área do ateliê</h1>
        <p class="muted">Entre com o e-mail e a senha da sua conta.</p>
        <form id="admLogin" novalidate>
          <label class="field"><span>E-mail</span><input class="input" type="email" name="email" autocomplete="email" required/></label>
          <label class="field"><span>Senha</span><input class="input" type="password" name="password" autocomplete="current-password" required/></label>
          <button class="btn btn--dark btn--block btn--lg" type="submit">Entrar ${icon('arrow')}</button>
          <p class="adm-login__msg" id="admMsg"></p>
        </form>
        <p class="muted small">Ainda não tem acesso? Peça o link de convite a quem cuida do ateliê.</p>
        <a href="#/" class="link-arrow">← Voltar para a loja</a>
      </div>`, 'entrar', false, () => {
      const form = $('#admLogin');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = $('#admMsg');
        const email = form.elements.email.value.trim();
        const pw = form.elements.password.value;
        if (!email || !pw) { msg.textContent = 'Informe e-mail e senha.'; return; }
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        msg.textContent = '';
        try { await S.admin.signIn(email, pw); FA.ui.router(); } catch (err) { msg.textContent = err.message; btn.disabled = false; }
      });
    });
  }

  /* ---------- Criar acesso (só pelo link de convite) ---------- */
  async function signupView(code) {
    const valid = code && await S.admin.checkInvite(code);
    if (!valid) {
      return shell(`<div class="adm-login">
        <img src="assets/logo.jpg" alt="" width="80" height="80"/>
        <h1>Link inválido</h1>
        <p class="muted">Este link de convite não é válido ou já foi trocado. Peça um novo link a quem cuida do ateliê.</p>
        <a href="#/" class="link-arrow">← Voltar para a loja</a>
      </div>`, 'criar', false);
    }
    return shell(`
      <div class="adm-login">
        <img src="assets/logo.jpg" alt="Flora Alma" width="96" height="96"/>
        <h1>Criar acesso</h1>
        <p class="muted">Você recebeu um convite para o painel da <b>Flora Alma</b>. Crie sua conta e já entre no painel.</p>
        <form id="admSignup" novalidate>
          <label class="field"><span>Seu nome</span><input class="input" name="name" autocomplete="name" required/></label>
          <label class="field"><span>E-mail</span><input class="input" type="email" name="email" autocomplete="email" required/></label>
          <label class="field"><span>Senha <small>(mínimo 8 caracteres, com letras e números)</small></span><input class="input" type="password" name="password" autocomplete="new-password" minlength="8" required/></label>
          <label class="field"><span>Repita a senha</span><input class="input" type="password" name="password2" autocomplete="new-password" required/></label>
          <button class="btn btn--dark btn--block btn--lg" type="submit">Criar conta e entrar ${icon('arrow')}</button>
          <p class="adm-login__msg" id="admMsg"></p>
        </form>
      </div>`, 'criar', false, () => {
      const form = $('#admSignup');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = (n) => form.elements[n].value.trim();
        const msg = $('#admMsg');
        if (v('name').length < 2) { msg.textContent = 'Informe seu nome.'; return; }
        if (!/^\S+@\S+\.\S+$/.test(v('email'))) { msg.textContent = 'Informe um e-mail válido.'; return; }
        const pw = form.elements.password.value;
        if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) { msg.textContent = 'A senha precisa ter pelo menos 8 caracteres, com letras e números.'; return; }
        if (form.elements.password.value !== form.elements.password2.value) { msg.textContent = 'As senhas não conferem.'; return; }
        const btn = form.querySelector('button[type=submit]');
        btn.disabled = true;
        msg.textContent = '';
        try {
          const r = await S.admin.signUp(v('email'), form.elements.password.value, v('name'));
          if (!r.session) {
            // a confirmação de e-mail ainda está ligada no projeto Supabase
            S.LS.set('convite', code);
            form.outerHTML = `<p class="adm-login__ok">✉️ Conta criada! Abra o link que enviamos para <b>${esc(v('email'))}</b> e depois <a href="#/atelie">entre no painel</a>.</p>`;
            return;
          }
          await S.admin.redeem(code);
          toast('Conta criada. Boas-vindas ao ateliê!');
          location.hash = '#/atelie';
        } catch (err) { msg.textContent = err.message; btn.disabled = false; }
      });
    });
  }

  function deniedView(email) {
    return shell(`<div class="adm-login">
      <img src="assets/logo.jpg" alt="" width="80" height="80"/>
      <h1>Sem permissão</h1>
      <p class="muted">A conta <b>${esc(email)}</b> não tem acesso a este painel. Peça o link de convite a quem cuida do ateliê.</p>
      <button class="btn btn--dark" data-adm="logout">${icon('logout')} Sair</button>
    </div>`, 'entrar', false);
  }

  /* ---------- Visão geral ---------- */
  function vPainel() {
    const { orders, requests, products } = D.data;
    const valid = orders.filter((o) => o.status !== 'cancelado');
    const revenue = valid.reduce((t, o) => t + Number(o.total), 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(today); d.setDate(d.getDate() - 13 + i); return d; });
    const byDay = days.map((d) => {
      const v = valid.filter((o) => { const x = new Date(o.created_at); x.setHours(0, 0, 0, 0); return +x === +d; }).reduce((t, o) => t + Number(o.total), 0);
      return { d, v };
    });
    const max = Math.max(1, ...byDay.map((x) => x.v));
    const upcoming = requests.filter((r) => OPEN_REQ.includes(r.status) && new Date(r.event_date + 'T23:59:59') >= new Date()).sort((a, b) => a.event_date.localeCompare(b.event_date));
    const low = products.filter((p) => p.active && p.stock <= 3).sort((a, b) => a.stock - b.stock);
    const top = Object.values(valid.flatMap((o) => o.items).reduce((m, i) => { (m[i.id] = m[i.id] || { name: i.name, qty: 0 }); m[i.id].qty += i.qty; return m; }, {})).sort((a, b) => b.qty - a.qty).slice(0, 5);
    const gifts = valid.filter((o) => o.gift?.wrap).length;

    return shell(`
      ${head('Visão geral', `Oi! Aqui está o resumo do ateliê em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}.`, `<a class="btn btn--dark btn--sm" href="#/atelie/produtos">${icon('plus')} Novo produto</a>`)}
      <div class="kpis">
        <div class="kpi"><small>Faturamento</small><b>${brl(revenue)}</b><span>${valid.length} pedidos válidos</span></div>
        <div class="kpi"><small>Valor médio</small><b>${brl(valid.length ? revenue / valid.length : 0)}</b><span>${gifts} para presente</span></div>
        <div class="kpi kpi--hl"><small>Pedidos novos</small><b>${orders.filter((o) => o.status === 'novo').length}</b><span><a href="#/atelie/pedidos">ver pedidos →</a></span></div>
        <div class="kpi"><small>Lembrancinhas</small><b>${upcoming.length}</b><span>orçamentos em aberto</span></div>
      </div>
      <div class="adm-grid">
        <div class="panel panel--wide">
          <h3>Vendas · últimos 14 dias</h3>
          <div class="bars">${byDay.map(({ d, v }) => `<div class="bars__col" title="${d.toLocaleDateString('pt-BR')}: ${brl(v)}"><i style="height:${Math.max(2, (v / max) * 100)}%"></i><small>${d.getDate()}</small></div>`).join('')}</div>
        </div>
        <div class="panel">
          <h3>Próximos eventos</h3>
          ${upcoming.slice(0, 5).map((r) => `<div class="li"><b>${fmtDate(r.event_date + 'T12:00:00')} · ${esc(r.event)}</b><span>${esc(r.name)} · ${r.qty} un. · ${esc(label(RSTATUS, r.status))}</span></div>`).join('') || '<p class="muted">Nenhum orçamento em aberto.</p>'}
        </div>
        <div class="panel">
          <h3>Estoque baixo</h3>
          ${low.slice(0, 6).map((p) => `<div class="li li--row"><span>${esc(p.name)}</span><em class="stock ${p.stock <= 0 ? 'stock--out' : ''}">${p.stock}</em></div>`).join('') || '<p class="muted">Tudo abastecido ✿</p>'}
        </div>
        <div class="panel">
          <h3>Mais vendidos</h3>
          ${top.map((t) => `<div class="li li--row"><span>${esc(t.name)}</span><em>${t.qty} un.</em></div>`).join('') || '<p class="muted">Ainda sem vendas.</p>'}
        </div>
        <div class="panel panel--wide">
          <h3>Últimos pedidos</h3>
          ${orderTable(orders.slice(0, 6), true)}
        </div>
      </div>`, 'painel');
  }

  function orderTable(list, compact = false) {
    if (!list.length) return '<p class="muted">Nenhum pedido ainda. Assim que alguém finalizar uma compra, ela aparece aqui.</p>';
    return `<div class="table-wrap"><table class="table table--orders"><thead><tr><th>Pedido</th><th>Data</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th>Situação</th></tr></thead><tbody>
      ${list.map((o) => `<tr><td><b>${esc(o.id)}</b>${o.gift?.wrap ? ' 🎁' : ''}</td><td>${fmtDT(o.created_at)}</td><td>${esc(o.customer.name)}</td><td>${brl(o.total)}</td><td>${S.PAY[o.payment]}</td>
      <td><span class="status status--${o.status}">${label(OSTATUS, o.status)}</span></td></tr>`).join('')}
    </tbody></table></div>${compact ? '<a class="link-arrow" href="#/atelie/pedidos">Ver todos →</a>' : ''}`;
  }

  /* ---------- Produtos ---------- */
  function vProdutos() {
    const { products } = D.data;
    return shell(`
      ${head('Produtos', `${products.length} produtos cadastrados`, `<button class="btn btn--dark btn--sm" data-adm="new">${icon('plus')} Novo produto</button>`)}
      <div class="adm-toolbar">
        <div class="searchinline">${icon('search')}<input type="search" placeholder="Buscar produto…" id="admQ" aria-label="Buscar produto"/></div>
        <select class="select" id="admCat" aria-label="Categoria"><option value="">Todas as categorias</option>${FA.categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join('')}</select>
      </div>
      <div class="table-wrap"><table class="table table--products"><thead><tr><th></th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Situação</th><th></th></tr></thead><tbody id="admRows"></tbody></table></div>
    `, 'produtos', true, () => {
      const paint = () => {
        const q = $('#admQ').value.toLowerCase();
        const c = $('#admCat').value;
        $('#admRows').innerHTML = products.filter((p) => (!c || p.cat === c) && (!q || `${p.name} ${p.aroma}`.toLowerCase().includes(q))).map((p) => `
          <tr class="${p.active ? '' : 'is-off'}">
            <td><span class="thumb" style="--bg:${A.bg(p.art)}">${A.media(p, { lit: false })}</span></td>
            <td><b>${esc(p.name)}</b><small>${esc(p.aroma)} · ${esc(p.id)}</small></td>
            <td>${esc((FA.categories.find((x) => x.id === p.cat) || {}).name || p.cat)}<small>${esc(p.sub)}</small></td>
            <td>${brl(p.price)}${p.old_price ? `<small><s>${brl(p.old_price)}</s></small>` : ''}</td>
            <td><div class="stockedit"><button data-stock="-1" data-id="${esc(p.id)}" aria-label="Menos">−</button><em class="stock ${p.stock <= 0 ? 'stock--out' : p.stock <= 3 ? 'stock--low' : ''}">${p.stock}</em><button data-stock="1" data-id="${esc(p.id)}" aria-label="Mais">+</button></div></td>
            <td>${p.active ? '<span class="status status--pago">Ativo</span>' : '<span class="status status--cancelado">Oculto</span>'}${p.featured ? ' <span class="status status--novo">Destaque</span>' : ''}</td>
            <td class="actions"><button class="iconbtn iconbtn--sm" data-edit="${esc(p.id)}" aria-label="Editar">${icon('edit')}</button><button class="iconbtn iconbtn--sm" data-del="${esc(p.id)}" aria-label="Excluir">${icon('trash')}</button></td>
          </tr>`).join('');
      };
      $('#admQ').addEventListener('input', paint);
      $('#admCat').addEventListener('change', paint);
      $('.adm__main').addEventListener('click', async (e) => {
        if (e.target.closest('[data-adm="new"]')) productForm();
        const ed = e.target.closest('[data-edit]'); if (ed) productForm(products.find((p) => p.id === ed.dataset.edit));
        const del = e.target.closest('[data-del]');
        if (del && confirm('Excluir este produto? Essa ação não pode ser desfeita.')) {
          try {
            await S.admin.call('flora_admin_delete_product', { p_id: del.dataset.del });
            products.splice(products.findIndex((p) => p.id === del.dataset.del), 1);
            paint(); toast('Produto excluído'); refreshStore();
          } catch (err) { toast(err.message, 'err'); }
        }
        const sb = e.target.closest('[data-stock]');
        if (sb) {
          const p = products.find((x) => x.id === sb.dataset.id);
          const next = { ...p, stock: Math.max(0, p.stock + +sb.dataset.stock) };
          try { const r = await S.admin.call('flora_admin_upsert_product', { p: next }); Object.assign(p, r); paint(); refreshStore(); } catch (err) { toast(err.message, 'err'); }
        }
      });
      paint();
    });
  }

  function productForm(p) {
    const isNew = !p;
    p = p ? JSON.parse(JSON.stringify(p)) : { id: '', name: '', aroma: '', cat: 'sabonetes', sub: '', price: 0, old_price: null, stock: 1, options: [], opt_label: 'Aroma', moods: [], notes: '', description: '', specs: [], art: { kind: 'soap', color: '#e9d8c4', accent: '#a86b4f', deco: '', bg: '#efe5d7' }, image: '', featured: false, is_new: true, active: true, sort: 100 };
    const card = modal(`
      <h3 class="modal__title">${isNew ? 'Novo produto' : 'Editar produto'}</h3>
      <form id="pForm" class="pform" novalidate>
        <div class="pform__media">
          <div class="pform__preview" id="pPrev" style="--bg:${A.bg(p.art)}">${A.media(p)}</div>
          <label class="btn btn--line btn--block btn--sm upl">${icon('upload')} Enviar foto<input type="file" accept="image/*" id="pFile" hidden/></label>
          <button type="button" class="btn btn--text btn--block btn--sm" id="pNoPhoto" ${p.image ? '' : 'hidden'}>Remover foto (usar ilustração)</button>
          <details class="pform__art" ${p.image ? '' : 'open'}><summary>Ilustração (quando não há foto)</summary>
            <label class="field"><span>Tipo</span><select class="select select--full" name="art_kind">${KINDS.map(([k, l]) => `<option value="${k}" ${p.art?.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <label class="field" data-soaponly><span>Textura do sabonete</span><select class="select select--full" name="art_deco">${DECOS.map(([v, l]) => `<option value="${v}" ${(p.art?.deco || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <div class="row2">
              <label class="field"><span>Cor principal</span><input type="color" name="art_color" value="${esc(p.art?.color || '#e9d8c4')}"/></label>
              <label class="field"><span>Detalhe / rótulo</span><input type="color" name="art_accent" value="${esc(p.art?.accent || '#a86b4f')}"/></label>
            </div>
            <div class="row2">
              <label class="field"><span>Cera / líquido</span><input type="color" name="art_wax" value="${esc(p.art?.wax || '#f4e9d6')}"/></label>
              <label class="field"><span>Fundo</span><input type="color" name="art_bg" value="${A.bg(p.art)}"/></label>
            </div>
            <label class="field"><span>Texto do rótulo</span><input class="input" name="art_label" maxlength="16" value="${esc(p.art?.label || '')}"/></label>
          </details>
        </div>
        <div class="pform__fields">
          <label class="field"><span>Nome do produto</span><input class="input" name="name" value="${esc(p.name)}" required/></label>
          <div class="row2">
            <label class="field"><span>Código (endereço)</span><input class="input" name="id" value="${esc(p.id)}" ${isNew ? '' : 'readonly'} placeholder="gerado do nome"/></label>
            <label class="field"><span>Aroma principal</span><input class="input" name="aroma" value="${esc(p.aroma)}" placeholder="Ex.: Lavanda (ou Vários)"/></label>
          </div>
          <div class="row2">
            <label class="field"><span>Categoria</span><select class="select select--full" name="cat">${FA.categories.map((c) => `<option value="${c.id}" ${p.cat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
            <label class="field"><span>Tipo</span><input class="input" name="sub" value="${esc(p.sub)}" placeholder="Ex.: Pote de vidro, Barra vegetal"/></label>
          </div>
          <div class="row3">
            <label class="field"><span>Preço (R$)</span><input class="input" name="price" type="number" step="0.01" min="0" value="${p.price}"/></label>
            <label class="field"><span>Preço “de” (R$)</span><input class="input" name="old_price" type="number" step="0.01" min="0" value="${p.old_price ?? ''}" placeholder="opcional"/></label>
            <label class="field"><span>Estoque</span><input class="input" name="stock" type="number" step="1" value="${p.stock}"/></label>
          </div>
          <label class="field"><span>Notas do aroma <small>(aparece em itálico no produto)</small></span><input class="input" name="notes" value="${esc(p.notes)}" placeholder="Ex.: Lavanda, camomila e baunilha"/></label>
          <div class="row2">
            <label class="field"><span>Nome da escolha</span><input class="input" name="opt_label" value="${esc(p.opt_label || 'Aroma')}" placeholder="Aroma"/></label>
            <label class="field"><span>Opções <small>(separe por vírgula)</small></span><input class="input" name="options" value="${esc((p.options || []).join(', '))}" placeholder="Lavanda, Baunilha & Canela"/></label>
          </div>
          <div class="field"><span>Momentos <small>(usados no guia de aromas)</small></span><div class="row4 checks">
            ${FA.moods.map((m) => `<label class="check"><input type="checkbox" name="mood" value="${m.id}" ${(p.moods || []).includes(m.id) ? 'checked' : ''}/><span></span>${m.name}</label>`).join('')}
          </div></div>
          <label class="field"><span>Descrição</span><textarea class="input" name="description" rows="3">${esc(p.description)}</textarea></label>
          <label class="field"><span>Detalhes <small>(um por linha: Item: valor)</small></span><textarea class="input" name="specs" rows="4" placeholder="Peso: aprox. 100 g">${esc((p.specs || []).map(([k, v]) => `${k}: ${v}`).join('\n'))}</textarea></label>
          <div class="row3 checks">
            <label class="check"><input type="checkbox" name="active" ${p.active ? 'checked' : ''}/><span></span>Visível na loja</label>
            <label class="check"><input type="checkbox" name="featured" ${p.featured ? 'checked' : ''}/><span></span>Destaque</label>
            <label class="check"><input type="checkbox" name="is_new" ${p.is_new ? 'checked' : ''}/><span></span>Novidade</label>
          </div>
          <label class="field"><span>Ordem na vitrine <small>(menor aparece antes)</small></span><input class="input" name="sort" type="number" value="${p.sort || 0}"/></label>
          <div class="pform__foot"><button type="button" class="btn btn--line" data-action="close-modal">Cancelar</button><button class="btn btn--dark" type="submit">${icon('check')} Salvar produto</button></div>
        </div>
      </form>`, 'modal__card--wide');

    const form = $('#pForm', card);
    const readArt = () => ({
      kind: form.elements.art_kind.value, deco: form.elements.art_deco.value, color: form.elements.art_color.value,
      accent: form.elements.art_accent.value, wax: form.elements.art_wax.value, bg: form.elements.art_bg.value,
      label: form.elements.art_label.value.trim().toUpperCase(),
    });
    const preview = () => {
      p.art = readArt();
      $('[data-soaponly]', card).hidden = !['soap', 'soapround'].includes(p.art.kind);
      const pv = $('#pPrev', card);
      pv.style.setProperty('--bg', p.art.bg);
      pv.innerHTML = A.media(p);
    };
    $('.pform__art', card).addEventListener('input', preview);
    $('.pform__art', card).addEventListener('change', preview);
    form.elements.name.addEventListener('input', () => { if (isNew) form.elements.id.value = slug(form.elements.name.value); });
    $('#pFile', card).addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const id = form.elements.id.value || slug(form.elements.name.value) || 'produto';
      $('#pPrev', card).innerHTML = '<span class="spinner spinner--dark"></span>';
      try {
        p.image = await S.admin.upload(file, id);
        $('#pNoPhoto', card).hidden = false;
        toast('Foto enviada');
      } catch (err) { toast(err.message, 'err'); }
      preview();
    });
    $('#pNoPhoto', card).addEventListener('click', () => { p.image = ''; $('#pNoPhoto', card).hidden = true; preview(); });
    preview();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const v = (n) => form.elements[n].value.trim();
      if (!v('name') || !(+v('price') >= 0)) return toast('Preencha nome e preço', 'err');
      const data = {
        ...p,
        id: v('id') || slug(v('name')), name: v('name'), aroma: v('aroma'), cat: v('cat'), sub: v('sub'),
        price: +v('price'), old_price: v('old_price') ? +v('old_price') : null, stock: parseInt(v('stock'), 10) || 0,
        notes: v('notes'), opt_label: v('opt_label') || 'Aroma',
        options: v('options') ? v('options').split(',').map((s) => s.trim()).filter(Boolean) : [],
        moods: $$('[name="mood"]:checked', form).map((x) => x.value),
        description: v('description'),
        specs: v('specs').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(':'); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : [l, '']; }),
        active: form.elements.active.checked, featured: form.elements.featured.checked, is_new: form.elements.is_new.checked,
        sort: parseInt(v('sort'), 10) || 0, art: readArt(),
      };
      try {
        const saved = await S.admin.call('flora_admin_upsert_product', { p: data });
        const i = D.data.products.findIndex((x) => x.id === saved.id);
        if (i >= 0) D.data.products[i] = saved; else D.data.products.push(saved);
        closeModal();
        toast('Produto salvo');
        refreshStore();
        FA.ui.router();
      } catch (err) { toast(err.message, 'err'); }
    });
  }

  /* ---------- Pedidos ---------- */
  function vPedidos() {
    const { orders } = D.data;
    return shell(`
      ${head('Pedidos', `${orders.length} pedidos`, `<button class="btn btn--line btn--sm" data-adm="csv">${icon('upload')} Exportar planilha</button>`)}
      <div class="adm-toolbar"><div class="chips" id="oFilter">
        <button class="chip is-on" data-st="">Todos (${orders.length})</button>
        ${OSTATUS.map(([k, l]) => { const n = orders.filter((o) => o.status === k).length; return n ? `<button class="chip" data-st="${k}">${l} (${n})</button>` : ''; }).join('')}
      </div></div>
      <div id="oList" class="olist"></div>`, 'pedidos', true, () => {
      let filter = '';
      const paint = () => {
        const list = orders.filter((o) => !filter || o.status === filter);
        $('#oList').innerHTML = list.length ? list.map((o) => {
          const d = o.delivery;
          const g = o.gift || {};
          const msg = `Oi, ${o.customer.name.split(' ')[0]}! Aqui é da Flora Alma, sobre o seu pedido ${o.id}.`;
          return `<details class="ocard">
            <summary>
              <b>${esc(o.id)}${g.wrap ? ' 🎁' : ''}</b><span>${fmtDT(o.created_at)}</span><span class="ocard__name">${esc(o.customer.name)}</span>
              <span>${S.PAY[o.payment]}${o.payment === 'cartao' ? ` ${o.installments}x` : ''}</span><b>${brl(o.total)}</b>
              <span class="status status--${o.status}">${label(OSTATUS, o.status)}</span>
            </summary>
            <div class="ocard__body">
              <div><h4>Itens</h4>${o.items.map((i) => `<p>${i.qty}x ${esc(i.name)}${i.variant ? ` <small>(${esc(i.variant)})</small>` : ''} — ${brl(i.price * i.qty)}</p>`).join('')}
                <p class="muted small">Subtotal ${brl(o.subtotal)}${Number(o.discount) ? ` · cupom ${esc(o.coupon)} -${brl(o.discount)}` : ''}${Number(o.pix_discount) ? ` · Pix -${brl(o.pix_discount)}` : ''}${Number(o.gift_fee) ? ` · presente ${brl(o.gift_fee)}` : ''}${Number(o.shipping) ? ` · entrega ${brl(o.shipping)}` : ''}</p>
                ${g.wrap ? `<h4>Presente</h4><p>${g.to ? `Para: <b>${esc(g.to)}</b><br/>` : ''}${g.message ? `Cartão: “${esc(g.message)}”` : '<span class="muted">Sem mensagem no cartão</span>'}</p>` : ''}</div>
              <div><h4>Cliente</h4><p>${esc(o.customer.name)}<br/>${S.fmtPhone(o.customer.phone)}${o.customer.email ? `<br/>${esc(o.customer.email)}` : ''}</p>
                <h4>Entrega</h4><p>${S.SHIP[d.method]}${d.method !== 'retirada' ? `<br/>${esc(d.street)}, ${esc(d.number)} ${esc(d.complement || '')}<br/>${esc(d.district)} — ${esc(d.city)}/${esc(d.uf)} · ${esc(d.cep)}` : ''}</p>
                ${o.notes ? `<h4>Obs.</h4><p>${esc(o.notes)}</p>` : ''}</div>
              <div class="ocard__acts">
                <label class="field"><span>Situação</span><select class="select select--full" data-ostatus="${esc(o.id)}">${OSTATUS.map(([k, l]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
                ${o.customer.phone ? `<a class="btn btn--wa btn--sm btn--block" target="_blank" rel="noopener" href="${S.waLink(msg, o.customer.phone)}">${icon('wa')} Chamar no WhatsApp</a>
                <button type="button" class="btn btn--text btn--sm btn--block" data-anon="${esc(o.id)}">${icon('shield')} Apagar dados pessoais</button>` : '<p class="muted small">Dados pessoais removidos a pedido do cliente.</p>'}
              </div>
            </div>
          </details>`;
        }).join('') : '<div class="adm-empty"><p class="muted">Nenhum pedido aqui.</p></div>';
      };
      $('#oFilter').addEventListener('click', (e) => {
        const b = e.target.closest('[data-st]'); if (!b) return;
        filter = b.dataset.st;
        $$('#oFilter .chip').forEach((x) => x.classList.toggle('is-on', x === b));
        paint();
      });
      $('#oList').addEventListener('change', async (e) => {
        const sel = e.target.closest('[data-ostatus]'); if (!sel) return;
        try {
          const r = await S.admin.call('flora_admin_set_order_status', { p_id: sel.dataset.ostatus, p_status: sel.value });
          Object.assign(orders.find((o) => o.id === r.id), r);
          toast(`Pedido ${r.id}: ${label(OSTATUS, r.status)}${r.status === 'cancelado' ? ' (estoque devolvido)' : ''}`);
          paint();
          refreshStore();
        } catch (err) { toast(err.message, 'err'); }
      });
      $('#oList').addEventListener('click', async (e) => {
        const an = e.target.closest('[data-anon]'); if (!an) return;
        if (!confirm('Apagar nome, telefone, e-mail, endereço e mensagem deste pedido? Os itens e valores continuam para o seu controle. Não dá para desfazer.')) return;
        try {
          const r = await S.admin.call('flora_admin_anonymize_order', { p_id: an.dataset.anon });
          Object.assign(orders.find((o) => o.id === r.id), r);
          toast('Dados pessoais apagados');
          paint();
        } catch (err) { toast(err.message, 'err'); }
      });
      $('[data-adm="csv"]').addEventListener('click', () => {
        const rows = [['pedido', 'data', 'cliente', 'telefone', 'itens', 'presente', 'pagamento', 'entrega', 'total', 'situação']]
          .concat(orders.map((o) => [o.id, fmtDT(o.created_at), o.customer.name, o.customer.phone, o.items.map((i) => `${i.qty}x ${i.name}${i.variant ? ` (${i.variant})` : ''}`).join(' | '), o.gift?.wrap ? 'sim' : 'não', S.PAY[o.payment], S.SHIP[o.delivery.method], String(o.total).replace('.', ','), label(OSTATUS, o.status)]));
        download(rows, `pedidos-flora-alma-${new Date().toISOString().slice(0, 10)}.csv`);
      });
      paint();
    });
  }

  // planilha: textos começando com = + - @ viram texto puro (evita fórmula maliciosa no Excel)
  function download(rows, name) {
    const cell = (c) => {
      let v = String(c ?? '');
      if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
      return `"${v.replace(/"/g, '""')}"`;
    };
    const csv = rows.map((r) => r.map(cell).join(';')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = name;
    a.click();
  }

  /* ---------- Lembrancinhas ---------- */
  function vLembrancinhas() {
    const { requests } = D.data;
    const sorted = [...requests].sort((a, b) => {
      const oa = OPEN_REQ.includes(a.status) ? 0 : 1;
      const ob = OPEN_REQ.includes(b.status) ? 0 : 1;
      return (oa - ob) || a.event_date.localeCompare(b.event_date);
    });
    return shell(`
      ${head('Lembrancinhas', `${requests.filter((r) => OPEN_REQ.includes(r.status)).length} orçamentos em aberto`, `<button class="btn btn--line btn--sm" data-adm="csv">${icon('upload')} Exportar planilha</button>`)}
      <div class="table-wrap"><table class="table table--req"><thead><tr><th>Evento</th><th>Cliente</th><th>Itens</th><th>Qtd.</th><th>Estimativa</th><th>Situação</th><th></th></tr></thead><tbody>
        ${sorted.map((r) => `<tr>
          <td><b>${fmtDate(r.event_date + 'T12:00:00')} · ${esc(r.event)}</b><small>${esc(r.id)} · pedido em ${fmtDate(r.created_at)}</small></td>
          <td>${esc(r.name)}<small>${S.fmtPhone(r.phone)}</small></td>
          <td>${esc(r.items.map((s) => s.name).join(', '))}${r.aroma ? `<small>Aroma: ${esc(r.aroma)}</small>` : ''}${r.custom ? `<small>Personalização: ${esc(r.custom)}</small>` : ''}${r.notes ? `<small>Obs.: ${esc(r.notes)}</small>` : ''}</td>
          <td>${r.qty} un.</td>
          <td data-label="Estimativa">${brl(r.estimate)}</td>
          <td><select class="select select--sm" data-rstatus="${esc(r.id)}" aria-label="Situação">${RSTATUS.map(([k, l]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
          <td class="actions">${r.phone ? `<a class="iconbtn iconbtn--sm" target="_blank" rel="noopener" href="${S.waLink(`Oi, ${r.name.split(' ')[0]}! Aqui é da Flora Alma, sobre as lembrancinhas do seu evento (${r.id}).`, r.phone)}" aria-label="WhatsApp">${icon('wa')}</a>
            <button type="button" class="iconbtn iconbtn--sm" data-anonr="${esc(r.id)}" aria-label="Apagar dados pessoais" title="Apagar dados pessoais (LGPD)">${icon('shield')}</button>` : ''}</td>
        </tr>`).join('') || '<tr><td colspan="7" class="muted">Nenhum pedido de lembrancinha ainda.</td></tr>'}
      </tbody></table></div>`, 'lembrancinhas', true, () => {
      $('.adm__main').addEventListener('change', async (e) => {
        const sel = e.target.closest('[data-rstatus]'); if (!sel) return;
        try {
          await S.admin.call('flora_admin_set_request_status', { p_id: sel.dataset.rstatus, p_status: sel.value });
          requests.find((r) => r.id === sel.dataset.rstatus).status = sel.value;
          toast('Situação atualizada');
        } catch (err) { toast(err.message, 'err'); }
      });
      $('.adm__main').addEventListener('click', async (e) => {
        const an = e.target.closest('[data-anonr]'); if (!an) return;
        if (!confirm('Apagar nome, telefone e personalização deste pedido de lembrancinhas? Não dá para desfazer.')) return;
        try {
          await S.admin.call('flora_admin_anonymize_request', { p_id: an.dataset.anonr });
          toast('Dados pessoais apagados');
          FA.ui.router();
        } catch (err) { toast(err.message, 'err'); }
      });
      $('[data-adm="csv"]').addEventListener('click', () => {
        const rows = [['pedido', 'evento', 'data do evento', 'cliente', 'telefone', 'itens', 'quantidade', 'aroma', 'personalização', 'estimativa', 'situação']]
          .concat(requests.map((r) => [r.id, r.event, fmtDate(r.event_date + 'T12:00:00'), r.name, r.phone, r.items.map((s) => s.name).join(' | '), r.qty, r.aroma, r.custom, String(r.estimate).replace('.', ','), label(RSTATUS, r.status)]));
        download(rows, `lembrancinhas-flora-alma-${new Date().toISOString().slice(0, 10)}.csv`);
      });
    });
  }

  /* ---------- Configurações ---------- */
  function vConfig() {
    const s = { ...FA.seed.settings, ...D.data.settings };
    const { coupons, souvenirs } = D.data;
    const f = (name, lbl, value, type = 'text', extra = '') => `<label class="field"><span>${lbl}</span><input class="input" name="${name}" type="${type}" value="${esc(value ?? '')}" ${extra}/></label>`;
    return shell(`
      ${head('Configurações', 'Dados do ateliê, pagamentos, entrega, presente, cupons e lembrancinhas.')}
      <form class="panel cfg" id="cfgForm">
        <h3>Ateliê</h3>
        <div class="row2">${f('storeName', 'Nome da loja', s.storeName)}${f('whatsapp', 'WhatsApp (com DDD)', s.whatsapp, 'tel', 'placeholder="75999999999"')}</div>
        <div class="row2">${f('instagram', 'Instagram (sem @)', s.instagram)}${f('city', 'Cidade', s.city)}</div>
        <div class="row2">${f('address', 'Endereço ou ponto de retirada', s.address)}${f('hours', 'Horário de atendimento', s.hours)}</div>
        <div class="row2">${f('lat', 'Latitude do mapa <small>(opcional)</small>', s.lat ?? '', 'number', 'step="any"')}${f('lng', 'Longitude do mapa <small>(opcional)</small>', s.lng ?? '', 'number', 'step="any"')}</div>
        <h3>Pagamento</h3>
        <div class="row3">${f('pixKey', 'Chave Pix', s.pixKey, 'text', 'placeholder="CNPJ, e-mail, telefone ou aleatória"')}${f('pixName', 'Nome de quem recebe o Pix', s.pixName)}${f('pixCity', 'Cidade de quem recebe', s.pixCity)}</div>
        <div class="row2">${f('pixDiscount', 'Desconto no Pix (%)', s.pixDiscount, 'number', 'min="0" max="50" step="0.5"')}${f('maxInstallments', 'Parcelas sem juros (máx.)', s.maxInstallments, 'number', 'min="1" max="12"')}</div>
        <h3>Entrega e presente</h3>
        <div class="row3">${f('localDelivery', 'Taxa de entrega em Feira (R$)', s.localDelivery, 'number', 'step="0.01" min="0"')}${f('freeShippingOver', 'Entrega grátis acima de (R$)', s.freeShippingOver, 'number', 'step="0.01" min="0"')}${f('giftWrap', 'Embalagem para presente (R$)', s.giftWrap, 'number', 'step="0.01" min="0"')}</div>
        <div class="row2">${f('cepFrom', 'CEP inicial atendido (5 dígitos)', s.cepFrom)}${f('cepTo', 'CEP final atendido (5 dígitos)', s.cepTo)}</div>
        <h3>Lembrancinhas</h3>
        <div class="row2">${f('leadDays', 'Antecedência mínima (dias)', s.leadDays, 'number', 'min="1" max="120"')}${f('minQty', 'Quantidade mínima geral', s.minQty, 'number', 'min="1"')}</div>
        <h3>Faixa de avisos do topo</h3>
        <label class="field"><span>Uma mensagem por linha</span><textarea class="input" name="ticker" rows="4">${esc((s.ticker || []).join('\n'))}</textarea></label>
        <div class="cfg__foot"><button class="btn btn--dark" type="submit">${icon('check')} Salvar configurações</button></div>
      </form>

      <div class="adm-grid adm-grid--2">
        <form class="panel" id="cpForm">
          <h3>Cupons</h3>
          <div class="rowhead rowitem--cp"><span>Código</span><span>Tipo</span><span>Valor</span><span>Compra mín.</span><span>Ativo</span><span></span></div>
          <div class="rows" id="cpRows">${coupons.map(cpRow).join('')}</div>
          <button type="button" class="btn btn--line btn--sm" data-add="cp">${icon('plus')} Adicionar cupom</button>
          <div class="cfg__foot"><button class="btn btn--dark" type="submit">Salvar cupons</button></div>
        </form>
        <form class="panel" id="svForm">
          <h3>Itens de lembrancinha</h3>
          <div class="rowhead rowitem--sv"><span>Item</span><span>R$ / un.</span><span>Mín.</span><span>Ativo</span><span></span></div>
          <div class="rows" id="svRows">${souvenirs.map(svRow).join('')}</div>
          <button type="button" class="btn btn--line btn--sm" data-add="sv">${icon('plus')} Adicionar item</button>
          <div class="cfg__foot"><button class="btn btn--dark" type="submit">Salvar itens</button></div>
        </form>
      </div>

      <div class="adm-grid adm-grid--2">
        <div class="panel team" id="team">
          <h3>Equipe e convites</h3>
          <p class="muted small">Para dar acesso a alguém do ateliê, gere um link e envie só para essa pessoa. Cada link funciona <b>uma única vez</b> e vale por <b>7 dias</b>. Por segurança o link aparece só agora: copie antes de sair desta tela.</p>
          <button type="button" class="btn btn--dark btn--sm" data-adm="newinvite">${icon('plus')} Gerar link de convite</button>
          <div class="team__link" id="inviteBox" hidden><input class="input mono" id="inviteLink" readonly aria-label="Link de convite"/>
            <button type="button" class="btn btn--dark btn--sm" data-copy="#inviteLink" data-msg="Link de convite copiado!">${icon('copy')} Copiar</button></div>
          <h4 class="team__h">Quem tem acesso</h4>
          <div id="teamList" class="team__list"><p class="muted small">Carregando…</p></div>
          <h4 class="team__h">Convites recentes</h4>
          <div id="inviteList" class="team__list"></div>
        </div>
        <div class="panel" id="auditPanel">
          <h3>Histórico de alterações</h3>
          <p class="muted small">Tudo o que a equipe muda no painel fica registrado aqui, com quem fez e quando. Mudanças na chave Pix aparecem em destaque.</p>
          <div id="auditList" class="audit"><p class="muted small">Carregando…</p></div>
        </div>
      </div>`, 'config', true, () => {
      const linkFor = (code) => `${location.origin}${location.pathname}#/atelie/criar-acesso?convite=${code}`;
      const INV = { ativo: 'ativo', usado: 'usado', expirado: 'expirou', cancelado: 'cancelado' };
      const paintTeam = async () => {
        try {
          const [team, invites, audit] = await Promise.all([S.admin.call('flora_admin_team'), S.admin.call('flora_admin_invites'), S.admin.call('flora_admin_audit')]);
          if (!$('#teamList')) return; // saiu da tela antes de carregar
          $('#teamList').innerHTML = (team || []).map((m) => `<div class="li li--row"><span><b>${esc(m.email || '—')}</b>${m.me ? ' <em class="status status--novo">você</em>' : ''}<small class="muted"> · desde ${fmtDate(m.created_at)}</small></span>
            ${m.me ? '' : `<button type="button" class="btn btn--text btn--sm" data-rmadmin="${esc(m.user_id)}">Remover acesso</button>`}</div>`).join('');
          $('#inviteList').innerHTML = (invites || []).length ? invites.map((i) => `<div class="li li--row"><span>Criado em ${fmtDT(i.created_at)}<small class="muted"> · ${i.status === 'usado' ? `usado por ${esc(i.used_email || '—')}` : i.status === 'ativo' ? `vale até ${fmtDate(i.expires_at)}` : INV[i.status]}</small></span>
            ${i.status === 'ativo' ? `<button type="button" class="btn btn--text btn--sm" data-revoke="${esc(i.id)}">Cancelar</button>` : `<em class="status">${INV[i.status] || ''}</em>`}</div>`).join('') : '<p class="muted small">Nenhum convite gerado ainda.</p>';
          $('#auditList').innerHTML = (audit || []).length ? audit.map(auditRow).join('') : '<p class="muted small">Nenhuma alteração registrada ainda.</p>';
        } catch (err) { toast(err.message, 'err'); }
      };
      $('#team').addEventListener('click', async (e) => {
        if (e.target.closest('[data-adm="newinvite"]')) {
          try {
            const tok = await S.admin.call('flora_admin_create_invite');
            $('#inviteLink').value = linkFor(tok);
            $('#inviteBox').hidden = false;
            $('#inviteLink').select();
            toast('Link criado: copie e envie só para a pessoa da equipe');
            paintTeam();
          } catch (err) { toast(err.message, 'err'); }
        }
        const rv = e.target.closest('[data-revoke]');
        if (rv && confirm('Cancelar este convite? O link deixa de funcionar.')) {
          try { await S.admin.call('flora_admin_revoke_invite', { p_id: rv.dataset.revoke }); toast('Convite cancelado'); paintTeam(); } catch (err) { toast(err.message, 'err'); }
        }
        const rm = e.target.closest('[data-rmadmin]');
        if (rm && confirm('Remover o acesso desta pessoa ao painel?')) {
          try { await S.admin.call('flora_admin_remove', { p_user: rm.dataset.rmadmin }); toast('Acesso removido'); paintTeam(); } catch (err) { toast(err.message, 'err'); }
        }
      });
      paintTeam();
      $('#cfgForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const el = e.target.elements;
        const num = (n) => Number(el[n].value) || 0;
        const opt = (n) => (el[n].value === '' ? null : Number(el[n].value));
        const data = {
          ...s, storeName: el.storeName.value.trim(), whatsapp: S.onlyDigits(el.whatsapp.value), instagram: el.instagram.value.trim().replace(/^@/, ''),
          city: el.city.value.trim(), address: el.address.value.trim(), hours: el.hours.value.trim(), lat: opt('lat'), lng: opt('lng'),
          pixKey: el.pixKey.value.trim(), pixName: el.pixName.value.trim(), pixCity: el.pixCity.value.trim(),
          pixDiscount: num('pixDiscount'), maxInstallments: Math.max(1, num('maxInstallments')),
          localDelivery: num('localDelivery'), freeShippingOver: num('freeShippingOver'), giftWrap: num('giftWrap'),
          cepFrom: S.onlyDigits(el.cepFrom.value).slice(0, 5), cepTo: S.onlyDigits(el.cepTo.value).slice(0, 5),
          leadDays: Math.max(1, num('leadDays')), minQty: Math.max(1, num('minQty')),
          ticker: el.ticker.value.split('\n').map((x) => x.trim()).filter(Boolean),
        };
        try {
          const saved = await S.admin.call('flora_admin_save_settings', { p: data });
          const pixChanged = (saved.pixKey || '') !== (s.pixKey || '');
          D.data.settings = saved;
          Object.assign(s, saved);
          toast(pixChanged ? 'Configurações salvas. Atenção: a chave Pix foi alterada.' : 'Configurações salvas');
          refreshStore();
          paintTeam();
        } catch (err) { toast(err.message, 'err'); }
      });
      $('.adm__main').addEventListener('click', (e) => {
        const add = e.target.closest('[data-add]');
        if (add?.dataset.add === 'cp') $('#cpRows').insertAdjacentHTML('beforeend', cpRow({ code: '', kind: 'percent', value: 10, min_total: 0, active: true }));
        if (add?.dataset.add === 'sv') $('#svRows').insertAdjacentHTML('beforeend', svRow({ id: '', name: '', description: '', price: 0, min_qty: 20, active: true }));
        const rm = e.target.closest('[data-rm]'); if (rm) rm.closest('.rowitem').remove();
      });
      $('#cpForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const list = $$('#cpRows .rowitem').map((r) => ({ code: $('[name=code]', r).value.trim().toUpperCase(), kind: $('[name=kind]', r).value, value: +$('[name=value]', r).value || 0, min_total: +$('[name=min_total]', r).value || 0, active: $('[name=active]', r).checked })).filter((c) => c.code);
        try { await S.admin.call('flora_admin_save_coupons', { p: list }); D.data.coupons = list; toast('Cupons salvos'); } catch (err) { toast(err.message, 'err'); }
      });
      $('#svForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const list = $$('#svRows .rowitem').map((r, i) => ({ id: $('[name=id]', r).value.trim() || slug($('[name=name]', r).value), name: $('[name=name]', r).value.trim(), description: $('[name=description]', r).value.trim(), price: +$('[name=price]', r).value || 0, min_qty: parseInt($('[name=min_qty]', r).value, 10) || 1, sort: i + 1, active: $('[name=active]', r).checked })).filter((v) => v.name);
        try { await S.admin.call('flora_admin_save_souvenirs', { p: list }); D.data.souvenirs = list; toast('Itens salvos'); refreshStore(); } catch (err) { toast(err.message, 'err'); }
      });
    });
  }
  /* ---------- Histórico de alterações ---------- */
  const CFG = {
    storeName: 'nome da loja', whatsapp: 'WhatsApp', instagram: 'Instagram', city: 'cidade', address: 'endereço', hours: 'horário',
    lat: 'mapa', lng: 'mapa', pixKey: 'chave Pix', pixName: 'nome do Pix', pixCity: 'cidade do Pix', pixDiscount: 'desconto no Pix',
    maxInstallments: 'parcelas', freeShippingOver: 'entrega grátis', localDelivery: 'taxa de entrega', giftWrap: 'embalagem para presente',
    cepFrom: 'CEPs atendidos', cepTo: 'CEPs atendidos', leadDays: 'antecedência das lembrancinhas', minQty: 'quantidade mínima', ticker: 'avisos do topo',
  };
  function auditRow(a) {
    const d = a.detail || {};
    const msg = {
      produto_criado: () => `criou o produto “${d.nome}”`,
      produto_editado: () => `editou o produto “${d.nome}”`,
      estoque_ajustado: () => `estoque de ${d.id}: ${d.de} → ${d.para}`,
      produto_excluido: () => `excluiu o produto ${d.id}`,
      pedido_situacao: () => `pedido ${d.id}: ${label(OSTATUS, d.de)} → ${label(OSTATUS, d.para)}`,
      lembrancinha_situacao: () => `lembrancinhas ${d.id}: ${label(RSTATUS, d.para)}`,
      configuracoes: () => ((d.alterou || []).length ? `alterou ${[...new Set(d.alterou.map((k) => CFG[k] || k))].join(', ')}` : 'salvou as configurações sem mudanças'),
      cupons_salvos: () => `salvou os cupons (${d.total})`,
      lembrancinhas_salvas: () => `salvou os itens de lembrancinha (${d.total})`,
      convite_criado: () => 'gerou um link de convite',
      convite_cancelado: () => 'cancelou um link de convite',
      equipe_entrou: () => `${d.email} entrou na equipe`,
      equipe_removida: () => `removeu ${d.email} da equipe`,
      dados_removidos: () => `apagou os dados pessoais de ${d.pedido || d.lembrancinha}`,
    }[a.action];
    const alert = a.action === 'configuracoes' && (d.alterou || []).includes('pixKey');
    return `<div class="li audit__row ${alert ? 'audit__row--alert' : ''}"><b>${alert ? '⚠ ' : ''}${esc(msg ? msg() : a.action)}</b><span>${fmtDT(a.at)} · ${esc(a.email || '—')}</span></div>`;
  }

  const cpRow = (c) => `<div class="rowitem rowitem--cp">
    <label class="rf"><small>Código</small><input class="input" name="code" value="${esc(c.code)}" placeholder="CÓDIGO" maxlength="30"/></label>
    <label class="rf"><small>Tipo</small><select class="select" name="kind"><option value="percent" ${c.kind === 'percent' ? 'selected' : ''}>%</option><option value="fixed" ${c.kind === 'fixed' ? 'selected' : ''}>R$</option></select></label>
    <label class="rf"><small>Valor</small><input class="input" name="value" type="number" step="0.01" min="0" value="${c.value}"/></label>
    <label class="rf"><small>Compra mínima (R$)</small><input class="input" name="min_total" type="number" step="0.01" min="0" value="${c.min_total}"/></label>
    <label class="check rf-check"><input type="checkbox" name="active" ${c.active ? 'checked' : ''}/><span></span><em>Ativo</em></label>
    <button type="button" class="iconbtn iconbtn--sm rf-rm" data-rm aria-label="Remover cupom">${icon('trash')}</button></div>`;
  const svRow = (v) => `<div class="rowitem rowitem--sv">
    <input type="hidden" name="id" value="${esc(v.id)}"/>
    <label class="rf rf-name"><small>Item</small><input class="input" name="name" value="${esc(v.name)}" placeholder="Item" maxlength="80"/></label>
    <label class="rf"><small>R$ por unidade</small><input class="input" name="price" type="number" step="0.01" min="0" value="${v.price}"/></label>
    <label class="rf"><small>Qtd. mínima</small><input class="input" name="min_qty" type="number" step="1" min="1" value="${v.min_qty ?? 20}"/></label>
    <label class="check rf-check"><input type="checkbox" name="active" ${v.active !== false ? 'checked' : ''}/><span></span><em>Ativo</em></label>
    <button type="button" class="iconbtn iconbtn--sm rf-rm" data-rm aria-label="Remover item">${icon('trash')}</button>
    <label class="rf rowitem__full"><small>Descrição</small><input class="input" name="description" value="${esc(v.description)}" placeholder="Descrição" maxlength="200"/></label></div>`;

  // Recarrega o catálogo da vitrine depois de mudanças no painel
  function refreshStore() { S.load(); }
})();
