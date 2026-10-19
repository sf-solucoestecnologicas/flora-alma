# Flora Alma — loja online

Loja da **Flora Alma · Sabonetes artesanais e velas aromáticas** (Feira de Santana - BA · [@floraalmaartesanal](https://www.instagram.com/floraalmaartesanal/)). *Autocuidado que abraça.*

**No ar:** https://sf-solucoestecnologicas.github.io/flora-alma/

Site estático (HTML + CSS + JS puro) com banco de dados no **Supabase**. Mesma base do site da BiCiclo (vitrine + checkout + painel), refeita para sabonetes, velas e presentes.

## O que tem

**Vitrine**
- Home: hero com vela acesa, categorias, vitrine com abas, "vela da vez", **guia de aromas** (como quer se sentir + onde vai usar → sugestões), lembrancinhas, "feito à mão", benefícios, destaques do Instagram e contato
- Loja com busca, filtros (categoria, momento, tipo, aroma, preço, promoção, estoque) e ordenação
- Produto: notas do aroma, escolha de aroma, momentos, cálculo de entrega por CEP, detalhes, cuidados de uso e "para presentear"
- Sacola lateral com barra de entrega grátis e cupom
- Checkout: dados, entrega (retirada combinada / Feira de Santana / outras cidades, CEP pelo ViaCEP), **embalagem para presente com mensagem do cartão** e pagamento (Pix com desconto, cartão com link, na entrega)
- Pedido concluído: QR Code Pix + copia-e-cola, aviso para conferir o recebedor e envio do pedido no WhatsApp
- **Lembrancinhas** (`#/lembrancinhas`): orçamento para eventos com estimativa na hora
- Favoritos, "Meus pedidos" (status atualizado do banco) e **política de privacidade** (`#/privacidade`)
- No celular: barra inferior, barras fixas de "Pôr na sacola", "Finalizar" e "Pedir orçamento", layout testado de 320 a 1024 px

**Painel do ateliê** (`#/atelie`, link "Área do ateliê" no rodapé)
- Visão geral, produtos (com envio de foto), pedidos, lembrancinhas e configurações
- Equipe com **convites de uso único** e **histórico de alterações**
- Botão para **apagar dados pessoais** de um pedido ou orçamento (LGPD)

## Rodar localmente

```bash
cd flora-alma
python -m http.server 5522          # loja: http://127.0.0.1:5522
node tools/seo-build.js             # gera o site publicado (com as páginas de SEO) em _site/
```

## Publicação

- Repositório: https://github.com/sf-solucoestecnologicas/flora-alma
- O GitHub Actions (`.github/workflows/pages.yml`) publica no GitHub Pages **a cada envio para a `main`** e **todo dia às 6h** (horário de Brasília). Assim as páginas de produto, categorias e o sitemap acompanham o que for alterado no painel.

## SEO

- Título, descrição, URL canônica, Open Graph e Twitter Card em todas as páginas; imagem de compartilhamento 1200×630 (`assets/og.jpg`) e ícones em alta (`assets/icon-*.png`, `manifest.webmanifest`).
- Dados estruturados schema.org: **Store** (loja local em Feira de Santana), **WebSite**, **Product** com preço, estoque e entrega, **BreadcrumbList**, **CollectionPage/ItemList** nas categorias e **Service** nas lembrancinhas.
- A loja usa rotas `#/…`, que o Google não indexa separadamente. Por isso `tools/seo-build.js` gera **páginas estáticas com endereço próprio** para cada produto (`/produto/<código>/`), cada categoria (`/loja/<categoria>/`), lembrancinhas e privacidade. Elas já trazem o conteúdo em HTML (o robô lê sem JavaScript) e abrem a loja completa na rota certa.
- `sitemap.xml` com todas as páginas. Para acelerar a indexação, cadastre o endereço no **Google Search Console** (propriedade de prefixo de URL `https://sf-solucoestecnologicas.github.io/flora-alma/`) e envie o `sitemap.xml`. Com um domínio próprio (ex.: `floraalma.com.br`) o `robots.txt` também passa a valer.

## Segurança

**Banco (Supabase, schema `flora`)**
- Tabelas com RLS ligado, sem nenhuma permissão direta e com o schema invisível para a API. Tudo passa por funções `public.flora_*`.
- **Preços, cupom, desconto Pix, entrega e embalagem são recalculados no servidor**: alterar valores no navegador não muda o pedido.
- **Limite de tentativas** por IP real (cabeçalho `cf-connecting-ip`, que o navegador não falsifica) e por WhatsApp em pedidos, orçamentos, cupons, consulta de status e convites.
- **Códigos de pedido aleatórios** (`FA` + 6 caracteres, gerador criptográfico `pgcrypto`): não revelam o volume de vendas nem permitem adivinhar pedidos. Consultar status exige o código e o telefone.
- **Convites da equipe**: token aleatório de 192 bits, guardado **só como hash SHA-256**, uso único, vale 7 dias e pode ser cancelado.
- Tudo que vem do painel é validado e limpo no servidor (códigos, cores, links de imagem, números e textos com tamanho máximo), evitando injeção de código mesmo com uma conta da equipe comprometida.
- **Histórico de alterações** do painel (quem mudou o quê e quando), com destaque para troca da chave Pix.
- Fotos: só JPG, PNG e WebP (sem SVG) até 5 MB. O redimensionamento no navegador remove metadados (inclusive localização).

**Site**
- Content Security Policy: só carrega scripts, estilos, fontes e conexões de origens conhecidas.
- **SRI** (hash SHA-384) nas bibliotecas externas (Supabase e QR Code): se o CDN for adulterado, o script não roda.
- Proteção contra clickjacking (a loja não abre dentro de outro site), todo conteúdo dinâmico escapado e planilhas exportadas protegidas contra fórmulas maliciosas.
- Senha da equipe com no mínimo 8 caracteres, letras e números. Login com limite de tentativas do Supabase.
- Privacidade: política em `#/privacidade`, consentimento no checkout, "Esquecer meus dados neste aparelho" e nenhum cookie de rastreamento.

## Acesso ao painel

- **Entrar:** `#/atelie`, com e-mail e senha.
- **Nova pessoa na equipe:** Configurações → *Equipe e convites* → **Gerar link de convite**. O link aparece uma vez só, funciona para uma pessoa e vale 7 dias.
- **Confirmação de e-mail:** configuração do projeto Supabase inteiro (Authentication → Sign In / Providers → Email → *Confirm email*). Se estiver ligada, adicione `https://sf-solucoestecnologicas.github.io/flora-alma/` em Authentication → URL Configuration → *Redirect URLs*.

## Antes de divulgar: revisar

- **Endereço/retirada e horário**: estão como exemplo. O mapa só aparece com latitude e longitude.
- **Produtos, preços, estoques, pesos, tempo de queima e composição** são demonstrativos. Ajuste tudo no painel.
- **Itens de lembrancinha**, embalagem para presente (R$ 6), entrega (R$ 10, grátis acima de R$ 150), 5% no Pix, até 3x, cupons `BEMVINDA` e `ABRACO15`: editáveis no painel.
- **Fotos reais**: Produtos → editar → Enviar foto. Elas passam a aparecer também no Google e no compartilhamento.

## Estrutura

```
index.html              shell da SPA (rotas por hash) + SEO e segurança (CSP)
css/style.css           identidade visual e layout responsivo
js/data.js              config do Supabase + catálogo inicial
js/art.js               ilustrações SVG (sabonetes, velas, kits, frascos)
js/store.js             estado, Supabase, sacola, Pix (BR Code), WhatsApp
js/app.js               vitrine: home, loja, produto, checkout, lembrancinhas, privacidade
js/admin.js             painel do ateliê
tools/seo-build.js      gera _site/ com páginas de SEO, sitemap e robots
supabase/               schema (com a camada de segurança), seed e gerador do seed
assets/                 logo, ícones e imagem de compartilhamento
.github/workflows/      publicação no GitHub Pages
```
