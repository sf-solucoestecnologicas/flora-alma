// Gera supabase/seed.sql a partir de js/data.js
// Uso: node supabase/gerar-seed.js
// O seed não sobrescreve nada que já exista (on conflict do nothing),
// então pode rodar de novo sem apagar o que foi editado no painel.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = {};
ctx.window = ctx; // data.js usa window.FA e FA como global
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8'), ctx);
const { seed } = ctx.FA;

const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (a) => `array[${a.map(q).join(',')}]::text[]`;

let sql = '-- Gerado por gerar-seed.js — não edite à mão\n\n';

sql += 'insert into flora.products (id, name, aroma, cat, sub, price, old_price, stock, options, opt_label, moods, notes, description, specs, art, featured, is_new, sort) values\n';
sql += seed.products.map((p) => `  (${[
  q(p.id), q(p.name), q(p.aroma), q(p.cat), q(p.sub), p.price, p.old_price ?? 'null', p.stock,
  arr(p.options || []), q(p.opt_label || 'Aroma'), arr(p.moods || []), q(p.notes || ''), q(p.description),
  j(p.specs || []), j(p.art || {}), !!p.featured, !!p.is_new, p.sort || 0,
].join(', ')})`).join(',\n');
sql += '\non conflict (id) do nothing;\n\n';

sql += 'insert into flora.souvenirs (id, name, description, price, min_qty, sort) values\n';
sql += seed.souvenirs.map((s) => `  (${[q(s.id), q(s.name), q(s.description), s.price, s.min_qty, s.sort].join(', ')})`).join(',\n');
sql += '\non conflict (id) do nothing;\n\n';

sql += 'insert into flora.coupons (code, kind, value, min_total, active) values\n';
sql += seed.coupons.map((c) => `  (${[q(c.code), q(c.kind), c.value, c.min_total, c.active].join(', ')})`).join(',\n');
sql += '\non conflict (code) do nothing;\n\n';

sql += `insert into flora.settings (id, data) values (1, ${j(seed.settings)})\non conflict (id) do nothing;\n`;

fs.writeFileSync(path.join(__dirname, 'seed.sql'), sql);
console.log(`seed.sql gerado: ${seed.products.length} produtos, ${seed.souvenirs.length} lembrancinhas, ${seed.coupons.length} cupons`);
