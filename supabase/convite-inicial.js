// Gera o PRIMEIRO convite do painel (quando o banco ainda não tem ninguém na equipe).
// Uso: node supabase/convite-inicial.js [endereço da loja]
//
// Mostra duas coisas:
//   1. o SQL para rodar no Supabase (SQL Editor) — guarda só o hash do convite;
//   2. o link para abrir e criar a conta de administrador (vale 7 dias, uso único).
// Depois do primeiro acesso, os próximos convites saem pelo próprio painel
// (Configurações → Equipe e convites).
const crypto = require('crypto');

const base = (process.argv[2] || 'https://sf-solucoestecnologicas.github.io/flora-alma/').replace(/\/?$/, '/');
const token = crypto.randomBytes(24).toString('hex'); // 192 bits, igual ao painel
const hash = crypto.createHash('sha256').update(token).digest('hex');

console.log('-- 1) Rode no Supabase → SQL Editor:');
console.log(`insert into flora.invites (token_hash, created_email) values ('${hash}', 'convite-inicial');\n`);
console.log('-- 2) Abra este link e crie a conta (não compartilhe; funciona uma vez):');
console.log(`${base}#/atelie/criar-acesso?convite=${token}`);
