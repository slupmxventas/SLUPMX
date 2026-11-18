
(() => {
  "use strict";

  const cfg = window.SLUPMX_CONFIG || {};
  const products = window.SLUPMX_PRODUCTS || [];

  const $ = (selector, root = document) => root.querySelector(selector);

  const money = value => new Intl.NumberFormat(cfg.locale || "es-MX", {
    style: "currency",
    currency: cfg.currency || "MXN",
    maximumFractionDigits: 2
  }).format(Number(value || 0));

  const safeUrl = value => {
    try {
      const u = new URL(value);
      return ["https:", "http:"].includes(u.protocol) ? u.href : "";
    } catch {
      return "";
    }
  };

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

  const toast = message => {
    const el = $("#toast");
    if (!el) return;

    el.textContent = message;
    el.classList.add("show");

    clearTimeout(toast.timer);

    toast.timer = setTimeout(() => {
      el.classList.remove("show");
    }, 2400);
  };

  
const productCard = p => {
  const links = [
    ["mercadoLibre", "Mercado Libre", "ml"],
    ["amazon", "Amazon", "amazon"],
    ["facebook", "Facebook", "facebook"]
  ].map(([key, label, cls]) => {
    const url = safeUrl(p.links?.[key]);

    return url
      ? `<a class="buy-link ${cls}" href="${esc(url)}" target="_blank" rel="sponsored nofollow noopener">${label}</a>`
      : "";
  }).filter(Boolean).join("");

  const ownButton = `
    <button class="buy-link own" type="button"
      data-buy-product="${esc(p.id)}">
      Comprar aquí
    </button>
  `;

    const shareData = encodeURIComponent(JSON.stringify({
      id: p.id,
      name: p.name
    }));

    return `
      <article class="product-card" data-category="${esc(p.category)}">

        <div class="product-image-wrap">
          <img
            class="product-image"
            src="${esc(p.image)}"
            alt="${esc(p.name)}"
            loading="lazy"
            decoding="async"
            onerror="this.src='https://placehold.co/800x600/f3f5f8/183653?text=Imagen+no+disponible'">

          ${p.badge ? `<span class="product-badge">${esc(p.badge)}</span>` : ""}
        </div>

        <div class="product-info">
          <span class="product-category">${esc(p.category || "Producto")}</span>

          <h3>${esc(p.name)}</h3>

          <p class="product-description">${esc(p.description)}</p>

          <div class="product-price">
            ${money(p.price)}
            ${p.oldPrice ? `<del>${money(p.oldPrice)}</del>` : ""}
          </div>

          <p class="buy-label">Elige dónde comprar</p>

         <div class="buy-links">
  ${links}
  ${ownButton}
</div>

          <button class="product-share" type="button" data-share="${esc(shareData)}">
            ↗ Compartir producto
          </button>
        </div>

      </article>
    `;
  };

  let activeCategory = "Todos";

  const renderProducts = () => {
    const search = ($("#productSearch")?.value || "")
      .trim()
      .toLocaleLowerCase("es-MX");

    const filtered = products.filter(p =>
      (activeCategory === "Todos" || p.category === activeCategory) &&
      `${p.name} ${p.description} ${p.category}`
        .toLocaleLowerCase("es-MX")
        .includes(search)
    );

    const productGrid = $("#productGrid");

    if (productGrid) {
      productGrid.innerHTML = filtered.length
        ? filtered.map(productCard).join("")
        : `<div class="empty-state">No encontramos productos con esa búsqueda.</div>`;
    }

    const recommendGrid = $("#recommendGrid");

    if (recommendGrid) {
      recommendGrid.innerHTML = products
        .filter(p => p.recommended)
        .slice(0, 6)
        .map(p => `
          <article class="recommend-card">
            <div class="recommend-icon">✦</div>
            <div>
              <h3>${esc(p.name)}</h3>
              <p>${esc(p.description)}</p>
              <a href="#productos" data-focus-product="${esc(p.id)}">
                VER PRODUCTO →
              </a>
            </div>
          </article>
        `).join("") || `
          <div class="empty-state">
            Próximamente encontrarás recomendaciones.
          </div>
        `;
    }
  };

  $("#productSearch")?.addEventListener("input", renderProducts);

  $("#categoryFilters")?.addEventListener("click", e => {
    const btn = e.target.closest("[data-category]");
    if (!btn) return;

    activeCategory = btn.dataset.category;

    $("#categoryFilters")
      .querySelectorAll("button")
      .forEach(b => b.classList.toggle("active", b === btn));

    renderProducts();
  });

  $("#productGrid")?.addEventListener("click", async e => {
        const buyBtn = e.target.closest("[data-buy-product]");

    if (buyBtn) {
      const product = products.find(
        p => p.id === buyBtn.dataset.buyProduct
      );

      if (!product) return;

      const dialog = $("#checkoutDialog");

      if (!dialog) {
        toast("No se encontró el formulario de compra.");
        return;
      }

      $("#checkoutProductId").value = product.id;
      $("#checkoutProductName").textContent = product.name;
      $("#checkoutVariant").value = "";
      $("#checkoutQuantity").value = 1;

      $("#checkoutTotal").textContent =
        `Total con envío: ${money(Number(product.price) + 150)}`;

      dialog.showModal();
      return;
    }
    const btn = e.target.closest("[data-share]");
    if (!btn) return;

    const data = JSON.parse(decodeURIComponent(btn.dataset.share));

    const url = new URL(location.href);
    url.hash = "productos";

    const share = {
      title: data.name,
      text: `Mira este producto en SLUPMX: ${data.name}`,
      url: url.href
    };

    try {
      if (navigator.share) {
        await navigator.share(share);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(share.url);
        toast("Enlace copiado.");
      } else {
        toast("Tu navegador no permite compartir automáticamente.");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        toast("No se pudo compartir.");
      }
    }
  });

  $("#recommendGrid")?.addEventListener("click", e => {
    const link = e.target.closest("[data-focus-product]");
    if (!link) return;

    const id = link.dataset.focusProduct;
    const item = products.find(p => p.id === id);

    if (item) {
      const search = $("#productSearch");

      if (search) search.value = item.name;

      activeCategory = "Todos";
      renderProducts();
    }
  });

  const renderPosts = () => {
    const feedGrid = $("#feedGrid");
    if (!feedGrid) return;

    feedGrid.innerHTML = (window.SLUPMX_POSTS || []).map(p => `
      <article class="feed-card">
        <span class="feed-date">${esc(p.date)}</span>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.excerpt)}</p>
        <a href="${esc(safeUrl(p.link) || (p.link?.startsWith("#") ? p.link : "#"))}">
          ${esc(p.linkText || "Leer más")} →
        </a>
      </article>
    `).join("");
  };

  const renderPlatforms = () => {
    const platformGrid = $("#platformGrid");
    if (!platformGrid) return;

    platformGrid.innerHTML =
      (window.SLUPMX_PLATFORMS || [])
        .filter(p => safeUrl(p.url))
        .map(p => `
          <a class="platform-card"
             href="${esc(safeUrl(p.url))}"
             target="_blank"
             rel="noopener">

            <span class="platform-icon">${esc(p.icon || "↗")}</span>

            <span>
              <strong>${esc(p.name)}</strong>
              <small>${esc(p.description || "Visitar plataforma")}</small>
            </span>
          </a>
        `).join("") +

      `
        <div class="platform-card">
          <span class="platform-icon">+</span>
          <span>
            <strong>Más plataformas</strong>
            <small>Agrega enlaces en js/plataformas.js</small>
          </span>
        </div>
      `;
  };

  const wa = cfg.whatsappNumber &&
    !cfg.whatsappNumber.includes("0000000000")
      ? `https://wa.me/${encodeURIComponent(cfg.whatsappNumber)}?text=${encodeURIComponent(cfg.whatsappMessage || "Hola, tengo una consulta sobre SLUPMX.")}`
      : "";

  ["whatsappFloat", "footerWhatsapp", "contactCta"].forEach(id => {
    const el = document.getElementById(id);

    if (el) {
      el.href = wa || "#";

      if (!wa) {
        el.addEventListener("click", e => {
          e.preventDefault();
          toast("Configura tu número en js/config.js.");
        });
      }
    }
  });

  $("#menuToggle")?.addEventListener("click", () => {
    const nav = $("#mainNav");
    if (!nav) return;

    const open = nav.classList.toggle("open");

    $("#menuToggle").setAttribute("aria-expanded", String(open));
  });

  $("#mainNav")?.addEventListener("click", e => {
    if (e.target.closest("a")) {
      $("#mainNav").classList.remove("open");
      $("#menuToggle")?.setAttribute("aria-expanded", "false");
    }
  });

  $("#closeAnnouncement")?.addEventListener("click", () => {
    $("#announcement")?.remove();
  });

  const currentYear = $("#currentYear");

  if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
  }

  // La suscripción ahora se administra mediante el formulario integrado de Brevo.
  // No se necesita un controlador de envío en este archivo.

  renderProducts();
  renderPosts();
  renderPlatforms();

})();
