(function () {
  "use strict";

  const STORE_KEY = "acougue-digital-mvp-v1";
  const SESSION_TIMEOUT = 120000;
  const READY_RETURN_MS = 30 * 60 * 1000;

  const images = {
    picanha: "assets/picanha.png",
    patinho: "assets/patinho-moido.png",
    contra: "assets/bifes-bovinos.png",
    alcatra: "assets/bifes-bovinos.png",
    musculo: "assets/patinho-moido.png",
    chicken: "assets/aves.png",
    pork: "assets/suinos.png",
    ready: "assets/prontos.png",
    recipe: "assets/patinho-moido.png",
    kit: "assets/prontos.png"
  };

  const defaultProducts = [
    { id: "picanha", name: "Picanha", category: "bovina", price: 89.9, available: true, image: images.picanha, description: "Suculenta, com capa de gordura. Ideal para churrasqueira.", preps: ["Bife médio", "Bife grosso", "Peça inteira", "Tiras"] },
    { id: "patinho", name: "Patinho", category: "bovina", price: 42.9, available: true, image: images.patinho, description: "Corte magro e versátil para bifes, cubos ou moído.", preps: ["Bife fino", "Bife médio", "Cubos", "Tiras", "Moído"] },
    { id: "contrafile", name: "Contrafilé", category: "bovina", price: 59.9, available: true, image: images.contra, description: "Sabor marcante e maciez para grelha e churrasco.", preps: ["Bife médio", "Bife grosso", "Peça inteira", "Tiras"] },
    { id: "alcatra", name: "Alcatra", category: "bovina", price: 54.9, available: true, image: images.alcatra, description: "Macia e equilibrada, funciona em diferentes preparos.", preps: ["Bife fino", "Bife médio", "Cubos", "Tiras", "Peça inteira"] },
    { id: "musculo", name: "Músculo", category: "bovina", price: 34.9, available: true, image: images.musculo, description: "Rico em sabor e colágeno para cozidos longos.", preps: ["Cubos", "Moído", "Peça inteira"] },
    { id: "fraldinha", name: "Fraldinha", category: "bovina", price: 52.9, available: true, image: images.contra, description: "Fibras longas, suculência e preparo rápido.", preps: ["Bife médio", "Bife grosso", "Tiras", "Peça inteira"] },
    { id: "peito-frango", name: "Peito de frango", category: "aves", price: 23.9, available: true, image: images.chicken, description: "Leve e versátil para o dia a dia.", preps: ["Filé", "Cubos", "Tiras", "Moído"] },
    { id: "coxa", name: "Coxa e sobrecoxa", category: "aves", price: 16.9, available: true, image: images.chicken, description: "Suculenta para forno, panela ou churrasqueira.", preps: ["Com osso", "Desossada", "Temperada"] },
    { id: "lombo", name: "Lombo suíno", category: "suina", price: 31.9, available: true, image: images.pork, description: "Macio e de sabor suave para assados e bifes.", preps: ["Bife médio", "Cubos", "Peça inteira", "Temperado"] },
    { id: "costelinha", name: "Costelinha suína", category: "suina", price: 35.9, available: false, image: images.pork, description: "Corte tradicional para forno e churrasqueira.", preps: ["Tiras", "Peça inteira", "Temperada"] },
    { id: "linguica", name: "Linguiça artesanal", category: "prontos", price: 29.9, available: true, image: images.ready, description: "Complemento clássico para churrascos e encontros.", preps: ["Embalagem padrão"] },
    { id: "hamburguer", name: "Hambúrguer artesanal", category: "prontos", price: 39.9, available: true, image: images.ready, description: "Blend da casa pronto para grelhar.", preps: ["Discos de 150 g"] }
  ];

  const now = Date.now();
  const defaultState = {
    kioskEnabled: true,
    nextTicket: 27,
    products: defaultProducts,
    orders: [
      { id: "demo-1", ticket: "A024", customer: "Mariana Souza", phone: "(11) 99999-1024", status: "preparing", createdAt: now - 8 * 60000, items: [{ productId: "patinho", name: "Patinho", weight: 1, prep: "Moído", notes: "Moer duas vezes", price: 42.9 }], estimatedTotal: 42.9 },
      { id: "demo-2", ticket: "A025", customer: "Carlos Lima", phone: "(11) 99999-1025", status: "waiting", createdAt: now - 3 * 60000, items: [{ productId: "picanha", name: "Picanha", weight: 1.2, prep: "Bife grosso", notes: "", price: 89.9 }], estimatedTotal: 107.88 },
      { id: "demo-3", ticket: "A026", customer: "Ana Pereira", phone: "(11) 99999-1026", status: "ready", createdAt: now - 14 * 60000, readyAt: now - 2 * 60000, items: [{ productId: "linguica", name: "Linguiça artesanal", weight: 0.8, prep: "Embalagem padrão", notes: "", price: 29.9 }], estimatedTotal: 23.92 }
    ]
  };

  let state = loadState();
  let session = freshSession();
  let inactivityTimer = null;
  let confirmationTimer = null;

  function freshSession() {
    return { screen: "identify", customer: "", phone: "", category: "", productId: "", weight: 1, prep: "", notes: "", cart: [], ticket: "" };
  }

  function localImageFor(product) {
    if (product.id === "picanha") return images.picanha;
    if (["patinho", "musculo"].includes(product.id)) return images.patinho;
    if (["contrafile", "alcatra", "fraldinha"].includes(product.id)) return images.contra;
    if (product.category === "aves") return images.chicken;
    if (product.category === "suina") return images.pork;
    if (product.category === "prontos") return images.ready;
    return images.contra;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (!saved) return structuredClone(defaultState);
      const merged = { ...structuredClone(defaultState), ...saved, products: saved.products || structuredClone(defaultProducts), orders: saved.orders || [] };
      merged.products.forEach(product => { product.image = localImageFor(product); });
      merged.orders.forEach(order => order.items?.forEach(item => {
        const product = merged.products.find(candidate => candidate.id === item.productId);
        if (product) item.image = product.image;
      }));
      return merged;
    } catch (_) {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event("acougue-state-changed"));
  }

  function money(value) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
  }

  function weight(value) {
    return value < 1 ? `${Math.round(value * 1000)} g` : `${value.toFixed(1).replace(".0", "").replace(".", ",")} kg`;
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
  }

  function shortName(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0]}.` : (parts[0] || "Cliente");
  }

  function route() {
    return (location.hash.replace(/^#\/?/, "") || "tablet").split("/")[0];
  }

  function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 2800);
  }

  function housekeeping() {
    let changed = false;
    state.orders.forEach(order => {
      if (order.status === "ready" && order.readyAt && Date.now() - order.readyAt >= READY_RETURN_MS) {
        order.status = "returned";
        order.returnedAt = Date.now();
        changed = true;
      }
    });
    if (changed) saveState();
  }

  function shell(content, options = {}) {
    const active = options.active || "";
    return `<div class="app-shell">
      <header class="topbar">
        <div class="brand"><span class="brand-mark">✦</span><span>Açougue Digital</span></div>
        <div class="top-actions">
          <a class="mode-link ${route() === "tablet" ? "active" : ""}" href="#/tablet">Tablet</a>
          <a class="mode-link ${route() === "butcher" ? "active" : ""}" href="#/butcher">Açougueiro</a>
          <a class="mode-link ${route() === "board" ? "active" : ""}" href="#/board">Painel</a>
          <a class="mode-link ${route() === "manager" ? "active" : ""}" href="#/manager">Gestão</a>
        </div>
      </header>
      <main class="main">${content}</main>
      ${options.nav === false ? "" : bottomNav(active)}
    </div>`;
  }

  function bottomNav(active) {
    return `<nav class="footer-nav" aria-label="Navegação principal">
      <button class="nav-item" data-action="back"><span>←</span><span>Voltar</span></button>
      <button class="nav-item ${active === "categories" ? "active" : ""}" data-action="go-category"><span>▦</span><span>Categorias</span></button>
      <button class="nav-item ${active === "cuts" ? "active" : ""}" data-action="go-learn"><span>✂</span><span>Cortes</span></button>
      <button class="nav-item ${active === "cart" ? "active" : ""}" data-action="go-cart"><span>🛒</span><span>Pedido (${session.cart.length})</span></button>
      <button class="nav-item ${active === "home" ? "active" : ""}" data-action="go-home"><span>⌂</span><span>Início</span></button>
    </nav>`;
  }

  function progress(step) {
    const labels = ["Categoria", "Corte", "Quantidade", "Preparo", "Resumo"];
    return `<div class="progress">${labels.map((label, i) => `<div class="progress-step ${i + 1 < step ? "done" : i + 1 === step ? "active" : ""}"><span class="step-dot">${i + 1 < step ? "✓" : i + 1}</span><span>${label}</span></div>`).join("")}</div>`;
  }

  function render() {
    housekeeping();
    const app = document.getElementById("app");
    if (route() === "board") app.innerHTML = renderBoard();
    else if (route() === "butcher") app.innerHTML = renderButcher();
    else if (route() === "manager") app.innerHTML = renderManager();
    else app.innerHTML = renderTablet();
    if (route() === "tablet") armInactivity(); else clearTimeout(inactivityTimer);
  }

  function renderTablet() {
    if (!state.kioskEnabled) {
      return shell(`<div class="paused"><div class="paused-box"><div class="success-icon" style="background:var(--wine-soft);color:var(--wine)">⏸</div><h1>Pedidos temporariamente pausados</h1><p class="lede">O açougue suspendeu novos pedidos pelo tablet. Procure nossa equipe para atendimento.</p></div></div>`, { nav: false });
    }
    switch (session.screen) {
      case "identify": return renderIdentify();
      case "home": return renderHome();
      case "category": return renderCategories();
      case "products": return renderProducts();
      case "config": return renderConfig();
      case "cart": return renderCart();
      case "confirmation": return renderConfirmation();
      case "recipes": return renderRecipes();
      case "recipe": return renderRecipe();
      case "learn": return renderLearn();
      default: session.screen = "identify"; return renderIdentify();
    }
  }

  function renderIdentify() {
    return shell(`<section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Pedido sem fila</p>
        <h1>Olá! Vamos identificar seu pedido.</h1>
        <p class="lede">Você poderá continuar suas compras e receber uma mensagem quando tudo estiver pronto.</p>
        <form id="identity-form">
          <div class="field"><label for="customer">Seu nome</label><input class="input" id="customer" name="customer" autocomplete="name" placeholder="Ex.: Fernando Silva" required minlength="2"></div>
          <div class="field"><label for="phone">Celular</label><input class="input" id="phone" name="phone" autocomplete="tel" inputmode="tel" placeholder="(00) 00000-0000" required minlength="10"></div>
          <button class="btn btn-primary btn-block" type="submit">Começar pedido <span>→</span></button>
        </form>
        <p class="muted small" style="margin-top:14px">Usaremos seu celular somente para avisar sobre este pedido. A sessão é apagada após 120 segundos de inatividade.</p>
      </div>
      <div class="hero-visual"><p class="eyebrow" style="color:#ffd8df">Tradição & tecnologia</p><h2>Sua carne, do seu jeito.</h2><p>Escolha com calma. Nós cuidamos do corte.</p></div>
    </section>`, { nav: false });
  }

  function renderHome() {
    return shell(`<p class="eyebrow">Olá, ${escapeHtml(session.customer.split(" ")[0])}</p><h1>O que vamos preparar hoje?</h1><p class="lede">Escolha uma opção para começar.</p>
      <div class="grid grid-3" style="margin-top:28px">
        <button class="choice-card" data-action="go-category"><div class="choice-art"><img src="${images.picanha}" alt="Picanha fresca"></div><div class="choice-content"><h2>Montar meu pedido</h2><p>Escolha categoria, corte, quantidade e preparo.</p><span class="choice-link">Iniciar seleção →</span></div></button>
        <button class="choice-card" data-action="go-recipes"><div class="choice-art"><img src="${images.ready}" alt="Linguiças e hambúrgueres artesanais"></div><div class="choice-content"><h2>Sugestões e receitas</h2><p>Encontre a carne certa para sua receita e leve o guia no celular.</p><span class="choice-link">Ver sugestões →</span></div></button>
        <button class="choice-card" data-action="go-learn"><div class="choice-art"><img src="${images.contra}" alt="Seleção de cortes bovinos"></div><div class="choice-content"><h2>Conheça os cortes</h2><p>Aprenda características, usos e peça o corte diretamente.</p><span class="choice-link">Explorar guia →</span></div></button>
      </div>
      <div class="soft-card" style="margin-top:24px;display:flex;justify-content:space-between;align-items:center;gap:20px"><div><strong>Preço transparente</strong><div class="muted">O valor exibido é aproximado. O peso final pode variar em até 100 g.</div></div><span class="tag tag-green">Pague no caixa</span></div>`, { active: "home" });
  }

  function renderCategories() {
    const cats = [
      ["bovina", images.picanha, "Carne bovina", "Cortes nobres e opções do dia a dia"],
      ["aves", images.chicken, "Frango e aves", "Opções leves e versáteis"],
      ["suina", images.pork, "Carne suína", "Sabor e tradição para diferentes preparos"],
      ["prontos", images.ready, "Prontos e temperados", "Itens preparados e complementos"]
    ];
    return shell(`${progress(1)}<h1>O que você deseja pedir?</h1><p class="lede">Somente categorias com produtos disponíveis podem ser selecionadas.</p>
      <div class="grid grid-4" style="margin-top:28px">${cats.map(c => {
        const count = state.products.filter(p => p.category === c[0] && p.available).length;
        return `<button class="choice-card" data-action="select-category" data-category="${c[0]}" ${count ? "" : "disabled"}><div class="choice-art"><img src="${c[1]}" alt="${c[2]}"></div><div class="choice-content"><h2>${c[2]}</h2><p>${c[3]}</p><span class="choice-link">${count ? `${count} opções →` : "Indisponível hoje"}</span></div></button>`;
      }).join("")}</div>`, { active: "categories" });
  }

  function renderProducts() {
    const labels = { bovina: "Carne bovina", aves: "Frango e aves", suina: "Carne suína", prontos: "Prontos e temperados" };
    const products = state.products.filter(p => p.category === session.category);
    return shell(`${progress(2)}<p class="eyebrow">${labels[session.category] || "Cortes"}</p><h1>Escolha o corte</h1><p class="lede">Preços por quilo atualizados pelo gerente. O valor final depende da pesagem.</p>
      <div class="grid grid-3" style="margin-top:28px">${products.map(productCard).join("")}</div>`, { active: "cuts" });
  }

  function productCard(p) {
    return `<article class="card product-card ${p.available ? "" : "unavailable"}">
      <div class="product-media"><span>🥩</span><img class="product-image" src="${p.image}" alt="${escapeHtml(p.name)}" onerror="this.remove()"></div>
      <div class="card-body"><span class="tag ${p.available ? "tag-green" : "tag-gray"}">${p.available ? "Disponível" : "Indisponível hoje"}</span><h2 style="margin:13px 0 7px">${escapeHtml(p.name)}</h2><p>${escapeHtml(p.description)}</p><div class="summary-line"><span>Preço aproximado</span><strong class="price">${money(p.price)}/kg</strong></div><button class="btn btn-primary btn-block" data-action="select-product" data-id="${p.id}" ${p.available ? "" : "disabled"}>Selecionar</button></div>
    </article>`;
  }

  function renderConfig() {
    const product = state.products.find(p => p.id === session.productId);
    if (!product) { session.screen = "products"; return renderProducts(); }
    const estimate = product.price * session.weight;
    return shell(`${progress(session.prep ? 4 : 3)}<div class="config-layout">
      <section><p class="eyebrow">${escapeHtml(product.name)}</p><h1>Quantidade e preparo</h1><div class="notice">A quantidade é aproximada. O peso final pode variar em até <strong>100 g</strong> conforme o corte realizado.</div>
        <div class="card" style="margin-top:22px"><div class="card-body"><h2>Qual quantidade você deseja?</h2><div class="weight-picker"><button class="round-btn" data-action="weight-minus" aria-label="Diminuir 100 gramas">−</button><div class="weight-value">${weight(session.weight)}</div><button class="round-btn" data-action="weight-plus" aria-label="Aumentar 100 gramas">+</button></div><div class="pills">${[.5,1,1.5,2,3].map(w => `<button class="pill ${Math.abs(session.weight-w)<.01 ? "active" : ""}" data-action="set-weight" data-weight="${w}">${weight(w)}</button>`).join("")}</div></div></div>
        <div class="card" style="margin-top:22px"><div class="card-body"><h2>Como deseja o preparo?</h2><div class="pills">${product.preps.map(prep => `<button class="pill ${session.prep === prep ? "active" : ""}" data-action="set-prep" data-prep="${escapeHtml(prep)}">${escapeHtml(prep)}</button>`).join("")}</div><div class="field"><label for="notes">Observações para o açougueiro</label><textarea class="input" id="notes" maxlength="140" placeholder="Ex.: retirar excesso de gordura">${escapeHtml(session.notes)}</textarea></div></div></div>
      </section>
      <aside class="card sticky"><div class="card-body"><span class="tag tag-wine">Resumo do item</span><h2 style="margin-top:14px">${escapeHtml(product.name)}</h2><div class="summary-line"><span>Quantidade</span><strong>${weight(session.weight)}</strong></div><div class="summary-line"><span>Preparo</span><strong>${escapeHtml(session.prep || "Selecione")}</strong></div><div class="summary-line"><span>Estimativa</span><strong class="price">${money(estimate)}</strong></div><p class="muted small">Valor aproximado, calculado com o preço atual de ${money(product.price)}/kg.</p><button class="btn btn-primary btn-block" data-action="add-item" ${session.prep ? "" : "disabled"}>Adicionar ao pedido</button></div></aside>
    </div>`, { active: "cuts" });
  }

  function cartTotal() { return session.cart.reduce((sum, item) => sum + item.weight * item.price, 0); }
  function cartWeight() { return session.cart.reduce((sum, item) => sum + item.weight, 0); }

  function renderCart() {
    const total = cartTotal();
    const suggestions = state.products.filter(p => p.available && ["linguica", "hamburguer"].includes(p.id) && !session.cart.some(i => i.productId === p.id));
    return shell(`${progress(5)}<h1>Revise seu pedido</h1><p class="lede">Confira os cortes antes de enviar. Após a confirmação, não será possível cancelar pelo tablet.</p>
      <div class="cart-layout" style="margin-top:25px"><section><div class="card">${session.cart.length ? session.cart.map((item, index) => `<div class="cart-item"><img class="cart-thumb" src="${item.image}" alt=""><div><h2>${escapeHtml(item.name)}</h2><div class="muted">${weight(item.weight)} · ${escapeHtml(item.prep)}</div>${item.notes ? `<p style="margin:8px 0 0"><strong>Observação:</strong> ${escapeHtml(item.notes)}</p>` : ""}<div class="price" style="margin-top:8px">${money(item.weight * item.price)} aprox.</div></div><button class="icon-btn" data-action="remove-item" data-index="${index}" aria-label="Remover ${escapeHtml(item.name)}">🗑</button></div>`).join("") : `<div class="empty"><h2>Seu pedido está vazio</h2><button class="btn btn-primary" data-action="go-category">Escolher cortes</button></div>`}</div>
        ${suggestions.length && session.cart.length ? `<div class="section-head"><div><p class="eyebrow">Complete seu pedido</p><h2>Sugestões do açougue</h2></div></div><div class="grid grid-2">${suggestions.map(p => `<div class="soft-card"><div style="display:flex;gap:15px;align-items:center"><img class="cart-thumb" src="${p.image}" alt=""><div style="flex:1"><h3>${p.name}</h3><div class="price">${money(p.price)}/kg</div></div><button class="btn btn-ghost" data-action="quick-add" data-id="${p.id}">Adicionar 500 g</button></div></div>`).join("")}</div>` : ""}
        <button class="btn btn-ghost" style="margin-top:20px" data-action="go-category">＋ Adicionar mais itens</button>
      </section><aside class="card sticky"><div class="card-body"><h2>Resumo do pedido</h2><div class="summary-line"><span>Itens</span><strong>${session.cart.length}</strong></div><div class="summary-line"><span>Peso solicitado</span><strong>${weight(cartWeight())}</strong></div><div class="summary-line"><span>Valor aproximado</span><strong class="big-total">${money(total)}</strong></div><div class="notice small" style="margin:16px 0">O peso de cada item pode variar em até 100 g. Você pagará o valor da etiqueta no caixa do mercado.</div><button class="btn btn-success btn-block" data-action="submit-order" ${session.cart.length ? "" : "disabled"}>Confirmar e enviar</button></div></aside></div>`, { active: "cart" });
  }

  function renderConfirmation() {
    const order = state.orders.find(o => o.ticket === session.ticket);
    if (!order) { session.screen = "identify"; return renderIdentify(); }
    return shell(`<div class="success-wrap"><div class="success-icon">✓</div><p class="eyebrow">Pedido recebido</p><h1>Continue suas compras</h1><p class="lede" style="margin-left:auto;margin-right:auto">Seu pedido foi enviado ao açougue. Enviaremos uma mensagem para <strong>${escapeHtml(order.phone)}</strong> quando estiver pronto.</p>
      <div class="ticket"><span class="muted">SUA SENHA</span><div class="ticket-code">${order.ticket}</div><div class="grid grid-2"><div><span class="muted small">Nome no painel</span><h3>${escapeHtml(shortName(order.customer))}</h3></div><div><span class="muted small">Valor aproximado</span><h3>${money(order.estimatedTotal)}</h3></div></div><div class="notice small">Na retirada, confira a etiqueta com o peso final, preço e código de barras. O pagamento será feito no caixa.</div></div>
      <div class="phone-preview"><div class="muted small" style="margin-bottom:12px">SIMULAÇÃO DE MENSAGEM</div><div class="message-bubble"><strong>Açougue Digital</strong><br>Recebemos o pedido ${order.ticket}. Avisaremos assim que estiver pronto para retirada.</div></div>
      <button class="btn btn-primary" data-action="end-session">Encerrar e liberar tablet</button><p class="muted small" style="margin-top:12px">Esta tela será encerrada automaticamente.</p></div>`, { nav: false });
  }

  function renderRecipes() {
    const recipeCards = [
      ["strogonoff", images.patinho, "Strogonoff para 2 pessoas", "500 g de patinho em tiras", "patinho", .5],
      ["churrasco", images.picanha, "Churrasco para 4 pessoas", "Picanha e linguiça artesanal", "picanha", 1],
      ["hamburguer", images.ready, "Noite do hambúrguer", "Blend artesanal pronto para grelhar", "hamburguer", .6]
    ];
    return shell(`<p class="eyebrow">Sugestões do açougue</p><h1>Escolha a ocasião ou receita</h1><p class="lede">Adicionamos somente os itens do açougue. Os demais ingredientes seguem na receita por QR Code.</p><div class="grid grid-3" style="margin-top:28px">${recipeCards.map(r => `<button class="choice-card" data-action="open-recipe" data-recipe="${r[0]}" data-product="${r[4]}" data-weight="${r[5]}"><div class="choice-art"><img src="${r[1]}" alt="${r[2]}"></div><div class="choice-content"><span class="tag tag-green">Sugestão</span><h2 style="margin-top:12px">${r[2]}</h2><p>${r[3]}</p><span class="choice-link">Ver receita →</span></div></button>`).join("")}</div>`, { active: "categories" });
  }

  function renderRecipe() {
    const recipe = session.recipe || { type: "strogonoff", productId: "patinho", weight: .5 };
    const product = state.products.find(p => p.id === recipe.productId) || state.products[0];
    const titles = { strogonoff: "Strogonoff especial", churrasco: "Churrasco em família", hamburguer: "Noite do hambúrguer" };
    return shell(`<p class="eyebrow">Receita recomendada</p><h1>${titles[recipe.type] || "Receita do açougue"}</h1><div class="recipe-hero">
      <div class="recipe-art"><h2>${titles[recipe.type] || "Receita do açougue"}</h2><p>Uma seleção prática para preparar em casa e continuar suas compras no mercado.</p></div>
      <div class="card"><div class="card-body"><span class="tag tag-green">Somente item do açougue</span><h2 style="margin-top:15px">${product.name}</h2><div class="summary-line"><span>Quantidade</span><strong>${weight(recipe.weight)}</strong></div><div class="summary-line"><span>Preparo</span><strong>${escapeHtml(product.preps.includes("Tiras") ? "Tiras" : product.preps[0])}</strong></div><div class="summary-line"><span>Estimativa</span><strong class="price">${money(product.price * recipe.weight)}</strong></div><button class="btn btn-primary btn-block" data-action="add-recipe" data-product="${product.id}" data-weight="${recipe.weight}" ${product.available ? "" : "disabled"}>Adicionar carne ao pedido</button>${product.available ? "" : `<p class="muted small">Item indisponível hoje.</p>`}</div></div>
    </div><div class="grid grid-2" style="margin-top:24px"><div class="card"><div class="card-body"><h2>Como preparar</h2><ol class="lede" style="font-size:16px"><li>Separe e tempere a carne.</li><li>Sele em fogo alto até dourar.</li><li>Adicione os demais ingredientes da receita.</li><li>Finalize e sirva imediatamente.</li></ol></div></div><div class="card"><div class="card-body" style="text-align:center"><div class="qr" aria-label="QR Code demonstrativo"></div><h2>Receita no celular</h2><p class="muted">Escaneie para consultar os outros ingredientes enquanto faz suas compras.</p><span class="tag tag-gray">QR Code demonstrativo</span></div></div></div>`, { active: "categories" });
  }

  function renderLearn() {
    const cuts = state.products.filter(p => p.category === "bovina").slice(0, 6);
    return shell(`<p class="eyebrow">Guia de cortes</p><h1>Escolha melhor. Prepare melhor.</h1><p class="lede">Conheça as características de cada corte e adicione ao pedido sem sair do guia.</p><div class="education-map">🐄</div><div class="grid grid-3" style="margin-top:24px">${cuts.map(p => `<article class="card product-card ${p.available ? "" : "unavailable"}"><div class="product-media"><span>🥩</span><img class="product-image" src="${p.image}" alt="" onerror="this.remove()"></div><div class="card-body"><h2>${p.name}</h2><p>${p.description}</p><div class="pills" style="margin-bottom:15px"><span class="tag tag-gray">${p.preps.slice(0,2).join(" · ")}</span></div><button class="btn btn-primary btn-block" data-action="learn-order" data-id="${p.id}" ${p.available ? "" : "disabled"}>Pedir este corte</button></div></article>`).join("")}</div>`, { active: "cuts" });
  }

  function statusLabel(status) {
    return ({ waiting: "Aguardando aceite", preparing: "Em preparação", issue: "Com pendência", ready: "Pronto", delivered: "Entregue", returned: "Retornou após 30 min" })[status] || status;
  }

  function renderButcher() {
    const open = state.orders.filter(o => !["delivered"].includes(o.status));
    const waiting = open.filter(o => ["waiting", "returned"].includes(o.status));
    const preparing = open.filter(o => ["preparing", "issue"].includes(o.status));
    const ready = open.filter(o => o.status === "ready");
    const value = state.orders.filter(o => o.status === "delivered").reduce((s,o) => s + o.estimatedTotal,0);
    return shell(`<div class="toolbar"><div><p class="eyebrow">Operação do açougue</p><h1>Fila de pedidos</h1></div><div class="actions"><span class="tag ${state.kioskEnabled ? "tag-green" : "tag-amber"}">${state.kioskEnabled ? "Tablet recebendo pedidos" : "Tablet pausado"}</span><a class="btn btn-ghost" href="#/board">Abrir painel público</a></div></div>
      <div class="stats"><div class="stat"><span class="muted">Aguardando</span><div class="stat-value">${waiting.length}</div></div><div class="stat"><span class="muted">Em preparo</span><div class="stat-value">${preparing.length}</div></div><div class="stat"><span class="muted">Prontos</span><div class="stat-value">${ready.length}</div></div><div class="stat"><span class="muted">Vendas concluídas</span><div class="stat-value">${money(value)}</div></div></div>
      <div class="order-columns">${orderColumn("Aguardando", waiting, "waiting")}${orderColumn("Em preparação", preparing, "preparing")}${orderColumn("Prontos", ready, "ready")}</div>`, { nav: false });
  }

  function orderColumn(title, orders, kind) {
    return `<section class="order-column"><div class="column-title"><span>${title}</span><span class="count">${orders.length}</span></div>${orders.length ? orders.map(o => orderCard(o, kind)).join("") : `<div class="empty">Nenhum pedido nesta etapa.</div>`}</section>`;
  }

  function orderCard(order, kind) {
    const age = Math.max(0, Math.floor((Date.now() - order.createdAt) / 60000));
    return `<article class="order-card ${order.status === "issue" ? "pending-issue" : ""}"><div class="order-head"><div><div class="order-code">${order.ticket}</div><strong>${escapeHtml(shortName(order.customer))}</strong></div><span class="tag ${order.status === "issue" ? "tag-amber" : order.status === "ready" ? "tag-green" : "tag-gray"}">${statusLabel(order.status)}</span></div><div class="muted small">Recebido há ${age} min · ${escapeHtml(order.phone)}</div><ul class="order-items">${order.items.map(i => `<li><strong>${weight(i.weight)} ${escapeHtml(i.name)}</strong><br><span class="small">${escapeHtml(i.prep)}${i.notes ? ` · ${escapeHtml(i.notes)}` : ""}</span></li>`).join("")}</ul><div class="summary-line"><span>Estimativa</span><strong>${money(order.estimatedTotal)}</strong></div><div class="order-actions">${kind === "waiting" ? `<button class="btn btn-primary" data-action="order-status" data-id="${order.id}" data-status="preparing">Aceitar</button><button class="btn btn-warning" data-action="order-status" data-id="${order.id}" data-status="issue">Pendência</button>` : kind === "preparing" ? `<button class="btn btn-success" data-action="order-status" data-id="${order.id}" data-status="ready">Marcar pronto</button><button class="btn btn-warning" data-action="order-status" data-id="${order.id}" data-status="${order.status === "issue" ? "preparing" : "issue"}">${order.status === "issue" ? "Resolver" : "Pendência"}</button>` : `<button class="btn btn-success" data-action="order-status" data-id="${order.id}" data-status="delivered">Entregue</button><button class="btn btn-secondary" disabled>Etiqueta ✓</button>`}</div></article>`;
  }

  function renderBoard() {
    const preparing = state.orders.filter(o => ["preparing", "issue"].includes(o.status));
    const ready = state.orders.filter(o => o.status === "ready");
    const rows = orders => orders.length ? orders.map(o => `<div class="board-row"><span>${escapeHtml(shortName(o.customer))}</span><strong>${o.ticket}</strong></div>`).join("") : `<div class="board-empty">Nenhuma senha neste momento.</div>`;
    return `<main class="board"><div class="board-head"><div class="board-logo">✦ Açougue Digital</div><div class="board-clock" id="board-clock">${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div></div><div class="board-grid"><section class="board-column"><h2>Em preparação</h2>${rows(preparing)}</section><section class="board-column ready"><h2>Pronto para retirada</h2>${rows(ready)}</section></div><div style="text-align:center;margin-top:28px;color:rgba(255,255,255,.65)">Retire no balcão do açougue e pague no caixa do mercado.</div><a href="#/butcher" style="position:fixed;right:14px;bottom:10px;color:transparent">Voltar</a></main>`;
  }

  function renderManager() {
    const completed = state.orders.filter(o => o.status === "delivered");
    const avg = completed.length ? completed.reduce((s,o)=>s+o.estimatedTotal,0)/completed.length : 0;
    return shell(`<div class="toolbar"><div><p class="eyebrow">Gestão do dia</p><h1>Preços e disponibilidade</h1><p class="lede">O tablet reflete estas alterações imediatamente.</p></div><button class="btn ${state.kioskEnabled ? "btn-danger" : "btn-success"}" data-action="toggle-kiosk">${state.kioskEnabled ? "Pausar novos pedidos" : "Reativar pedidos"}</button></div>
      <div class="kiosk-banner ${state.kioskEnabled ? "kiosk-on" : "kiosk-off"}"><div><strong>${state.kioskEnabled ? "Tablet ativo" : "Tablet pausado"}</strong><div>${state.kioskEnabled ? "Clientes podem enviar novos pedidos." : "O tablet informa que os pedidos estão temporariamente suspensos."}</div></div><span style="font-size:30px">${state.kioskEnabled ? "●" : "⏸"}</span></div>
      <div class="stats"><div class="stat"><span class="muted">Pedidos do dia</span><div class="stat-value">${state.orders.length}</div></div><div class="stat"><span class="muted">Concluídos</span><div class="stat-value">${completed.length}</div></div><div class="stat"><span class="muted">Ticket aproximado</span><div class="stat-value">${money(avg)}</div></div><div class="stat"><span class="muted">Itens indisponíveis</span><div class="stat-value">${state.products.filter(p=>!p.available).length}</div></div></div>
      <div class="card"><div class="card-body"><div class="table-scroll"><table class="manager-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço aproximado/kg</th><th>Disponível no tablet</th></tr></thead><tbody>${state.products.map(p => `<tr><td><strong>${p.name}</strong></td><td>${({bovina:"Bovina",aves:"Aves",suina:"Suína",prontos:"Prontos"})[p.category]}</td><td><input class="price-input" type="number" min="0" step="0.1" value="${p.price.toFixed(2)}" data-product-price="${p.id}" aria-label="Preço de ${p.name}"></td><td><label class="switch"><input type="checkbox" data-product-available="${p.id}" ${p.available ? "checked" : ""}><span class="slider"></span></label></td></tr>`).join("")}</tbody></table></div></div></div>
      <div class="actions" style="margin-top:22px"><button class="btn btn-primary" data-action="save-catalog">Salvar alterações</button><button class="btn btn-ghost" data-action="reset-demo">Restaurar dados da demonstração</button></div>`, { nav: false });
  }

  function armInactivity() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      if (route() === "tablet" && session.screen !== "identify") {
        session = freshSession();
        clearTimeout(confirmationTimer);
        render();
        toast("Sessão encerrada por inatividade.");
      }
    }, SESSION_TIMEOUT);
  }

  function setScreen(screen) {
    session.screen = screen;
    window.scrollTo({ top: 0, behavior: "smooth" });
    render();
  }

  function submitOrder() {
    const ticket = `A${String(state.nextTicket).padStart(3,"0")}`;
    state.nextTicket += 1;
    const order = { id: `order-${Date.now()}`, ticket, customer: session.customer, phone: session.phone, status: "waiting", createdAt: Date.now(), items: structuredClone(session.cart), estimatedTotal: cartTotal() };
    state.orders.unshift(order);
    session.ticket = ticket;
    saveState();
    setScreen("confirmation");
    clearTimeout(confirmationTimer);
    confirmationTimer = setTimeout(() => { session = freshSession(); render(); }, 20000);
  }

  document.addEventListener("submit", event => {
    if (event.target.id !== "identity-form") return;
    event.preventDefault();
    const form = new FormData(event.target);
    session.customer = String(form.get("customer") || "").trim();
    session.phone = String(form.get("phone") || "").trim();
    if (session.customer.length < 2 || session.phone.replace(/\D/g, "").length < 10) return toast("Informe nome e celular válidos.");
    setScreen("home");
  });

  document.addEventListener("input", event => {
    if (event.target.id === "phone") {
      const digits = event.target.value.replace(/\D/g, "").slice(0,11);
      event.target.value = digits.length > 10 ? digits.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3") : digits.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    }
    if (event.target.id === "notes") session.notes = event.target.value;
  });

  document.addEventListener("change", event => {
    if (event.target.matches("[data-product-available]")) {
      const p = state.products.find(x => x.id === event.target.dataset.productAvailable);
      if (p) p.available = event.target.checked;
    }
  });

  document.addEventListener("click", event => {
    const el = event.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    if (action === "go-home") setScreen("home");
    else if (action === "go-category") setScreen("category");
    else if (action === "go-cart") setScreen("cart");
    else if (action === "go-recipes") setScreen("recipes");
    else if (action === "go-learn") setScreen("learn");
    else if (action === "back") {
      const previous = { home: "identify", category: "home", products: "category", config: "products", cart: "home", recipes: "home", recipe: "recipes", learn: "home" };
      setScreen(previous[session.screen] || "home");
    } else if (action === "select-category") {
      session.category = el.dataset.category; setScreen("products");
    } else if (action === "select-product" || action === "learn-order") {
      const p = state.products.find(x => x.id === el.dataset.id);
      if (!p || !p.available) return toast("Este item está indisponível hoje.");
      session.category = p.category; session.productId = p.id; session.weight = 1; session.prep = ""; session.notes = ""; setScreen("config");
    } else if (action === "weight-minus") {
      session.weight = Math.max(.1, +(session.weight - .1).toFixed(1)); render();
    } else if (action === "weight-plus") {
      session.weight = +(session.weight + .1).toFixed(1); render();
    } else if (action === "set-weight") {
      session.weight = +el.dataset.weight; render();
    } else if (action === "set-prep") {
      session.prep = el.dataset.prep; render();
    } else if (action === "add-item") {
      const product = state.products.find(p => p.id === session.productId);
      if (!product || !product.available) return toast("O item ficou indisponível. Escolha outro corte.");
      session.notes = document.getElementById("notes")?.value.trim() || "";
      session.cart.push({ productId: product.id, name: product.name, image: product.image, price: product.price, weight: session.weight, prep: session.prep, notes: session.notes });
      toast(`${product.name} adicionado ao pedido.`); setScreen("cart");
    } else if (action === "remove-item") {
      session.cart.splice(+el.dataset.index, 1); render();
    } else if (action === "quick-add") {
      const p = state.products.find(x => x.id === el.dataset.id);
      if (p?.available) { session.cart.push({ productId:p.id,name:p.name,image:p.image,price:p.price,weight:.5,prep:p.preps[0],notes:"" }); toast(`${p.name} adicionada.`); render(); }
    } else if (action === "submit-order") submitOrder();
    else if (action === "end-session") { clearTimeout(confirmationTimer); session = freshSession(); render(); }
    else if (action === "open-recipe") {
      session.recipe = { type:el.dataset.recipe, productId:el.dataset.product, weight:+el.dataset.weight }; setScreen("recipe");
    } else if (action === "add-recipe") {
      const p = state.products.find(x => x.id === el.dataset.product);
      const w = +el.dataset.weight;
      if (!p?.available) return toast("Item indisponível hoje.");
      session.cart.push({ productId:p.id,name:p.name,image:p.image,price:p.price,weight:w,prep:p.preps.includes("Tiras") ? "Tiras" : p.preps[0],notes:"Receita sugerida no tablet" }); toast("Item do açougue adicionado."); setScreen("cart");
    } else if (action === "order-status") {
      const order = state.orders.find(o => o.id === el.dataset.id);
      if (order) { order.status = el.dataset.status; if (order.status === "ready") order.readyAt = Date.now(); if (order.status === "delivered") order.deliveredAt = Date.now(); saveState(); render(); toast(order.status === "ready" ? `Mensagem simulada enviada para ${shortName(order.customer)}.` : "Status atualizado."); }
    } else if (action === "toggle-kiosk") { state.kioskEnabled = !state.kioskEnabled; saveState(); render(); }
    else if (action === "save-catalog") {
      document.querySelectorAll("[data-product-price]").forEach(input => { const p = state.products.find(x => x.id === input.dataset.productPrice); if (p) p.price = Math.max(0, +input.value || 0); });
      saveState(); render(); toast("Preços e disponibilidade atualizados.");
    } else if (action === "reset-demo") {
      if (confirm("Restaurar os dados iniciais da demonstração?")) { state = structuredClone(defaultState); session = freshSession(); saveState(); render(); toast("Demonstração restaurada."); }
    }
  });

  ["click", "keydown", "touchstart"].forEach(name => document.addEventListener(name, () => { if (route() === "tablet") armInactivity(); }, { passive: true }));
  window.addEventListener("hashchange", render);
  window.addEventListener("storage", event => { if (event.key === STORE_KEY) { state = loadState(); render(); } });
  window.addEventListener("acougue-state-changed", () => {});
  setInterval(() => { if (route() === "board") render(); else housekeeping(); }, 30000);

  render();
})();
