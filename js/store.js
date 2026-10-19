/* =========================================================
   Flora Alma — estado, Supabase, carrinho, Pix e WhatsApp
   ========================================================= */
window.FA = window.FA || {};
FA.store = (() => {
  const LS = {
    get(k, d) { try { const v = localStorage.getItem('fa_' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('fa_' + k, JSON.stringify(v)); } catch { /* modo privado */ } },
  };

  const sb = window.supabase
    ? window.supabase.createClient(FA.config.supabaseUrl, FA.config.supabaseKey, { auth: { persistSession: true, storageKey: 'fa_auth' } })
    : null;

  const state = {
    online: false,
    products: [],
    souvenirs: [],
    settings: { ...FA.seed.settings },
    cart: LS.get('cart', []),
    wish: LS.get('wish', []),
    myOrders: LS.get('orders', []),
    myRequests: LS.get('requests', []),
    coupon: LS.get('coupon', null),
  };

  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => fn(state));
  const on = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  /* ---------- Carga inicial ---------- */
  async function load() {
    const cached = LS.get('catalog', null);
    try {
      if (!sb) throw new Error('sem supabase-js');
      const { data, error } = await sb.rpc('flora_bootstrap');
      if (error) throw error;
      state.products = data.products || [];
      state.souvenirs = data.souvenirs || [];
      state.settings = { ...FA.seed.settings, ...(data.settings || {}) };
      state.online = true;
      LS.set('catalog', { products: state.products, souvenirs: state.souvenirs, settings: state.settings, at: Date.now() });
    } catch (e) {
      console.warn('[Flora Alma] Supabase indisponível, usando catálogo local:', e.message || e);
      const src = cached || { products: FA.seed.products, souvenirs: FA.seed.souvenirs, settings: FA.seed.settings };
      state.products = src.products;
      state.souvenirs = src.souvenirs || FA.seed.souvenirs;
      state.settings = { ...FA.seed.settings, ...src.settings };
      state.online = false;
    }
    pruneCart();
    emit();
  }

  /* ---------- Formatação ---------- */
  const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const onlyDigits = (s) => String(s || '').replace(/\D/g, '');
  const fmtPhone = (s) => {
    const d = onlyDigits(s).replace(/^55/, '');
    if (d.length < 10) return s;
    return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
  };
  const product = (id) => state.products.find((p) => p.id === id);
  const pixPrice = (price) => price * (1 - (Number(state.settings.pixDiscount) || 0) / 100);
  // parcela mínima de R$ 10 (o servidor só limita ao máximo configurado)
  const installment = (price) => {
    const max = Math.max(1, Number(state.settings.maxInstallments) || 1);
    const n = Math.max(1, Math.min(max, Math.floor(price / 10)));
    return { n, value: price / n };
  };
  const discountPct = (p) => (p.old_price && p.old_price > p.price ? Math.round((1 - p.price / p.old_price) * 100) : 0);

  /* ---------- Carrinho ---------- */
  const saveCart = () => { LS.set('cart', state.cart); emit(); };
  const keyOf = (id, variant) => `${id}::${variant || ''}`;

  function addToCart(id, variant = '', qty = 1) {
    const p = product(id);
    if (!p) return { ok: false, msg: 'Produto não encontrado' };
    const k = keyOf(id, variant);
    const line = state.cart.find((l) => l.key === k);
    const inCart = state.cart.filter((l) => l.id === id).reduce((s, l) => s + l.qty, 0);
    if (inCart + qty > p.stock) return { ok: false, msg: p.stock > 0 ? `Só temos ${p.stock} em estoque` : 'Produto esgotado' };
    if (line) line.qty += qty;
    else state.cart.push({ key: k, id, variant, qty });
    saveCart();
    return { ok: true };
  }
  function setQty(key, qty) {
    const l = state.cart.find((x) => x.key === key);
    if (!l) return;
    const p = product(l.id);
    const others = state.cart.filter((x) => x.id === l.id && x.key !== key).reduce((s, x) => s + x.qty, 0);
    l.qty = Math.max(1, Math.min(qty, (p?.stock ?? 99) - others));
    saveCart();
  }
  function removeFromCart(key) { state.cart = state.cart.filter((l) => l.key !== key); saveCart(); }
  function clearCart() { state.cart = []; state.coupon = null; LS.set('coupon', null); saveCart(); }
  function pruneCart() { state.cart = state.cart.filter((l) => product(l.id)); LS.set('cart', state.cart); }
  const cartCount = () => state.cart.reduce((s, l) => s + l.qty, 0);
  const cartLines = () => state.cart.map((l) => ({ ...l, product: product(l.id) })).filter((l) => l.product);

  /* ---------- Totais (espelham a regra do banco; o servidor recalcula) ---------- */
  function totals({ payment = 'pix', method = 'retirada', cep = '', gift = false } = {}) {
    const s = state.settings;
    const subtotal = cartLines().reduce((t, l) => t + l.product.price * l.qty, 0);
    let discount = 0;
    const c = state.coupon;
    if (c && subtotal >= Number(c.min_total || 0)) {
      discount = c.kind === 'percent' ? round2(subtotal * c.value / 100) : Math.min(Number(c.value), subtotal);
    }
    let shipping = 0;
    let shippingLabel = 'Grátis';
    if (method === 'local') {
      const free = subtotal - discount >= Number(s.freeShippingOver || 0);
      shipping = free ? 0 : Number(s.localDelivery || 0);
      shippingLabel = free ? 'Grátis' : brl(shipping);
    } else if (method === 'envio') {
      shippingLabel = 'A combinar';
    }
    const giftFee = gift ? Number(s.giftWrap || 0) : 0;
    const pixDiscount = payment === 'pix' ? round2((subtotal - discount) * (Number(s.pixDiscount) || 0) / 100) : 0;
    const total = subtotal - discount - pixDiscount + shipping + giftFee;
    return { subtotal, discount, shipping, shippingLabel, giftFee, pixDiscount, total, localOk: isLocalCep(cep) };
  }
  const round2 = (n) => Math.round(n * 100) / 100;
  function isLocalCep(cep) {
    const d = onlyDigits(cep);
    if (d.length !== 8) return false;
    const p5 = d.slice(0, 5);
    return p5 >= (state.settings.cepFrom || '44000') && p5 <= (state.settings.cepTo || '44130');
  }

  async function applyCoupon(code) {
    code = String(code || '').trim().toUpperCase();
    if (!code) { state.coupon = null; LS.set('coupon', null); emit(); return { ok: true }; }
    let c = null;
    if (state.online && sb) {
      const { data, error } = await sb.rpc('flora_check_coupon', { p_code: code });
      if (error) return { ok: false, msg: 'Não foi possível validar o cupom agora' };
      c = data;
    } else {
      c = FA.seed.coupons.find((x) => x.code === code && x.active) || null;
    }
    if (!c) return { ok: false, msg: 'Cupom inválido ou expirado' };
    state.coupon = c;
    LS.set('coupon', c);
    emit();
    const sub = totals().subtotal;
    if (sub < Number(c.min_total || 0)) return { ok: true, msg: `Cupom válido para compras a partir de ${brl(c.min_total)}` };
    return { ok: true, msg: `Cupom ${c.code} aplicado!` };
  }

  /* ---------- Privacidade: apaga tudo que o site guardou neste aparelho ---------- */
  function forgetMe() {
    ['cart', 'wish', 'orders', 'requests', 'customer', 'coupon', 'convite'].forEach((k) => {
      try { localStorage.removeItem('fa_' + k); } catch { /* modo privado */ }
    });
    Object.assign(state, { cart: [], wish: [], myOrders: [], myRequests: [], coupon: null });
    emit();
  }

  /* ---------- Favoritos ---------- */
  function toggleWish(id) {
    state.wish = state.wish.includes(id) ? state.wish.filter((x) => x !== id) : [...state.wish, id];
    LS.set('wish', state.wish);
    emit();
    return state.wish.includes(id);
  }

  /* ---------- Pedido ---------- */
  async function placeOrder(payload) {
    const items = cartLines().map((l) => ({ id: l.id, qty: l.qty, variant: l.variant, name: l.product.name }));
    const body = { ...payload, items, coupon: state.coupon?.code || '' };
    let order;
    if (state.online && sb) {
      const { data, error } = await sb.rpc('flora_place_order', { p: body });
      if (error) throw new Error(error.message);
      order = data;
    } else {
      // Offline: o pedido segue só pelo WhatsApp
      const t = totals({ payment: body.payment, method: body.delivery.method, cep: body.delivery.cep, gift: body.gift?.wrap });
      order = {
        id: 'WA' + Date.now().toString(36).toUpperCase(), created_at: new Date().toISOString(), offline: true,
        customer: body.customer, delivery: body.delivery, payment: body.payment, installments: body.installments || 1,
        items: cartLines().map((l) => ({ id: l.id, name: l.product.name, variant: l.variant, price: l.product.price, qty: l.qty })),
        subtotal: t.subtotal, discount: t.discount, coupon: state.coupon?.code || null, pix_discount: t.pixDiscount,
        shipping: t.shipping, gift: body.gift || {}, gift_fee: t.giftFee, total: t.total, status: 'novo', notes: body.notes || '',
      };
    }
    // atualiza estoque local para refletir a compra
    order.items.forEach((it) => { const p = product(it.id); if (p) p.stock = Math.max(0, p.stock - it.qty); });
    state.myOrders = [order, ...state.myOrders].slice(0, 30);
    LS.set('orders', state.myOrders);
    clearCart();
    return order;
  }

  async function refreshOrderStatus() {
    if (!state.online || !sb) return;
    await Promise.all(state.myOrders.filter((o) => !o.offline).map(async (o) => {
      const { data } = await sb.rpc('flora_order_status', { p_id: o.id, p_phone: o.customer?.phone || '' });
      if (data?.status) o.status = data.status;
    }));
    LS.set('orders', state.myOrders);
    emit();
  }

  /* ---------- Lembrancinhas (encomenda para eventos) ---------- */
  async function requestSouvenirs(payload) {
    let req;
    if (state.online && sb) {
      const { data, error } = await sb.rpc('flora_request_souvenirs', { p: payload });
      if (error) throw new Error(error.message);
      req = data;
    } else {
      const items = state.souvenirs.filter((s) => payload.items.includes(s.id));
      req = { id: 'WA' + Date.now().toString(36).toUpperCase(), offline: true, created_at: new Date().toISOString(), ...payload,
        items: items.map((s) => ({ id: s.id, name: s.name, price: s.price })),
        estimate: items.reduce((t, s) => t + Number(s.price), 0) * payload.qty, status: 'novo' };
    }
    state.myRequests = [req, ...state.myRequests].slice(0, 20);
    LS.set('requests', state.myRequests);
    return req;
  }

  /* ---------- WhatsApp ---------- */
  const PAY = { pix: 'Pix', cartao: 'Cartão de crédito', entrega: 'Na entrega ou retirada' };
  const SHIP = { retirada: 'Retirada combinada', local: 'Entrega em Feira de Santana', envio: 'Envio para outra cidade' };
  function waLink(text, phone) {
    const num = onlyDigits(phone || state.settings.whatsapp);
    const to = num ? (num.startsWith('55') ? num : '55' + num) : '';
    return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
  }
  function orderMessage(o) {
    const d = o.delivery || {};
    const g = o.gift || {};
    const lines = [
      `*Novo pedido ${o.id}* — ${state.settings.storeName}`,
      '',
      ...o.items.map((i) => `• ${i.qty}x ${i.name}${i.variant ? ` (${i.variant})` : ''} — ${brl(i.price * i.qty)}`),
      '',
      `Subtotal: ${brl(o.subtotal)}`,
      Number(o.discount) ? `Cupom ${o.coupon || ''}: -${brl(o.discount)}` : null,
      Number(o.pix_discount) ? `Desconto Pix: -${brl(o.pix_discount)}` : null,
      g.wrap ? `Embalagem para presente: ${brl(o.gift_fee)}` : null,
      `Entrega: ${SHIP[d.method] || d.method}${Number(o.shipping) ? ` (${brl(o.shipping)})` : ''}`,
      `*Total: ${brl(o.total)}*`,
      `Pagamento: ${PAY[o.payment]}${o.payment === 'cartao' && o.installments > 1 ? ` em ${o.installments}x` : ''}`,
      g.wrap ? '' : null,
      g.wrap ? `🎁 Presente${g.to ? ` para ${g.to}` : ''}${g.message ? ` — cartão: "${g.message}"` : ''}` : null,
      '',
      `Cliente: ${o.customer.name} · ${fmtPhone(o.customer.phone)}`,
      d.method !== 'retirada' && d.street ? `Endereço: ${d.street}, ${d.number}${d.complement ? ' - ' + d.complement : ''} — ${d.district}, ${d.city}/${d.uf} · CEP ${d.cep}` : null,
      o.notes ? `Obs: ${o.notes}` : null,
    ];
    return lines.filter((l) => l !== null).join('\n');
  }
  function requestMessage(r) {
    const day = new Date(r.event_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    return [
      `*Lembrancinhas ${r.id}* — ${state.settings.storeName}`,
      '',
      `Evento: ${r.event} · ${day}`,
      `Quantidade: ${r.qty} unidades de cada`,
      `Itens: ${r.items.map((s) => s.name).join(', ')}`,
      `Estimativa: ${brl(r.estimate)}`,
      r.aroma ? `Aroma: ${r.aroma}` : null,
      r.custom ? `Personalização: ${r.custom}` : null,
      r.notes ? `Obs: ${r.notes}` : null,
      '',
      `Cliente: ${r.name} · ${fmtPhone(r.phone)}`,
    ].filter((l) => l !== null).join('\n');
  }

  /* ---------- Pix copia-e-cola (BR Code / EMV) ---------- */
  function pixPayload(amount, txid = '***') {
    const s = state.settings;
    if (!s.pixKey) return '';
    const clean = (t, max) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, max);
    const fld = (id, v) => id + String(v.length).padStart(2, '0') + v;
    const mai = fld('00', 'br.gov.bcb.pix') + fld('01', String(s.pixKey).trim());
    let p = fld('00', '01') + fld('26', mai) + fld('52', '0000') + fld('53', '986')
      + (amount > 0 ? fld('54', amount.toFixed(2)) : '') + fld('58', 'BR')
      + fld('59', clean(s.pixName || s.storeName, 25)) + fld('60', clean(s.pixCity || 'FEIRA DE SANTANA', 15))
      + fld('62', fld('05', clean(txid, 25).replace(/ /g, '') || '***')) + '6304';
    let crc = 0xffff;
    for (let i = 0; i < p.length; i++) {
      crc ^= p.charCodeAt(i) << 8;
      for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
    return p + crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /* ---------- Painel ---------- */
  const admin = {
    async session() { if (!sb) return null; const { data } = await sb.auth.getSession(); return data.session; },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new Error(authError(error));
    },
    async signUp(email, password, name) {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { name, app: 'flora-alma' }, emailRedirectTo: location.origin + location.pathname },
      });
      if (error) throw new Error(authError(error));
      return data;
    },
    async checkInvite(code) { const { data } = await sb.rpc('flora_check_invite', { p_code: code }); return !!data; },
    async redeem(code) { const { error } = await sb.rpc('flora_redeem_invite', { p_code: code }); if (error) throw new Error(error.message); },
    async signOut() { await sb.auth.signOut(); },
    async isAdmin() { const { data } = await sb.rpc('flora_is_admin'); return !!data; },
    async bootstrap() { const { data, error } = await sb.rpc('flora_admin_bootstrap'); if (error) throw new Error(error.message); return data; },
    async call(fn, args) { const { data, error } = await sb.rpc(fn, args); if (error) throw new Error(error.message); return data; },
    async upload(file, id) {
      const blob = await resizeImage(file, 1200);
      const path = `${id}/${Date.now()}.webp`;
      const { error } = await sb.storage.from(FA.config.bucket).upload(path, blob, { contentType: 'image/webp', upsert: true });
      if (error) throw new Error(error.message);
      return sb.storage.from(FA.config.bucket).getPublicUrl(path).data.publicUrl;
    },
  };

  // Mensagens do Supabase Auth vêm em inglês
  function authError(e) {
    const m = String(e?.message || '');
    if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos';
    if (/email not confirmed/i.test(m)) return 'E-mail ainda não confirmado. Abra o link enviado para o seu e-mail.';
    if (/already registered|already exists/i.test(m)) return 'Este e-mail já tem conta. Use a página de entrada.';
    if (/password.*(at least|characters|short)/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres';
    if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    if (/invalid.*email|email.*invalid/i.test(m)) return 'Informe um e-mail válido';
    if (/signups? not allowed|disabled/i.test(m)) return 'Novos cadastros estão desativados no momento';
    return 'Não foi possível concluir. Tente novamente.';
  }

  function resizeImage(file, max) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k);
        c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao processar a imagem'))), 'image/webp', 0.85);
      };
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.src = URL.createObjectURL(file);
    });
  }

  return {
    sb, state, on, emit, load, LS,
    brl, onlyDigits, fmtPhone, product, pixPrice, installment, discountPct,
    addToCart, setQty, removeFromCart, clearCart, cartCount, cartLines, totals, isLocalCep, applyCoupon,
    toggleWish, forgetMe, placeOrder, refreshOrderStatus, requestSouvenirs,
    waLink, orderMessage, requestMessage, pixPayload, PAY, SHIP, admin,
  };
})();
