/* =========================================================
   Flora Alma — ilustrações SVG geradas por código
   FA.art.render(artSpec, opts) → string <svg>
   kind: soap | soapround | jar | tin | cup | box | tube |
         spray | bottle | diffuser | sachet
   color = corpo (barra, vidro, caixa, frasco…) · accent = detalhes
   (rótulo, laço, tampa, pontinhos) · wax = cera ou líquido
   deco (sabonetes): buds | herbs | oats | coffee | specks | petals | swirl
   ========================================================= */
window.FA = window.FA || {};
FA.art = (() => {
  const COCOA = '#4a2c21';
  const SAND = '#d8b48c';
  const CREAM = '#fbf7f0';
  const WICK = '#3b2a20';
  let uid = 0;
  const f = (n) => Math.round(n * 10) / 10;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // clareia (amt > 0) ou escurece (amt < 0) uma cor hex
  function shade(hex, amt) {
    let h = String(hex || '#cccccc').replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h.slice(0, 6), 16);
    if (Number.isNaN(n)) return hex;
    const t = amt < 0 ? 0 : 255;
    const p = Math.abs(amt);
    const ch = (v) => Math.round((t - v) * p + v);
    const [r, g, b] = [ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)];
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  // aleatório determinístico: a mesma arte sai sempre igual
  const hash = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  }

  const shadow = (cx, cy, rx) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${f(rx * 0.11)}" fill="${COCOA}" opacity=".14"/>`;
  const word = (x, y, size, fill, extra = '') =>
    `<text x="${x}" y="${y}" font-family="Quicksand, 'DM Sans', sans-serif" font-weight="600" font-size="${size}" letter-spacing="${f(size * 0.06)}" text-anchor="middle" fill="${fill}" ${extra}>flora alma</text>`;
  const small = (x, y, txt, fill, size = 5.6) =>
    txt ? `<text x="${x}" y="${y}" font-family="'DM Sans', sans-serif" font-weight="700" font-size="${size}" letter-spacing="1.3" text-anchor="middle" fill="${fill}">${esc(String(txt).toUpperCase().slice(0, 16))}</text>` : '';

  function defs(id) {
    return `<defs>
      <radialGradient id="${id}-glow"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".8"/><stop offset=".45" stop-color="#ffb85c" stop-opacity=".28"/><stop offset="1" stop-color="#ffb85c" stop-opacity="0"/></radialGradient>
      <linearGradient id="${id}-shine" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
      <linearGradient id="${id}-metal" x1="0" x2="1"><stop offset="0" stop-color="#e9e3db"/><stop offset=".35" stop-color="#cfc6bb"/><stop offset="1" stop-color="#a59b8f"/></linearGradient>
    </defs>`;
  }

  /* ---------- Chama (acende com CSS) ---------- */
  function flame(id, x, y, s = 1, lit = true) {
    const wick = `<line x1="${x}" y1="${y}" x2="${x}" y2="${f(y + 8 * s)}" stroke="${WICK}" stroke-width="${f(2 * s)}" stroke-linecap="round"/>`;
    if (!lit) return wick;
    return `<g class="lit">
      <circle class="glow" cx="${x}" cy="${f(y - 9 * s)}" r="${f(30 * s)}" fill="url(#${id}-glow)"/>
      ${wick}
      <g class="flame"><path d="M${x} ${f(y + 1)} C ${f(x - 8 * s)} ${f(y - 5 * s)} ${f(x - 6 * s)} ${f(y - 17 * s)} ${x} ${f(y - 28 * s)} C ${f(x + 6 * s)} ${f(y - 17 * s)} ${f(x + 8 * s)} ${f(y - 5 * s)} ${x} ${f(y + 1)}Z" fill="#f4a43c"/>
      <path d="M${x} ${f(y - 1)} C ${f(x - 3.6 * s)} ${f(y - 4 * s)} ${f(x - 3.2 * s)} ${f(y - 11 * s)} ${x} ${f(y - 17 * s)} C ${f(x + 3.2 * s)} ${f(y - 11 * s)} ${f(x + 3.6 * s)} ${f(y - 4 * s)} ${x} ${f(y - 1)}Z" fill="#fff4cf"/></g>
    </g>`;
  }

  /* ---------- Raminho de lavanda (enfeite) ---------- */
  function sprig(x, y, rot = 0, sc = 1, color = '#8a72b4') {
    let buds = '';
    for (let i = 0; i < 9; i++) {
      const yy = -38 - i * 6.2;
      const side = i % 2 ? 1 : -1;
      buds += `<ellipse cx="${f(side * 2.6)}" cy="${f(yy)}" rx="2.6" ry="4.2" transform="rotate(${side * 24} ${f(side * 2.6)} ${f(yy)})" fill="${i % 3 ? color : shade(color, -0.15)}"/>`;
    }
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})">
      <path d="M0 0 C 1 -30 -1 -60 0 -94" stroke="#6f8a5f" stroke-width="2" fill="none" stroke-linecap="round"/>
      <path d="M0 -20 C 8 -26 12 -34 10 -42 C 4 -36 1 -30 0 -20Z" fill="#87a174"/>
      ${buds}
    </g>`;
  }

  /* ---------- Textura dos sabonetes ---------- */
  function flecks(a, box, clipId) {
    const c = a.color || '#e9d8c4';
    const d = a.accent || shade(c, -0.35);
    const r = rng(hash(`${a.deco}|${c}|${d}`));
    const [x0, y0, w, h] = box;
    const stamp = (x, y) => x > box[4] && x < box[5] && y > box[6] && y < box[7];
    let s = '';
    if (a.deco === 'swirl') {
      s = `<path d="M${x0 - 10} ${y0 + h * 0.62} C ${x0 + w * 0.25} ${y0 + h * 0.2} ${x0 + w * 0.45} ${y0 + h * 1.05} ${x0 + w * 0.7} ${y0 + h * 0.45} S ${x0 + w + 10} ${y0 + h * 0.3} ${x0 + w + 14} ${y0 + h * 0.55}" stroke="${d}" stroke-width="9" fill="none" opacity=".32" stroke-linecap="round"/>
        <path d="M${x0 - 6} ${y0 + h * 0.85} C ${x0 + w * 0.3} ${y0 + h * 0.5} ${x0 + w * 0.55} ${y0 + h * 1.15} ${x0 + w + 8} ${y0 + h * 0.7}" stroke="${shade(c, 0.45)}" stroke-width="4" fill="none" opacity=".55" stroke-linecap="round"/>`;
      return `<g clip-path="url(#${clipId})">${s}</g>`;
    }
    const n = { buds: 26, herbs: 34, oats: 16, coffee: 46, specks: 40, petals: 14 }[a.deco] || 0;
    for (let i = 0; i < n; i++) {
      const x = f(x0 + r() * w);
      const y = f(y0 + r() * h);
      if (stamp(x, y)) continue;
      const rot = Math.round(r() * 180);
      if (a.deco === 'buds') s += `<ellipse cx="${x}" cy="${y}" rx="1.7" ry="2.8" transform="rotate(${rot} ${x} ${y})" fill="${d}" opacity=".85"/>`;
      else if (a.deco === 'herbs') s += `<ellipse cx="${x}" cy="${y}" rx="2.6" ry=".9" transform="rotate(${rot} ${x} ${y})" fill="${d}" opacity=".8"/>`;
      else if (a.deco === 'oats') s += `<ellipse cx="${x}" cy="${y}" rx="3.4" ry="1.8" transform="rotate(${rot} ${x} ${y})" fill="${shade(c, 0.35)}" stroke="${d}" stroke-width=".6" opacity=".95"/>`;
      else if (a.deco === 'coffee') s += `<circle cx="${x}" cy="${y}" r="${f(0.7 + r() * 1.3)}" fill="${d}" opacity=".85"/>`;
      else if (a.deco === 'specks') s += `<circle cx="${x}" cy="${y}" r="${f(0.5 + r() * 1)}" fill="${d}" opacity=".7"/>`;
      else if (a.deco === 'petals') s += `<ellipse cx="${x}" cy="${y}" rx="3.6" ry="2.2" transform="rotate(${rot} ${x} ${y})" fill="${d}" opacity=".7"/>`;
    }
    return `<g clip-path="url(#${clipId})">${s}</g>`;
  }

  /* =========================================================
     Peças
     ========================================================= */
  const shapes = {
    soap(a, id) {
      const c = a.color || '#e9d8c4';
      return `${shadow(100, 150, 72)}
        <clipPath id="${id}-c"><rect x="34" y="58" width="132" height="88" rx="22"/></clipPath>
        <rect x="34" y="58" width="132" height="88" rx="22" fill="${shade(c, -0.18)}"/>
        <rect x="34" y="58" width="132" height="66" rx="22" fill="${c}"/>
        ${flecks(a, [34, 58, 132, 88, 58, 142, 72, 112], `${id}-c`)}
        <rect x="40" y="63" width="120" height="56" rx="18" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="1.5"/>
        <rect x="62" y="76" width="76" height="30" rx="15" fill="${shade(c, -0.06)}" stroke="${shade(c, -0.22)}" stroke-width="1.3" stroke-opacity=".7"/>
        ${word(100, 95.5, 11, shade(c, -0.42), 'opacity=".75"')}`;
    },

    soapround(a, id) {
      const c = a.color || '#a9c49a';
      return `${shadow(100, 140, 70)}
        <clipPath id="${id}-c"><ellipse cx="100" cy="98" rx="64" ry="27"/></clipPath>
        <path d="M36 98 v24 a64 27 0 0 0 128 0 v-24 Z" fill="${shade(c, -0.2)}"/>
        <ellipse cx="100" cy="98" rx="64" ry="27" fill="${c}"/>
        ${flecks(a, [36, 71, 128, 54, 62, 138, 86, 110], `${id}-c`)}
        <ellipse cx="100" cy="98" rx="34" ry="12.5" fill="${shade(c, -0.05)}" stroke="${shade(c, -0.25)}" stroke-width="1.3" stroke-opacity=".7"/>
        ${word(100, 101, 10, shade(c, -0.45), 'opacity=".75"')}`;
    },

    jar(a, id, o) {
      const glass = a.color || '#dfe7ea';
      const wax = a.wax || '#f4e9d6';
      const lab = a.accent || COCOA;
      const labTxt = lum(lab) < 0.5 ? SAND : COCOA;
      return `${shadow(100, 170, 54)}
        <rect x="58" y="70" width="84" height="96" rx="10" fill="${wax}"/>
        <ellipse cx="100" cy="72" rx="42" ry="7" fill="${shade(wax, 0.4)}"/>
        <rect x="54" y="58" width="92" height="110" rx="14" fill="${glass}" fill-opacity="${lum(glass) < 0.6 ? 0.5 : 0.32}" stroke="${shade(glass, -0.3)}" stroke-opacity=".45" stroke-width="1.5"/>
        <rect x="54" y="58" width="92" height="110" rx="14" fill="url(#${id}-shine)"/>
        <ellipse cx="100" cy="59" rx="45" ry="6.5" fill="none" stroke="${shade(glass, -0.25)}" stroke-opacity=".55" stroke-width="2"/>
        <rect x="54" y="104" width="92" height="38" fill="${lab}"/>
        ${word(100, 121, 11, labTxt)}
        ${small(100, 133, a.label, labTxt, 5.4)}
        <rect x="62" y="66" width="7" height="94" rx="3.5" fill="#fff" opacity=".38"/>
        ${flame(id, 100, 64, 1, o.lit)}`;
    },

    tin(a, id, o) {
      const wax = a.wax || '#f4ead8';
      const lab = a.accent || COCOA;
      const labTxt = lum(lab) < 0.5 ? SAND : COCOA;
      return `${shadow(98, 160, 60)}
        <circle cx="144" cy="88" r="33" fill="url(#${id}-metal)" stroke="#9c9286" stroke-width="1.2"/>
        <circle cx="144" cy="88" r="25.5" fill="${lab}"/>
        ${word(144, 87, 8.4, labTxt)}
        ${small(144, 96, a.label || 'vela', labTxt, 4.4)}
        <path d="M46 114 v34 q0 10 10 10 h76 q10 0 10 -10 v-34 Z" fill="url(#${id}-metal)"/>
        <ellipse cx="94" cy="114" rx="48" ry="10.5" fill="#e4ddd3" stroke="#a59b8f" stroke-width="1.2"/>
        <ellipse cx="94" cy="115" rx="41" ry="7.6" fill="${wax}"/>
        <rect x="52" y="122" width="6" height="30" rx="3" fill="#fff" opacity=".4"/>
        ${flame(id, 94, 106, 0.85, o.lit)}`;
    },

    cup(a, id, o) {
      const c = a.color || '#ead9c6';
      const wax = a.wax || '#fbf4e8';
      const d = a.accent || '#a86b4f';
      let dots = '';
      for (let i = 0; i < 7; i++) dots += `<circle cx="${62 + i * 12.6}" cy="${118 + (i % 2) * 5}" r="2.4" fill="${d}" opacity=".85"/>`;
      return `${shadow(100, 166, 70)}
        <ellipse cx="100" cy="158" rx="66" ry="12" fill="${shade(c, -0.14)}"/>
        <ellipse cx="100" cy="155" rx="58" ry="9" fill="${c}"/>
        <path d="M148 98 c24 -2 26 38 -6 40" stroke="${shade(c, -0.06)}" stroke-width="9" fill="none" stroke-linecap="round"/>
        <path d="M48 88 h104 v8 c0 36 -20 56 -52 56 c-32 0 -52 -20 -52 -56 Z" fill="${c}"/>
        <path d="M48 88 h104 v8 c0 36 -20 56 -52 56 c-32 0 -52 -20 -52 -56 Z" fill="url(#${id}-shine)"/>
        <path d="M54 112 q46 14 92 0" stroke="${d}" stroke-width="2" fill="none" opacity=".6"/>
        ${dots}
        <ellipse cx="100" cy="88" rx="52" ry="9.5" fill="${shade(c, -0.16)}"/>
        <ellipse cx="100" cy="89" rx="45" ry="7.4" fill="${wax}"/>
        ${flame(id, 100, 80, 0.95, o.lit)}`;
    },

    box(a) {
      const c = a.color || COCOA;
      const r = a.accent || SAND;
      const tagTxt = COCOA;
      return `${shadow(100, 162, 70)}
        ${sprig(120, 84, 28, 0.62)}
        <rect x="38" y="96" width="124" height="62" rx="6" fill="${c}"/>
        <rect x="38" y="96" width="124" height="12" fill="${shade(c, -0.22)}"/>
        <rect x="32" y="78" width="136" height="24" rx="6" fill="${shade(c, 0.08)}"/>
        <rect x="92" y="78" width="16" height="80" fill="${r}"/>
        <rect x="92" y="78" width="16" height="24" fill="${shade(r, 0.12)}"/>
        <path d="M100 79 C 84 56 60 62 72 78 C 78 84 92 82 100 79Z" fill="${r}"/>
        <path d="M100 79 C 116 56 140 62 128 78 C 122 84 108 82 100 79Z" fill="${shade(r, -0.08)}"/>
        <path d="M97 82 l-12 22 l7 -3 l3 7 l6 -24Z" fill="${shade(r, -0.12)}"/>
        <path d="M103 82 l12 22 l-7 -3 l-3 7 l-6 -24Z" fill="${shade(r, -0.18)}"/>
        <rect x="94" y="73" width="12" height="11" rx="4" fill="${shade(r, -0.05)}"/>
        <path d="M104 84 Q 122 98 128 112" stroke="${shade(r, -0.3)}" stroke-width="1" fill="none"/>
        <g transform="rotate(14 136 122)"><rect x="118" y="110" width="38" height="22" rx="3" fill="${CREAM}" stroke="${shade(c, -0.1)}" stroke-width=".6"/><circle cx="123" cy="121" r="1.8" fill="${shade(c, -0.1)}"/>${word(140, 123.5, 6.4, tagTxt)}</g>`;
    },

    tube(a) {
      const c = a.color || '#f6efe4';
      const d = a.accent || '#7a64a0';
      let crimp = '';
      for (let i = 0; i < 9; i++) crimp += `<line x1="${75 + i * 6.2}" y1="36" x2="${75 + i * 6.2}" y2="46" stroke="${shade(c, -0.25)}" stroke-width=".8"/>`;
      return `${shadow(100, 172, 50)}
        <g transform="rotate(-14 100 104)">
          <rect x="70" y="32" width="60" height="16" rx="2" fill="${shade(c, -0.08)}"/>${crimp}
          <path d="M70 48 H130 L123 146 Q100 151 77 146 Z" fill="${c}" stroke="${shade(c, -0.18)}" stroke-width="1"/>
          <path d="M76 52 L80 140" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".5"/>
          <path d="M120 52 L116 140" stroke="${shade(c, -0.12)}" stroke-width="5" stroke-linecap="round" opacity=".5"/>
          ${word(100, 92, 11, d)}
          ${small(100, 104, a.label, shade(d, -0.15), 5.2)}
          <path d="M100 134 c-8 -8 -8 -16 0 -22 c8 6 8 14 0 22z" fill="${shade(d, 0.35)}" opacity=".7"/>
          <rect x="80" y="146" width="40" height="26" rx="5" fill="${d}"/>
          <rect x="80" y="146" width="40" height="5" fill="${shade(d, -0.2)}"/>
          <rect x="84" y="152" width="4" height="16" rx="2" fill="#fff" opacity=".25"/>
        </g>`;
    },

    spray(a) {
      const c = a.color || '#a8642a';
      const lab = a.accent || CREAM;
      let mist = '';
      [[70, 46, 2.4], [62, 42, 1.8], [58, 52, 2.2], [52, 46, 1.4], [48, 56, 1.6], [64, 56, 1.4]].forEach(([x, y, r], i) => {
        mist += `<circle class="mist" style="animation-delay:${i * 0.22}s" cx="${x}" cy="${y}" r="${r}" fill="${SAND}"/>`;
      });
      return `${shadow(100, 170, 46)}
        <g class="mists">${mist}</g>
        <rect x="66" y="74" width="68" height="94" rx="18" fill="${c}" fill-opacity=".92"/>
        <rect x="88" y="64" width="24" height="12" rx="2" fill="${shade(c, -0.25)}"/>
        <rect x="84" y="58" width="32" height="10" rx="3" fill="#2f2a28"/>
        <rect x="89" y="40" width="22" height="20" rx="5" fill="#3a3532"/>
        <rect x="76" y="46" width="15" height="6" rx="2" fill="#3a3532"/>
        <rect x="72" y="104" width="56" height="44" rx="4" fill="${lab}"/>
        ${word(100, 123, 9, COCOA)}
        ${small(100, 134, a.label, shade(COCOA, 0.25), 4.8)}
        <rect x="72" y="82" width="6" height="78" rx="3" fill="#fff" opacity=".3"/>`;
    },

    bottle(a) {
      const glass = a.color || '#dfe9ee';
      const liq = a.wax || '#f3f7fa';
      const cap = a.accent || SAND;
      return `${shadow(100, 170, 40)}
        <rect x="80" y="74" width="40" height="92" rx="9" fill="${liq}"/>
        <rect x="74" y="64" width="52" height="104" rx="12" fill="${glass}" fill-opacity=".45" stroke="${shade(glass, -0.3)}" stroke-opacity=".5" stroke-width="1.5"/>
        <rect x="90" y="52" width="20" height="14" rx="2" fill="#e8e2da" stroke="#bdb3a6" stroke-width=".8"/>
        <rect x="86" y="28" width="28" height="26" rx="5" fill="${cap}"/>
        <rect x="90" y="32" width="4" height="18" rx="2" fill="#fff" opacity=".3"/>
        <rect x="78" y="104" width="44" height="40" rx="3" fill="${CREAM}" stroke="${shade(cap, -0.1)}" stroke-width=".8"/>
        ${word(100, 122, 7.6, COCOA)}
        ${small(100, 133, a.label, shade(COCOA, 0.25), 4.4)}
        <rect x="79" y="70" width="5" height="88" rx="2.5" fill="#fff" opacity=".45"/>`;
    },

    diffuser(a) {
      const glass = a.color || '#d9e3dc';
      const liq = a.wax || '#e2c58f';
      const lab = a.accent || CREAM;
      const reeds = [[60, 22], [78, 12], [100, 8], [120, 14], [140, 26]].map(([x, y]) => `<line x1="100" y1="96" x2="${x}" y2="${y}" stroke="#6b4a35" stroke-width="2.4" stroke-linecap="round"/>`).join('');
      return `${shadow(100, 170, 50)}
        ${reeds}
        <path d="M62 122 Q62 102 86 100 H114 Q138 102 138 122 V158 Q138 168 128 168 H72 Q62 168 62 158 Z" fill="${glass}" fill-opacity=".5" stroke="${shade(glass, -0.3)}" stroke-opacity=".5" stroke-width="1.5"/>
        <path d="M66 132 H134 V156 Q134 164 126 164 H74 Q66 164 66 156 Z" fill="${liq}" opacity=".75"/>
        <rect x="88" y="88" width="24" height="14" rx="3" fill="#2f2a28"/>
        <rect x="74" y="128" width="52" height="26" rx="3" fill="${lab}"/>
        ${word(100, 141, 8, COCOA)}
        ${small(100, 150, a.label, shade(COCOA, 0.25), 4.4)}
        <rect x="70" y="108" width="6" height="50" rx="3" fill="#fff" opacity=".4"/>`;
    },

    sachet(a, id) {
      const c = a.color || '#ecdccb';
      const d = a.accent || '#b0574f';
      const r = rng(hash(c + d));
      let print = '';
      for (let i = 0; i < 12; i++) {
        const x = f(66 + r() * 68);
        const y = f(102 + r() * 54);
        const col = i % 2 ? d : '#7f9171';
        print += `<g opacity=".75">${[0, 72, 144, 216, 288].map((ang) => `<circle cx="${f(x + Math.cos(ang * Math.PI / 180) * 2.4)}" cy="${f(y + Math.sin(ang * Math.PI / 180) * 2.4)}" r="1.7" fill="${col}"/>`).join('')}<circle cx="${x}" cy="${y}" r="1.2" fill="${SAND}"/></g>`;
      }
      return `${shadow(100, 166, 50)}
        <clipPath id="${id}-c"><path d="M60 94 Q54 150 66 162 H134 Q146 150 140 94 Z"/></clipPath>
        <path d="M60 94 Q54 150 66 162 H134 Q146 150 140 94 Z" fill="${c}"/>
        <g clip-path="url(#${id}-c)">${print}<path d="M118 94 Q 130 130 128 162 H140 V94Z" fill="#000" opacity=".06"/></g>
        <path d="M64 94 Q 68 70 76 64 Q 84 76 92 62 Q 100 76 108 62 Q 116 76 124 64 Q 132 70 136 94 Z" fill="${shade(c, 0.1)}"/>
        <rect x="58" y="88" width="84" height="9" rx="4.5" fill="${d}"/>
        <path d="M100 92 C 86 76 70 84 82 94 Z" fill="${d}"/><path d="M100 92 C 114 76 130 84 118 94 Z" fill="${shade(d, -0.12)}"/>
        <path d="M98 94 l-8 18 M102 94 l8 18" stroke="${d}" stroke-width="3" stroke-linecap="round"/>
        <circle cx="100" cy="92" r="4" fill="${shade(d, -0.1)}"/>`;
    },
  };

  // luminância aproximada (0 escuro … 1 claro)
  function lum(hex) {
    const n = parseInt(String(hex || '#888888').replace('#', '').slice(0, 6), 16);
    if (Number.isNaN(n)) return 0.5;
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }

  // só cores hexadecimais e valores conhecidos entram no SVG (nada de texto livre em atributos)
  const HEX = /^#[0-9a-f]{3,8}$/i;
  const DECOS = ['buds', 'herbs', 'oats', 'coffee', 'specks', 'petals', 'swirl'];
  function clean(a = {}) {
    const o = { kind: shapes[a.kind] ? a.kind : 'soap' };
    ['color', 'accent', 'wax', 'bg'].forEach((k) => { if (HEX.test(a[k] || '')) o[k] = a[k]; });
    if (DECOS.includes(a.deco)) o.deco = a.deco;
    if (a.label) o.label = String(a.label).slice(0, 16);
    return o;
  }
  const bg = (a, d = '#efe5d7') => (HEX.test(a?.bg || '') ? a.bg : d);

  function render(raw = {}, opts = {}) {
    const a = clean(raw || {});
    const id = 'fa' + (++uid);
    const o = { lit: opts.lit !== false };
    return `<svg class="art art--${a.kind} ${opts.className || ''}" viewBox="0 0 200 200" role="img" aria-label="${esc(opts.label || '')}" xmlns="http://www.w3.org/2000/svg">${defs(id)}${shapes[a.kind](a, id, o)}</svg>`;
  }

  function media(p, opts = {}) {
    if (p.image && /^https:\/\//i.test(p.image)) return `<img class="art art--photo" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async"/>`;
    return render(p.art || {}, { ...opts, label: p.name });
  }

  // galho botânico em traço (decoração de fundo)
  function branch(color = SAND, sw = 1.6) {
    let leaves = '';
    const pts = [[40, 250, -40], [62, 215, 30], [78, 182, -35], [100, 150, 28], [116, 122, -30], [136, 92, 26], [150, 66, -24], [168, 40, 20]];
    pts.forEach(([x, y, r]) => {
      leaves += `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 0 C 10 -14 30 -16 44 -6 C 30 4 12 6 0 0Z" fill="none" stroke="${color}" stroke-width="${sw}"/><path d="M0 0 L 40 -6" stroke="${color}" stroke-width="${f(sw * 0.6)}"/></g>`;
    });
    return `<svg class="branch" viewBox="0 0 220 300" aria-hidden="true"><path d="M20 290 C 60 220 110 140 190 20" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/>${leaves}</svg>`;
  }

  // fumacinhas de aroma subindo
  function wisps(color = SAND) {
    const p = (x, d) => `<path class="wisp" style="animation-delay:${d}s" d="M${x} 150 c -14 -18 14 -30 0 -50 c -14 -18 14 -30 0 -50" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
    return `<svg class="wisps" viewBox="0 0 120 160" aria-hidden="true">${p(30, 0)}${p(60, 1.3)}${p(90, 2.6)}</svg>`;
  }

  function sprigSvg(color) {
    return `<svg class="sprig" viewBox="-30 -110 60 120" aria-hidden="true">${sprig(0, 0, 0, 1, color)}</svg>`;
  }

  return { render, media, branch, wisps, sprig: sprigSvg, shade, bg };
})();
