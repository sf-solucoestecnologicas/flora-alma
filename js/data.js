/* =========================================================
   Flora Alma — dados iniciais (seed)
   Usado para popular o Supabase (supabase/seed.sql é gerado
   a partir daqui) e como fallback offline da vitrine.
   Preços, estoques, pesos e composições são DEMONSTRATIVOS —
   edite tudo pelo painel (#/atelie).
   ========================================================= */
window.FA = window.FA || {};

FA.config = {
  supabaseUrl: 'https://vsjidlibxhsxhivuzyqk.supabase.co',
  // chave "publishable": é pública por design (as regras ficam no banco)
  supabaseKey: 'sb_publishable_7nnphSWYCAFkgTf6uzyuTg_9vVI_Fyc',
  bucket: 'flora-produtos',
};

FA.categories = [
  { id: 'sabonetes', name: 'Sabonetes', tagline: 'Barras artesanais para o banho', art: { kind: 'soap', color: '#c7b6dc', accent: '#7a64a0', deco: 'buds', bg: '#eee8f3' } },
  { id: 'velas', name: 'Velas aromáticas', tagline: 'Luz quente e perfume no ar', art: { kind: 'jar', color: '#c9894a', wax: '#f4e6cc', accent: '#4a2c21', label: 'BAUNILHA', bg: '#f3e6d6' } },
  { id: 'kits', name: 'Kits & presentes', tagline: 'Prontos para presentear', art: { kind: 'box', color: '#4a2c21', accent: '#d8b48c', bg: '#efe3d3' } },
  { id: 'corpo', name: 'Corpo & cabelo', tagline: 'Mãos macias, fios leves', art: { kind: 'tube', color: '#f6efe4', accent: '#7a64a0', label: 'KARITÉ', bg: '#f5e4df' } },
  { id: 'casa', name: 'Casa perfumada', tagline: 'Home spray, difusor e sachê', art: { kind: 'diffuser', color: '#d9e3dc', wax: '#e2c58f', accent: '#fbf7f0', bg: '#e3ecdc' } },
];

// Como você quer se sentir? (usado no quiz e nos filtros)
FA.moods = [
  { id: 'relaxar', icon: 'moon', name: 'Desacelerar', notes: 'Lavanda, camomila e flor de algodão', text: 'Para fechar o dia em paz, com um banho demorado e a casa em silêncio.' },
  { id: 'energizar', icon: 'sun', name: 'Despertar', notes: 'Alecrim, hortelã, café e capim-limão', text: 'Aromas vivos para começar o dia com disposição e cabeça leve.' },
  { id: 'aconchego', icon: 'home', name: 'Aconchegar', notes: 'Baunilha, canela, aveia e mel', text: 'Cheiro de casa, de bolo no forno e de abraço demorado.' },
  { id: 'refrescar', icon: 'leaf', name: 'Respirar', notes: 'Melaleuca, hortelã e notas verdes', text: 'Notas limpas e verdes para renovar a pele e o ar da casa.' },
];

const AROMAS_VELA = ['Baunilha & Canela', 'Flor de Algodão', 'Lavanda', 'Capim-limão'];

FA.seed = {
  products: [
    /* ---------------- SABONETES ---------------- */
    {
      id: 'sabonete-lavanda-camomila', name: 'Sabonete Lavanda & Camomila', aroma: 'Lavanda', cat: 'sabonetes', sub: 'Barra vegetal',
      price: 18.9, old_price: null, stock: 24, options: [], opt_label: 'Aroma', moods: ['relaxar'],
      notes: 'Lavanda, camomila e um fundo suave de baunilha',
      description: 'O nosso abraço em forma de banho. Espuma cremosa, perfume calmo e aquele cheirinho que fica na pele depois de um dia longo.',
      specs: [['Peso', 'aprox. 100 g'], ['Base', 'Glicerina vegetal e manteiga de karité'], ['Pele', 'Todos os tipos'], ['Feito', 'À mão, em pequenos lotes']],
      art: { kind: 'soap', color: '#c7b6dc', accent: '#7a64a0', deco: 'buds', bg: '#eee8f3' },
      featured: true, sort: 1,
    },
    {
      id: 'sabonete-alecrim-hortela', name: 'Sabonete Alecrim & Hortelã', aroma: 'Alecrim', cat: 'sabonetes', sub: 'Barra vegetal',
      price: 18.9, old_price: null, stock: 18, options: [], opt_label: 'Aroma', moods: ['energizar', 'refrescar'],
      notes: 'Alecrim, hortelã e folhas verdes',
      description: 'Refrescante e cheio de energia: o banho da manhã que acorda o corpo e deixa a pele limpinha e perfumada.',
      specs: [['Peso', 'aprox. 100 g'], ['Base', 'Glicerina vegetal'], ['Pele', 'Normal a oleosa'], ['Feito', 'À mão, em pequenos lotes']],
      art: { kind: 'soap', color: '#cfe0c3', accent: '#5f7d52', deco: 'herbs', bg: '#e8efe2' },
      sort: 2,
    },
    {
      id: 'sabonete-aveia-mel', name: 'Sabonete Aveia & Mel', aroma: 'Aveia & Mel', cat: 'sabonetes', sub: 'Esfoliante suave',
      price: 19.9, old_price: null, stock: 20, options: [], opt_label: 'Aroma', moods: ['aconchego'],
      notes: 'Mel, aveia tostada e leite',
      description: 'Esfoliação delicada com flocos de aveia e um perfume doce de mel. Ideal para peles sensíveis que pedem carinho.',
      specs: [['Peso', 'aprox. 100 g'], ['Base', 'Glicerina vegetal com aveia'], ['Pele', 'Seca e sensível'], ['Uso', 'Esfoliação suave, uso diário']],
      art: { kind: 'soap', color: '#ecd3a0', accent: '#b98c4f', deco: 'oats', bg: '#f5ead6' },
      featured: true, sort: 3,
    },
    {
      id: 'sabonete-argila-rosa', name: 'Sabonete Argila Rosa & Rosas', aroma: 'Rosas', cat: 'sabonetes', sub: 'Argila',
      price: 21.9, old_price: 24.9, stock: 12, options: [], opt_label: 'Aroma', moods: ['relaxar', 'aconchego'],
      notes: 'Rosas, gerânio e almíscar branco',
      description: 'Argila rosa para uma limpeza suave e um perfume floral romântico. Bonito de ver, gostoso de usar e lindo de presentear.',
      specs: [['Peso', 'aprox. 100 g'], ['Base', 'Glicerina vegetal e argila rosa'], ['Pele', 'Todos os tipos'], ['Feito', 'À mão, cada peça é única']],
      art: { kind: 'soap', color: '#e7b8ad', accent: '#b0574f', deco: 'swirl', bg: '#f5e4df' },
      sort: 4,
    },
    {
      id: 'sabonete-carvao-melaleuca', name: 'Sabonete Carvão Ativado & Melaleuca', aroma: 'Melaleuca', cat: 'sabonetes', sub: 'Argila',
      price: 21.9, old_price: null, stock: 10, options: [], opt_label: 'Aroma', moods: ['refrescar'],
      notes: 'Melaleuca, eucalipto e menta',
      description: 'Limpeza profunda com carvão ativado e o frescor herbal da melaleuca. O preferido de quem tem pele oleosa.',
      specs: [['Peso', 'aprox. 100 g'], ['Base', 'Glicerina vegetal e carvão ativado'], ['Pele', 'Mista a oleosa'], ['Feito', 'À mão, em pequenos lotes']],
      art: { kind: 'soap', color: '#3f3a37', accent: '#a9b5a6', deco: 'specks', bg: '#e4e6e1' },
      sort: 5,
    },
    {
      id: 'sabonete-cafe-cacau', name: 'Sabonete Café & Cacau', aroma: 'Café', cat: 'sabonetes', sub: 'Esfoliante suave',
      price: 19.9, old_price: null, stock: 16, options: [], opt_label: 'Aroma', moods: ['energizar', 'aconchego'],
      notes: 'Café moído, cacau e baunilha',
      description: 'Pó de café para esfoliar e cacau para perfumar. Um banho com cheiro de cafeteria numa manhã preguiçosa.',
      specs: [['Peso', 'aprox. 100 g'], ['Base', 'Glicerina vegetal com café'], ['Pele', 'Todos os tipos'], ['Uso', 'Esfoliação média, 2 a 3x por semana']],
      art: { kind: 'soap', color: '#8a5a3c', accent: '#3b2316', deco: 'coffee', bg: '#efe1d4' },
      is_new: true, sort: 6,
    },

    /* ---------------- VELAS ---------------- */
    {
      id: 'vela-flor-de-algodao', name: 'Vela Flor de Algodão', aroma: 'Flor de algodão', cat: 'velas', sub: 'Pote de vidro',
      price: 54.9, old_price: null, stock: 8, options: [], opt_label: 'Aroma', moods: ['relaxar'],
      notes: 'Algodão limpo, talco e flores brancas',
      description: 'Cheiro de roupa limpa estendida ao sol e lençol trocado. Acenda no quarto meia hora antes de dormir e sinta a casa respirar mais devagar.',
      specs: [['Peso', 'aprox. 180 g'], ['Queima', 'cerca de 35 horas'], ['Cera', 'Vegetal'], ['Pavio', 'Algodão'], ['Pote', 'Vidro reutilizável']],
      art: { kind: 'jar', color: '#dfe7ea', wax: '#fbf7f0', accent: '#d8b48c', label: 'ALGODÃO', bg: '#efe7dc' },
      featured: true, is_new: true, sort: 10,
    },
    {
      id: 'vela-baunilha-canela', name: 'Vela Baunilha & Canela', aroma: 'Baunilha', cat: 'velas', sub: 'Pote de vidro',
      price: 49.9, old_price: null, stock: 10, options: [], opt_label: 'Aroma', moods: ['aconchego'],
      notes: 'Baunilha, canela em pau e açúcar mascavo',
      description: 'A vela mais pedida do ateliê. Doce na medida, quentinha e com aquele perfume de casa de vó em dia de chuva.',
      specs: [['Peso', 'aprox. 180 g'], ['Queima', 'cerca de 35 horas'], ['Cera', 'Vegetal'], ['Pavio', 'Algodão'], ['Pote', 'Vidro âmbar reutilizável']],
      art: { kind: 'jar', color: '#c9894a', wax: '#f4e6cc', accent: '#4a2c21', label: 'BAUNILHA', bg: '#f3e6d6' },
      featured: true, sort: 11,
    },
    {
      id: 'vela-capim-limao-gengibre', name: 'Vela Capim-limão & Gengibre', aroma: 'Capim-limão', cat: 'velas', sub: 'Pote de vidro',
      price: 49.9, old_price: 54.9, stock: 6, options: [], opt_label: 'Aroma', moods: ['energizar', 'refrescar'],
      notes: 'Capim-limão, gengibre e raspas de limão',
      description: 'Cítrica, verde e animada. Perfeita para a sala, a cozinha ou o cantinho de trabalho.',
      specs: [['Peso', 'aprox. 180 g'], ['Queima', 'cerca de 35 horas'], ['Cera', 'Vegetal'], ['Pavio', 'Algodão'], ['Pote', 'Vidro âmbar reutilizável']],
      art: { kind: 'jar', color: '#c9894a', wax: '#f1edc8', accent: '#7f9171', label: 'CAPIM-LIMÃO', bg: '#ecefdc' },
      sort: 12,
    },
    {
      id: 'vela-lata-80g', name: 'Vela em Lata 80 g', aroma: 'Vários', cat: 'velas', sub: 'Lata',
      price: 24.9, old_price: null, stock: 30, options: AROMAS_VELA, opt_label: 'Aroma', moods: ['relaxar', 'aconchego', 'energizar'],
      notes: 'Escolha o seu aroma preferido',
      description: 'Pequena, charmosa e com tampa: vai na bolsa, na mala de viagem e no lavabo. O mimo perfeito para quem quer conhecer a Flora Alma.',
      specs: [['Peso', 'aprox. 80 g'], ['Queima', 'cerca de 15 horas'], ['Cera', 'Vegetal'], ['Embalagem', 'Lata com tampa']],
      art: { kind: 'tin', color: '#cfc6bb', wax: '#f4ead8', accent: '#4a2c21', bg: '#efe5d7' },
      featured: true, sort: 13,
    },
    {
      id: 'vela-xicara-ceramica', name: 'Vela na Xícara de Cerâmica', aroma: 'Vários', cat: 'velas', sub: 'Cerâmica',
      price: 69.9, old_price: null, stock: 5, options: ['Baunilha & Canela', 'Flor de Algodão', 'Lavanda'], opt_label: 'Aroma', moods: ['aconchego', 'relaxar'],
      notes: 'Escolha o seu aroma preferido',
      description: 'Vela feita dentro de uma xícara de cerâmica com pires. Depois que a vela acaba, a xícara continua na sua casa.',
      specs: [['Peso', 'aprox. 150 g'], ['Queima', 'cerca de 28 horas'], ['Cera', 'Vegetal'], ['Peça', 'Xícara e pires de cerâmica']],
      art: { kind: 'cup', color: '#ead9c6', wax: '#fbf4e8', accent: '#a86b4f', bg: '#f4e6dd' },
      is_new: true, sort: 14,
    },

    /* ---------------- KITS ---------------- */
    {
      id: 'kit-abraco', name: 'Kit Abraço', aroma: 'Vários', cat: 'kits', sub: 'Kit presente',
      price: 99.9, old_price: 112.7, stock: 6, options: [], opt_label: 'Aroma', moods: ['aconchego', 'relaxar'],
      notes: 'Baunilha & canela + lavanda + aveia & mel',
      description: 'Uma vela Baunilha & Canela de 180 g, um sabonete Lavanda & Camomila e um sabonete Aveia & Mel numa caixa com laço e cartão escrito à mão.',
      specs: [['Vem com', 'Vela 180 g + 2 sabonetes 100 g'], ['Embalagem', 'Caixa presente com laço'], ['Cartão', 'Escrito à mão (deixe a mensagem no pedido)']],
      art: { kind: 'box', color: '#4a2c21', accent: '#d8b48c', bg: '#efe3d3' },
      featured: true, sort: 20,
    },
    {
      id: 'kit-banho-calmo', name: 'Kit Banho Calmo', aroma: 'Lavanda', cat: 'kits', sub: 'Kit banho',
      price: 49.9, old_price: null, stock: 8, options: [], opt_label: 'Aroma', moods: ['relaxar'],
      notes: 'Lavanda, camomila e flor de algodão',
      description: 'Sabonete Lavanda & Camomila, bucha vegetal e sachê perfumado: um ritual de banho completo para desacelerar.',
      specs: [['Vem com', 'Sabonete 100 g + bucha vegetal + sachê'], ['Embalagem', 'Caixa kraft com laço']],
      art: { kind: 'box', color: '#c9a77c', accent: '#7a64a0', bg: '#eee8f3' },
      sort: 21,
    },
    {
      id: 'kit-mimo', name: 'Kit Mimo', aroma: 'Vários', cat: 'kits', sub: 'Kit presente',
      price: 39.9, old_price: null, stock: 12, options: AROMAS_VELA, opt_label: 'Aroma da vela', moods: ['aconchego', 'relaxar', 'energizar'],
      notes: 'Vela em lata + sabonete do dia',
      description: 'Uma vela em lata de 80 g com o aroma que você escolher e um sabonete artesanal surpresa. Lembrança pequena, carinho enorme.',
      specs: [['Vem com', 'Vela em lata 80 g + sabonete 100 g'], ['Embalagem', 'Caixinha com laço e tag']],
      art: { kind: 'box', color: '#e8b9ae', accent: '#fbf7f0', bg: '#f6e6e1' },
      is_new: true, sort: 22,
    },

    /* ---------------- CORPO & CABELO ---------------- */
    {
      id: 'creme-maos-karite-lavanda', name: 'Creme de Mãos Karité & Lavanda', aroma: 'Lavanda', cat: 'corpo', sub: 'Hidratante',
      price: 29.9, old_price: null, stock: 14, options: [], opt_label: 'Aroma', moods: ['relaxar'],
      notes: 'Lavanda e manteiga de karité',
      description: 'Textura leve que absorve rápido e deixa as mãos macias e perfumadas. Cabe na bolsa e salva o dia.',
      specs: [['Conteúdo', '60 g'], ['Ativos', 'Manteiga de karité'], ['Uso', 'Sempre que quiser']],
      art: { kind: 'tube', color: '#f6efe4', accent: '#7a64a0', label: 'KARITÉ', bg: '#eee8f3' },
      featured: true, sort: 30,
    },
    {
      id: 'shampoo-barra-alecrim', name: 'Shampoo em Barra Alecrim & Babosa', aroma: 'Alecrim', cat: 'corpo', sub: 'Cabelo',
      price: 32.9, old_price: null, stock: 9, options: [], opt_label: 'Aroma', moods: ['refrescar', 'energizar'],
      notes: 'Alecrim, babosa e hortelã',
      description: 'Limpa sem pesar, rende muito e não usa embalagem plástica. Um jeito mais leve de cuidar dos fios.',
      specs: [['Peso', 'aprox. 80 g'], ['Ativos', 'Alecrim e babosa'], ['Rende', 'cerca de 40 lavagens'], ['Cabelo', 'Normal a oleoso']],
      art: { kind: 'soapround', color: '#a9c49a', accent: '#4f6b45', deco: 'herbs', bg: '#e3ecdc' },
      is_new: true, sort: 31,
    },

    /* ---------------- CASA ---------------- */
    {
      id: 'home-spray-250ml', name: 'Home Spray 250 ml', aroma: 'Vários', cat: 'casa', sub: 'Home spray',
      price: 39.9, old_price: null, stock: 15, options: ['Lavanda & Alecrim', 'Flor de Algodão', 'Capim-limão'], opt_label: 'Aroma', moods: ['refrescar', 'relaxar'],
      notes: 'Escolha o seu aroma preferido',
      description: 'Borrife na sala, nas cortinas e no carro. Perfume que se espalha rápido e deixa a casa com cara de recém-arrumada.',
      specs: [['Conteúdo', '250 ml'], ['Uso', 'Ambientes e tecidos (teste antes em área escondida)'], ['Frasco', 'Vidro âmbar com válvula spray']],
      art: { kind: 'spray', color: '#a8642a', accent: '#fbf7f0', label: 'HOME SPRAY', bg: '#f1e4d3' },
      sort: 40,
    },
    {
      id: 'agua-de-lencol-algodao', name: 'Água de Lençol Flor de Algodão', aroma: 'Flor de algodão', cat: 'casa', sub: 'Água de lençol',
      price: 29.9, old_price: 34.9, stock: 11, options: [], opt_label: 'Aroma', moods: ['relaxar'],
      notes: 'Algodão, talco e lavanda',
      description: 'Algumas borrifadas no travesseiro antes de deitar e pronto: cama cheirosa e sono mais gostoso.',
      specs: [['Conteúdo', '120 ml'], ['Uso', 'Lençóis, travesseiros e toalhas'], ['Frasco', 'Vidro com válvula spray']],
      art: { kind: 'bottle', color: '#dfe9ee', wax: '#f3f7fa', accent: '#d8b48c', label: 'LENÇOL', bg: '#e9eef0' },
      sort: 41,
    },
    {
      id: 'difusor-varetas-100ml', name: 'Difusor de Varetas 100 ml', aroma: 'Vários', cat: 'casa', sub: 'Difusor',
      price: 59.9, old_price: null, stock: 7, options: ['Baunilha & Canela', 'Lavanda & Alecrim', 'Capim-limão'], opt_label: 'Aroma', moods: ['aconchego', 'refrescar'],
      notes: 'Escolha o seu aroma preferido',
      description: 'Perfume contínuo, sem fogo e sem tomada. Vire as varetas a cada poucos dias para renovar o aroma.',
      specs: [['Conteúdo', '100 ml'], ['Dura', 'cerca de 45 dias'], ['Vem com', 'Frasco de vidro + 6 varetas']],
      art: { kind: 'diffuser', color: '#d9e3dc', wax: '#e2c58f', accent: '#fbf7f0', label: 'DIFUSOR', bg: '#efe7dc' },
      sort: 42,
    },
    {
      id: 'sache-perfumado', name: 'Sachê Perfumado para Gavetas', aroma: 'Vários', cat: 'casa', sub: 'Sachê',
      price: 12.9, old_price: null, stock: 40, options: ['Lavanda', 'Flor de Algodão', 'Rosas'], opt_label: 'Aroma', moods: ['relaxar', 'aconchego'],
      notes: 'Escolha o seu aroma preferido',
      description: 'Para perfumar gavetas, armários, malas e bolsas. Chacoalhe de vez em quando para despertar o aroma.',
      specs: [['Dura', 'cerca de 2 meses'], ['Tecido', 'Algodão com laço']],
      art: { kind: 'sachet', color: '#ecdccb', accent: '#b0574f', bg: '#f5e9e1' },
      sort: 43,
    },
  ],

  // Itens de lembrancinha (preço por unidade)
  souvenirs: [
    { id: 'mini-sabonete', name: 'Mini sabonete personalizado', description: 'Sabonete de 25 g embalado com tag personalizada (nomes, data ou logo).', price: 4.5, min_qty: 20, sort: 1 },
    { id: 'sabonete-flor', name: 'Sabonete em formato de flor ou coração', description: 'Peça de 40 g no formato e na cor do tema da festa.', price: 5.9, min_qty: 20, sort: 2 },
    { id: 'mini-vela-lata', name: 'Mini vela em lata', description: 'Vela de 40 g em latinha com tampa e rótulo personalizado.', price: 8.9, min_qty: 20, sort: 3 },
    { id: 'sache-tag', name: 'Sachê perfumado com tag', description: 'Saquinho de tecido com laço e tag de agradecimento.', price: 3.9, min_qty: 30, sort: 4 },
    { id: 'kit-mini', name: 'Kit mini sabonete + vela', description: 'Mini sabonete e mini vela numa caixinha com laço.', price: 13.9, min_qty: 15, sort: 5 },
  ],

  coupons: [
    { code: 'BEMVINDA', kind: 'percent', value: 10, min_total: 60, active: true },
    { code: 'ABRACO15', kind: 'fixed', value: 15, min_total: 120, active: true },
  ],

  settings: {
    storeName: 'Flora Alma',
    whatsapp: '',
    instagram: 'floraalmaartesanal',
    city: 'Feira de Santana - BA',
    address: 'Ateliê em Feira de Santana - BA (retirada combinada pelo WhatsApp)',
    lat: null,
    lng: null,
    hours: 'Atendimento de seg a sáb, das 9h às 18h',
    pixKey: '',
    pixName: 'FLORA ALMA',
    pixCity: 'FEIRA DE SANTANA',
    pixDiscount: 5,
    maxInstallments: 3,
    freeShippingOver: 150,
    localDelivery: 10,
    giftWrap: 6,
    cepFrom: '44000',
    cepTo: '44130',
    leadDays: 15,
    minQty: 20,
    ticker: ['Feito à mão', 'Autocuidado que abraça', 'Embalagem para presente com cartão', '5% off no Pix', 'Entrega grátis em Feira acima de R$ 150', 'Lembrancinhas personalizadas para eventos'],
  },
};
