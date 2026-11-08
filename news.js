(() => {
  "use strict";
  const feeds = {
    "Gündem": "https://www.trthaber.com/gundem_articles.rss",
    "Spor": "https://www.trthaber.com/spor_articles.rss",
    "Dünya": "https://www.trthaber.com/dunya_articles.rss",
    "Teknoloji": "https://www.trthaber.com/bilim_teknoloji_articles.rss"
  };
  const $ = s => document.querySelector(s);
  const hero = $(".newshero"), line = $(".newsline");
  const badge = hero?.querySelector(".livebadge");
  const title = hero?.querySelector("strong");
  const subtitle = hero?.querySelector("small");
  const hint = $("#newsHint"), label = $("#newsCategory");
  if (!hero || !line || !badge || !title || !subtitle || !hint || !label) return;

  const style = document.createElement("style");
  style.textContent = `
    .newsbox{background:linear-gradient(150deg,#190f12,#0b090b 70%);border-color:#8f3436}
    .newsbox h2{color:#e9bd63}
    .newshero{background:linear-gradient(135deg,#39161c,#171014 72%);border-color:#9b642e;min-height:86px}
    .newshero .livebadge{background:#9e2730}
    .newshero strong{font-size:clamp(12px,3.5vw,16px);line-height:1.2;color:#fff2d5;cursor:pointer}
    .newshero small{color:#e3cda5}
    .newsline{display:flex;flex-direction:column;gap:4px;min-height:45px}
    .newsline b{font-size:8px}
    .newsline a{display:block;color:#f0dfc0;text-decoration:none;font-size:9px;line-height:1.25;padding:3px 0;border-bottom:1px solid #ffffff12}
    .newsfoot{color:#c4a879}
    .news-loading{color:#d8bd87;font-size:9px;padding:5px 0}
  `;
  document.head.appendChild(style);

  let active = "Gündem", currentArticle = "", busy = false;
  const cache = new Map();
  hero.addEventListener("click", () => {
    if (currentArticle) window.open(currentArticle, "_blank", "noopener,noreferrer");
  });

  function formatDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" :
      d.toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
  }
  function addArticle(item) {
    const a = document.createElement("a");
    a.href = item.link; a.target = "_blank"; a.rel = "noopener noreferrer";
    a.textContent = item.title;
    line.appendChild(a);
  }
  async function load(category, force = false) {
    if (busy) return;
    active = category;
    document.querySelectorAll(".newscat").forEach(btn => {
      const on = btn.dataset.category === category;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
    label.textContent = category;
    const saved = cache.get(category);
    if (!force && saved && Date.now() - saved.time < 5*60*1000) {
      render(category, saved.items); return;
    }
    busy = true; currentArticle = "";
    badge.textContent = "● CANLI HABER";
    title.textContent = "Haberler yükleniyor…";
    subtitle.textContent = "TRT Haber RSS bağlantısı";
    line.replaceChildren();
    const loading = document.createElement("div");
    loading.className = "news-loading"; loading.textContent = "Güncel haberler alınıyor…";
    line.appendChild(loading); hint.textContent = "Bağlantı kuruluyor";
    try {
      const response = await fetch("https://proxy.cors.dev/" + feeds[category],
        {method:"GET",cache:"no-store",credentials:"omit"});
      if (!response.ok) throw new Error("Haber servisi yanıt vermedi (" + response.status + ")");
      const xml = new DOMParser().parseFromString(await response.text(),"application/xml");
      if (xml.querySelector("parsererror")) throw new Error("Haber akışı okunamadı");
      const items = [...xml.querySelectorAll("item")].map(node => ({
        title:(node.querySelector("title")?.textContent || "").trim(),
        link:(node.querySelector("link")?.textContent || "").trim(),
        date:(node.querySelector("pubDate")?.textContent || "").trim()
      })).filter(x => x.title && /^https?:\/\//i.test(x.link)).slice(0,8);
      if (!items.length) throw new Error("Bu kategoride şu an haber bulunamadı");
      cache.set(category,{time:Date.now(),items});
      render(category,items);
    } catch (error) {
      title.textContent = "Haber bağlantısı kurulamadı";
      subtitle.textContent = "Tekrar denemek için kategoriye dokun";
      line.replaceChildren();
      hint.textContent = error?.message || "Bağlantı hatası";
      const retry = document.createElement("a");
      retry.href = "#"; retry.textContent = "↻ Yeniden dene";
      retry.addEventListener("click",e=>{e.preventDefault();load(category,true);});
      line.appendChild(retry);
    } finally { busy = false; }
  }
  function render(category,items) {
    if (category !== active) return;
    currentArticle = items[0].link;
    badge.textContent = "● CANLI HABER";
    title.textContent = items[0].title;
    subtitle.textContent = "TRT Haber" + (formatDate(items[0].date) ? " · " + formatDate(items[0].date) : "");
    line.replaceChildren();
    const b = document.createElement("b"); b.textContent = category + " · Son haberler";
    line.appendChild(b);
    items.slice(1,4).forEach(addArticle);
    hint.textContent = items.length + " haber · Başlığa dokun, haberi aç";
  }
  document.querySelectorAll(".newscat").forEach(btn =>
    btn.addEventListener("click",()=>load(btn.dataset.category,true))
  );
  load("Gündem");
  setInterval(()=>{if(!document.hidden && !busy){cache.delete(active);load(active,true);}},15*60*1000);
})();