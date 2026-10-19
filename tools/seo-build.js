#!/usr/bin/env node
/* =========================================================
   Flora Alma — gerador de SEO
   Cria páginas estáticas indexáveis (produto, categoria,
   lembrancinhas, privacidade) com título, descrição, Open Graph
   e dados estruturados (schema.org), além de sitemap.xml e
   robots.txt. Cada página carrega a loja completa já na rota certa.

   Uso:  node tools/seo-build.js [--out _site]
   Monta o site completo (arquivos + páginas geradas) em _site,
   que é a pasta publicada no GitHub Pages.
   O catálogo vem do Supabase (função pública flora_bootstrap);
   sem internet, usa o catálogo de js/data.js.
   ========================================================= */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://sf-solucoestecnologicas.github.io/flora-alma/';
const outIdx = process.argv.indexOf('--out');
const OUT = path.resolve(outIdx > 0 ? process.argv[outIdx + 1] : path.join(ROOT, '_site'));
const TODAY = new Date().toISOString().slice(0, 10);

// data.js e art.js rodam aqui também (só geram texto, não usam o DOM)
const ctx = {};
ctx.window = ctx;
vm.createContext(ctx);
['js/data.js', 'js/art.js'].forEach((f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx));
const FA = ctx.FA;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (n) => 'R$ ' + Number(n || 0).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const json = (o) => JSON.stringify(o).replace(/</g, '\\u003c');
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };

async function catalog() {
  try {
    const r = await fetch(`${FA.config.supabaseUrl}/rest/v1/rpc/flora_bootstrap`, {
      method: 'POST',
      headers: { apikey: FA.config.supabaseKey, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    if (!Array.isArray(d.products) || !d.products.length) throw new Error('catálogo vazio');
    console.log(`catálogo do Supabase: ${d.products.length} produtos`);
    return { products: d.products, souvenirs: d.souvenirs || [], settings: { ...FA.seed.settings, ...(d.settings || {}) } };
  } catch (e) {
    console.warn('Supabase indisponível (' + e.message + '), usando js/data.js');
    return { products: FA.seed.products, souvenirs: FA.seed.souvenirs, settings: FA.seed.settings };
  }
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

function write(rel, content) {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
}

(async () => {
  const { products, souvenirs, settings: s } = await catalog();
  const active = products.filter((p) => p.active !== false);
  const catOf = (id) => FA.categories.find((c) => c.id === id) || { id, name: id, tagline: '' };
  const phone = String(s.whatsapp || '').replace(/\D/g, '');

  if (OUT === ROOT) throw new Error('Use uma pasta de saída separada (ex.: --out _site)');
  fs.mkdirSync(OUT, { recursive: true });
  for (const e of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, e), { recursive: true, force: true });
  for (const f of ['index.html', '404.html', 'manifest.webmanifest', '.nojekyll']) {
    if (fs.existsSync(path.join(ROOT, f))) fs.copyFileSync(path.join(ROOT, f), path.join(OUT, f));
  }
  for (const d of ['css', 'js', 'assets']) copyDir(path.join(ROOT, d), path.join(OUT, d));

  /* ---------- dados estruturados da loja ---------- */
  const store = {
    '@type': 'Store',
    '@id': BASE + '#loja',
    name: s.storeName || 'Flora Alma',
    description: 'Sabonetes artesanais, velas aromáticas, kits de presente e lembrancinhas personalizadas feitos à mão.',
    slogan: 'Autocuidado que abraça',
    url: BASE,
    logo: BASE + 'assets/icon-512.png',
    image: BASE + 'assets/og.jpg',
    ...(phone ? { telephone: '+55' + phone.replace(/^55/, '') } : {}),
    priceRange: (() => {
      const ps = active.map((p) => Number(p.price)).filter(Boolean);
      return ps.length ? `${brl(Math.min(...ps))} – ${brl(Math.max(...ps))}` : '$$';
    })(),
    currenciesAccepted: 'BRL',
    paymentAccepted: 'Pix, cartão de crédito, dinheiro',
    address: { '@type': 'PostalAddress', addressLocality: 'Feira de Santana', addressRegion: 'BA', addressCountry: 'BR' },
    areaServed: { '@type': 'City', name: 'Feira de Santana' },
    sameAs: [`https://www.instagram.com/${s.instagram || 'floraalmaartesanal'}/`],
  };
  const site = { '@type': 'WebSite', '@id': BASE + '#site', url: BASE, name: 'Flora Alma', inLanguage: 'pt-BR', publisher: { '@id': BASE + '#loja' } };
  const ld = (graph) => `<script type="application/ld+json" id="ld-site">${json({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
  const crumbs = (list) => ({
    '@type': 'BreadcrumbList',
    itemListElement: list.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })),
  });

  /* ---------- modelo: o próprio index.html ---------- */
  const tpl = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const setAttr = (html, sel, value) => html.replace(new RegExp(`(<meta ${sel} content=")[^"]*(")`), `$1${esc(value)}$2`);
  function page({ rel, depth, title, desc, image, route, graph, main }) {
    const url = BASE + rel;
    let h = tpl;
    h = h.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n  <base href="${'../'.repeat(depth)}" />`);
    h = h.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
    h = setAttr(h, 'name="description"', desc);
    h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
    h = setAttr(h, 'property="og:url"', url);
    h = setAttr(h, 'property="og:title"', title);
    h = setAttr(h, 'property="og:description"', desc);
    h = setAttr(h, 'name="twitter:title"', title);
    h = setAttr(h, 'name="twitter:description"', desc);
    if (image) { h = setAttr(h, 'property="og:image"', image); h = setAttr(h, 'name="twitter:image"', image); }
    h = h.replace(/<script type="application\/ld\+json" id="ld-site">[\s\S]*?<\/script>/, ld(graph));
    h = h.replace(/<main id="app" tabindex="-1">[\s\S]*?<\/main>/, `<main id="app" tabindex="-1">${main}</main>`);
    h = h.replace('<body>', `<body data-route="${esc(route)}">`);
    write(rel + 'index.html', h);
  }

  /* ---------- home (atualiza o JSON-LD do index.html) ---------- */
  const home = tpl.replace(/<script type="application\/ld\+json" id="ld-site">[\s\S]*?<\/script>/, ld([store, site]));
  write('index.html', home);

  /* ---------- produtos ---------- */
  const artFile = (p) => `assets/produtos/${p.id}.svg`;
  for (const p of active) {
    if (!p.image) write(artFile(p), FA.art.render(p.art || {}, { label: p.name }));
  }
  const cardHtml = (p) => `<li><a href="produto/${esc(p.id)}/"><b>${esc(p.name)}</b> <span>${esc(p.notes || p.sub)}</span> <em>${brl(p.price)}</em></a></li>`;

  for (const p of active) {
    const c = catOf(p.cat);
    const rel = `produto/${p.id}/`;
    const url = BASE + rel;
    const img = p.image && /^https:\/\//.test(p.image) ? p.image : BASE + artFile(p);
    const desc = clip(`${p.name}${p.notes ? ` · ${p.notes}` : ''}. ${p.description} Feito à mão em Feira de Santana - BA.`, 158);
    const product = {
      '@type': 'Product',
      '@id': url + '#produto',
      name: p.name,
      description: p.description,
      sku: p.id,
      image: [img],
      category: c.name,
      brand: { '@type': 'Brand', name: 'Flora Alma' },
      ...(p.specs?.length ? { additionalProperty: p.specs.map(([k, v]) => ({ '@type': 'PropertyValue', name: k, value: v })) } : {}),
      offers: {
        '@type': 'Offer',
        url,
        priceCurrency: 'BRL',
        price: Number(p.price).toFixed(2),
        availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@id': BASE + '#loja' },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BR', addressRegion: 'BA' },
          shippingRate: { '@type': 'MonetaryAmount', value: Number(s.localDelivery || 0).toFixed(2), currency: 'BRL' },
        },
      },
    };
    const related = active.filter((x) => x.id !== p.id && x.cat === p.cat).slice(0, 6);
    const main = `<section class="wrap pdp ssr">
      <nav class="crumbs"><a href="./">Início</a> / <a href="loja/${esc(c.id)}/">${esc(c.name)}</a> / <span>${esc(p.name)}</span></nav>
      <div class="pdp__grid">
        <div class="pdp__media" style="--bg:${FA.art.bg(p.art)}">${FA.art.media(p)}</div>
        <div class="pdp__info">
          <span class="pcard__meta">${esc(p.sub)}${p.aroma && p.aroma !== 'Vários' ? ' · ' + esc(p.aroma) : ''}</span>
          <h1 class="pdp__title">${esc(p.name)}</h1>
          ${p.notes ? `<p class="pdp__notes"><em>${esc(p.notes)}</em></p>` : ''}
          <div class="price price--big">${p.old_price > p.price ? `<s>${brl(p.old_price)}</s>` : ''}<b>${brl(p.price)}</b></div>
          ${p.options?.length ? `<p><b>${esc(p.opt_label || 'Aroma')}:</b> ${p.options.map(esc).join(', ')}</p>` : ''}
          <p>${esc(p.description)}</p>
          ${p.specs?.length ? `<dl class="specs">${p.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
          <p><a class="btn btn--dark" href="#/produto/${esc(p.id)}">Comprar</a></p>
        </div>
      </div>
      ${related.length ? `<h2 class="h3">Mais ${esc(c.name.toLowerCase())}</h2><ul class="ssr__list">${related.map(cardHtml).join('')}</ul>` : ''}
    </section>`;
    page({
      rel, depth: 2, route: `#/produto/${p.id}`, main,
      title: `${p.name} | ${c.name} artesanais | Flora Alma`,
      desc, image: p.image && /^https:\/\//.test(p.image) ? p.image : null,
      graph: [store, product, crumbs([['Início', BASE], [c.name, `${BASE}loja/${c.id}/`], [p.name, url]])],
    });
  }

  /* ---------- categorias ---------- */
  const listPage = (rel, depth, route, name, intro, list, title) => {
    const url = BASE + rel;
    page({
      rel, depth, route, title,
      desc: clip(`${intro} ${list.slice(0, 4).map((p) => p.name).join(', ')}.`, 158),
      graph: [store, {
        '@type': 'CollectionPage', '@id': url, url, name, description: intro, isPartOf: { '@id': BASE + '#site' },
        mainEntity: { '@type': 'ItemList', itemListElement: list.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${BASE}produto/${p.id}/`, name: p.name })) },
      }, crumbs(rel === 'loja/' ? [['Início', BASE], ['Loja', url]] : [['Início', BASE], ['Loja', BASE + 'loja/'], [name, url]])],
      main: `<section class="wrap ssr"><nav class="crumbs"><a href="./">Início</a> / <a href="loja/">Loja</a></nav><h1 class="h1">${esc(name)}</h1><p class="lead">${esc(intro)}</p>
        <ul class="ssr__list">${list.map(cardHtml).join('')}</ul>
        <nav class="ssr__cats">${FA.categories.map((c) => `<a href="loja/${c.id}/">${esc(c.name)}</a>`).join(' · ')}</nav></section>`,
    });
  };
  listPage('loja/', 1, '#/loja', 'Todos os produtos', 'Sabonetes artesanais, velas aromáticas, kits de presente e mimos para a casa, feitos à mão em Feira de Santana - BA.', active, 'Loja | Sabonetes artesanais e velas aromáticas | Flora Alma');
  for (const c of FA.categories) {
    const list = active.filter((p) => p.cat === c.id);
    if (!list.length) continue;
    listPage(`loja/${c.id}/`, 2, `#/loja/${c.id}`, c.name, `${c.name} da Flora Alma: ${c.tagline.toLowerCase()}. Feitos à mão em Feira de Santana - BA.`, list, `${c.name} artesanais em Feira de Santana | Flora Alma`);
  }

  /* ---------- lembrancinhas e privacidade ---------- */
  page({
    rel: 'lembrancinhas/', depth: 1, route: '#/lembrancinhas',
    title: 'Lembrancinhas personalizadas para casamento e eventos | Flora Alma',
    desc: 'Mini sabonetes, mini velas e sachês personalizados com nome, cores e aroma da sua festa: casamento, maternidade, chá de bebê e eventos em Feira de Santana.',
    graph: [store, {
      '@type': 'Service', '@id': BASE + 'lembrancinhas/#servico', name: 'Lembrancinhas personalizadas', provider: { '@id': BASE + '#loja' },
      areaServed: { '@type': 'City', name: 'Feira de Santana' }, serviceType: 'Lembrancinhas artesanais para eventos',
      offers: souvenirs.map((v) => ({ '@type': 'Offer', name: v.name, description: v.description, priceCurrency: 'BRL', price: Number(v.price).toFixed(2) })),
    }, crumbs([['Início', BASE], ['Lembrancinhas', BASE + 'lembrancinhas/']])],
    main: `<section class="wrap ssr"><h1 class="h1">Lembranças que perfumam a memória</h1>
      <p class="lead">Mimos artesanais com o nome, as cores e o aroma do seu evento: casamento, maternidade, chá de bebê, aniversário, batizado, formatura ou evento da empresa.</p>
      <ul class="ssr__list">${souvenirs.map((v) => `<li><b>${esc(v.name)}</b> <span>${esc(v.description)}</span> <em>${brl(v.price)} por unidade · mínimo ${v.min_qty}</em></li>`).join('')}</ul>
      <p><a class="btn btn--dark" href="#/lembrancinhas">Pedir orçamento</a></p></section>`,
  });
  page({
    rel: 'privacidade/', depth: 1, route: '#/privacidade',
    title: 'Política de privacidade | Flora Alma',
    desc: 'Como a Flora Alma cuida dos seus dados: o que coletamos, para que usamos e como pedir a exclusão (LGPD).',
    graph: [store, crumbs([['Início', BASE], ['Privacidade', BASE + 'privacidade/']])],
    main: '<section class="wrap ssr"><h1 class="h1">Política de privacidade</h1><p class="lead">Como cuidamos dos seus dados, do jeito mais simples possível.</p></section>',
  });

  /* ---------- sitemap e robots ---------- */
  const urls = [
    [BASE, '1.0', 'daily'], [BASE + 'loja/', '0.9', 'daily'],
    ...FA.categories.filter((c) => active.some((p) => p.cat === c.id)).map((c) => [`${BASE}loja/${c.id}/`, '0.8', 'weekly']),
    ...active.map((p) => [`${BASE}produto/${p.id}/`, '0.8', 'weekly']),
    [BASE + 'lembrancinhas/', '0.8', 'monthly'], [BASE + 'privacidade/', '0.2', 'yearly'],
  ];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, pr, ch]) => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod><changefreq>${ch}</changefreq><priority>${pr}</priority></url>`).join('\n')}\n</urlset>\n`);
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${BASE}sitemap.xml\n`);

  console.log(`SEO pronto em ${path.relative(process.cwd(), OUT) || '.'}: ${active.length} produtos, ${FA.categories.length} categorias, ${urls.length} URLs no sitemap`);
})();
