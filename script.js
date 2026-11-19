/* ==========================================================
   Body Scent — script.js (ใช้ร่วมทุกหน้า)
   ตรวจจาก element ในหน้านั้นๆ ว่าต้องรันฟังก์ชันไหน
   - product.html : #product-list
   - order.html   : #orderForm
   - admin.html   : #ordersTable
   ========================================================== */

(function () {
  "use strict";

  var ORDERS_KEY = "bodyScentOrders";

  var MOODS = [
    { key: "all", label: "ทั้งหมด" },
    { key: "fresh", label: "Fresh" },
    { key: "sweet", label: "Sweet" },
    { key: "confident", label: "Confident" },
    { key: "romance", label: "Romance" }
  ];

  /* ---------- helpers ---------- */

  function formatPrice(value) {
    var n = Number(value);
    return (isFinite(n) ? n.toLocaleString("th-TH") : "-") + " บาท";
  }

  function isFormField(el) {
    return /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
  }

  function setField(el, value) {
    if (!el) return;
    if (isFormField(el)) {
      el.value = value;
    } else {
      el.textContent = value;
    }
  }

  function getField(el) {
    if (!el) return "";
    return (isFormField(el) ? el.value : el.textContent).trim();
  }

  function makeEl(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  }

  function readOrders() {
    try {
      var data = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("อ่านคำสั่งซื้อไม่สำเร็จ:", err);
      return [];
    }
  }

  /* ==========================================================
     product.html
     ========================================================== */

  function initProductPage(listEl) {
    var filterBar = document.getElementById("filter-bar");
    var products = [];
    var validMoods = MOODS.map(function (m) {
      return m.key;
    });

    var params = new URLSearchParams(window.location.search);
    var requested = (params.get("mood") || "").toLowerCase();
    var currentMood = validMoods.indexOf(requested) !== -1 ? requested : "all";

    function buildOrderUrl(p) {
      var itemName = p.name + (p.size ? " " + p.size : "");
      var qs = new URLSearchParams({ item: itemName, price: p.price });
      return "order.html?" + qs.toString();
    }

    function buildCard(p) {
      var card = makeEl("article", "product-card");
      card.setAttribute("data-mood", p.mood);

      var imgWrap = makeEl("div", "product-card__image");
      var img = document.createElement("img");
      img.src = p.image;
      img.alt = p.name;
      img.loading = "lazy";
      imgWrap.appendChild(img);

      var body = makeEl("div", "product-card__body");

      var meta = makeEl("div", "product-card__meta");
      var tag = makeEl("span", "mood-tag");
      tag.appendChild(makeEl("span", "mood-dot"));
      tag.appendChild(
        makeEl("span", "", p.mood.charAt(0).toUpperCase() + p.mood.slice(1))
      );
      var typeLabel = p.type === "rollon" ? "โรลออน" : "สเปรย์";
      meta.appendChild(tag);
      meta.appendChild(
        makeEl("span", "", p.size ? typeLabel + " · " + p.size : typeLabel)
      );

      var footer = makeEl("div", "product-card__footer");
      footer.appendChild(makeEl("span", "price", formatPrice(p.price)));
      var buy = makeEl("a", "btn btn--small", "สั่งซื้อ");
      buy.href = buildOrderUrl(p);
      footer.appendChild(buy);

      body.appendChild(meta);
      body.appendChild(makeEl("h3", "", p.name));
      body.appendChild(makeEl("p", "", p.description));
      body.appendChild(footer);

      card.appendChild(imgWrap);
      card.appendChild(body);
      return card;
    }

    function render() {
      listEl.textContent = "";
      var shown = products.filter(function (p) {
        return currentMood === "all" || p.mood === currentMood;
      });

      if (shown.length === 0) {
        listEl.appendChild(makeEl("p", "", "ยังไม่มีสินค้าในหมวดนี้"));
        return;
      }
      shown.forEach(function (p) {
        listEl.appendChild(buildCard(p));
      });
    }

    function updateButtons() {
      if (!filterBar) return;
      var buttons = filterBar.querySelectorAll("button");
      Array.prototype.forEach.call(buttons, function (btn) {
        var active = btn.getAttribute("data-mood") === currentMood;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    function setMood(mood) {
      currentMood = mood;
      updateButtons();
      render();

      // อัปเดต URL ให้แชร์/รีเฟรชแล้วยังกรองเหมือนเดิม
      try {
        var url = new URL(window.location.href);
        if (mood === "all") {
          url.searchParams.delete("mood");
        } else {
          url.searchParams.set("mood", mood);
        }
        window.history.replaceState(null, "", url.toString());
      } catch (err) {
        /* ไม่เป็นไร ถ้าอัปเดต URL ไม่ได้ */
      }
    }

    function buildFilterBar() {
      if (!filterBar) return;
      filterBar.classList.add("mood-filter");
      filterBar.textContent = "";
      MOODS.forEach(function (m) {
        var btn = makeEl("button", "");
        btn.type = "button";
        btn.setAttribute("data-mood", m.key);
        if (m.key !== "all") {
          var dotWrap = makeEl("span", "mood-dot");
          dotWrap.setAttribute("data-mood", m.key);
          dotWrap.style.background = "var(--mood)";
          btn.appendChild(dotWrap);
        }
        btn.appendChild(makeEl("span", "", m.label));
        btn.addEventListener("click", function () {
          setMood(m.key);
        });
        filterBar.appendChild(btn);
      });
      updateButtons();
    }

    buildFilterBar();
    listEl.textContent = "";
    listEl.appendChild(makeEl("p", "", "กำลังโหลดสินค้า..."));

    fetch("products.json")
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        products = Array.isArray(data) ? data : [];
        render(); // กรองตาม ?mood=xxx ตั้งแต่โหลด
      })
      .catch(function (err) {
        console.error("โหลด products.json ไม่สำเร็จ:", err);
        listEl.textContent = "";
        listEl.appendChild(
          makeEl("p", "", "โหลดข้อมูลสินค้าไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง")
        );
      });
  }

  /* ==========================================================
     order.html
     ========================================================== */

  function initOrderPage(form) {
    var itemsEl = document.getElementById("items");
    var totalEl = document.getElementById("total");

    // เติมทั้ง #items และ #total เสมอ (ถ้าไม่มีค่าใน URL ให้เป็นค่าว่าง)
    var params = new URLSearchParams(window.location.search);
    setField(itemsEl, params.get("item") || "");
    setField(totalEl, params.get("price") || "");

    function field(name) {
      var el = form.elements[name];
      return el && el.value !== undefined ? String(el.value).trim() : "";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (typeof form.reportValidity === "function" && !form.reportValidity()) {
        return;
      }

      var totalRaw = getField(totalEl);
      var totalNum = Number(totalRaw);

      var payload = {
        customerName: field("customerName"),
        contact: field("contact"),
        items: getField(itemsEl),
        total: totalRaw !== "" && isFinite(totalNum) ? totalNum : totalRaw,
        note: field("note"),
        timestamp: new Date().toISOString()
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        var orders = readOrders();
        orders.push(payload);
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      } catch (err) {
        console.error("บันทึกคำสั่งซื้อไม่สำเร็จ:", err);
        alert("บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง");
        if (submitBtn) submitBtn.disabled = false;
        return;
      }

      window.location.href = "thankyou.html";
    });
  }

  /* ==========================================================
     admin.html
     ========================================================== */

  function initAdminPage(table) {
    var tbody = table.querySelector("tbody");
    if (!tbody) return;

    var orders = readOrders().slice().sort(function (a, b) {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    tbody.textContent = "";

    if (orders.length === 0) {
      var colCount = table.querySelectorAll("thead th").length || 6;
      var tr = document.createElement("tr");
      var td = makeEl("td", "", "ยังไม่มีคำสั่งซื้อ");
      td.colSpan = colCount;
      td.style.textAlign = "center";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    orders.forEach(function (o) {
      var tr = document.createElement("tr");
      var date = new Date(o.timestamp);
      var dateText = isNaN(date.getTime())
        ? "-"
        : date.toLocaleString("th-TH");
      var totalText =
        o.total !== "" && o.total !== undefined && isFinite(Number(o.total))
          ? formatPrice(o.total)
          : "-";

      // ลำดับคอลัมน์: วันที่ | ชื่อ | ช่องทางติดต่อ | รายการ | ยอดรวม | หมายเหตุ
      [
        dateText,
        o.customerName || "-",
        o.contact || "-",
        o.items || "-",
        totalText,
        o.note || "-"
      ].forEach(function (text) {
        tr.appendChild(makeEl("td", "", text));
      });
      tbody.appendChild(tr);
    });
  }

  /* ==========================================================
     เริ่มทำงาน: ตรวจว่าหน้านี้มี element อะไร
     ========================================================== */

  document.addEventListener("DOMContentLoaded", function () {
    var productList = document.getElementById("product-list");
    var orderForm = document.getElementById("orderForm");
    var ordersTable = document.getElementById("ordersTable");

    if (productList) initProductPage(productList);
    if (orderForm) initOrderPage(orderForm);
    if (ordersTable) initAdminPage(ordersTable);
  });
})();
