document.addEventListener("DOMContentLoaded", () => {
  // Цикличная анимация цены: периодически перезапускаем класс
  const priceBox = document.querySelector("[data-animate-price]");
  let priceLoopId = null;
  const startPriceLoop = () => {
    if (!priceBox || priceLoopId) return;
    const cycle = () => {
      priceBox.classList.remove("animate");
      // форсируем перерасчёт, чтобы анимация перезапускалась
      void priceBox.offsetWidth;
      priceBox.classList.add("animate");
    };
    cycle();
    priceLoopId = setInterval(cycle, 3500);
  };
  const stopPriceLoop = () => {
    if (priceLoopId) {
      clearInterval(priceLoopId);
      priceLoopId = null;
    }
  };
  if (priceBox) {
    const priceObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            startPriceLoop();
          } else {
            stopPriceLoop();
          }
        });
      },
      { threshold: 0.2 }
    );
    priceObserver.observe(priceBox);
  }

  // Хедер: изменение прозрачности при прокрутке
  const header = document.querySelector(".site-header");
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const scrolled = window.scrollY > 6;
        header.style.background = scrolled
          ? "rgba(255,255,255,0.9)"
          : "rgba(255,255,255,0.8)";
        ticking = false;
      });
      ticking = true;
    }
  });

  // Анимация шагов во втором блоке (по появлению в вьюпорте)
  const stepsSection = document.querySelector(".steps");
  if (stepsSection) {
    const stepsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            stepsSection.classList.add("revealed");
            stepsObserver.disconnect();
          }
        });
      },
      { threshold: 0.25 }
    );
    stepsObserver.observe(stepsSection);
  }

  // Кнопка Заказать: заглушка до реализации логики заказа
  const orderBtn = document.getElementById("orderBtn");
  const orderModal = document.getElementById("orderModal");
  const payBtn = document.getElementById("payBtn");
  const qtyValue = document.getElementById("itemQty");
  const itemSum = document.getElementById("itemSum");
  const orderTotal = document.getElementById("orderTotal");
  const PRICE = 600;

  const openModal = () => {
    if (orderModal) {
      orderModal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }
  };
  const closeModal = () => {
    if (orderModal) {
      orderModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
  };
  const updateTotals = () => {
    const qty = parseInt(qtyValue.textContent || "1", 10) || 1;
    const sum = qty * PRICE;
    itemSum.textContent = `${sum} р.`;
    orderTotal.textContent = `${sum} р.`;
  };

  if (orderBtn) {
    orderBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal();
      updateTotals();
    });
  }

  if (orderModal) {
    // закрытие по клику на тёмном фоне или кнопке с атрибутом data-close
    orderModal.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const isBackdrop = target === orderModal;
      const isClose =
        target.hasAttribute("data-close") || target.closest("[data-close]");
      if (isBackdrop || isClose) closeModal();
    });
    // Кнопки количества
    const decBtn = orderModal.querySelector("[data-qty-dec]");
    const incBtn = orderModal.querySelector("[data-qty-inc]");
    decBtn &&
      decBtn.addEventListener("click", () => {
        const current = Math.max(
          1,
          (parseInt(qtyValue.textContent || "1", 10) || 1) - 1
        );
        qtyValue.textContent = String(current);
        updateTotals();
      });
    incBtn &&
      incBtn.addEventListener("click", () => {
        const current = (parseInt(qtyValue.textContent || "1", 10) || 1) + 1;
        qtyValue.textContent = String(current);
        updateTotals();
      });
    // открыть системный календарь по клику на поле даты (лучше UX на iOS/desktop)
    const dateInput = document.getElementById("date");
    if (dateInput && typeof dateInput.showPicker === "function") {
      dateInput.addEventListener("click", () => {
        try {
          dateInput.showPicker();
        } catch (_) {}
      });
    }
  }

  payBtn &&
    payBtn.addEventListener("click", async () => {
      const qty =
        parseInt(document.getElementById("itemQty")?.textContent || "1", 10) ||
        1;
      const phone = document.getElementById("phone")?.value || "";
      const address = document.getElementById("address")?.value || "";
      const date = document.getElementById("date")?.value || "";
      const promo = (document.getElementById("promo")?.value || "").trim();

      // 1) Проверка/активация промокода локально в CRM (если введён)
      if (promo) {
        try {
          const resp = await fetch("/api/redeem", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: promo, usedBy: "site" }),
          });
          const data = await resp.json();
          if (!resp.ok || data.error) {
            alert(
              data.error === "not_found"
                ? "Промокод не найден"
                : data.error === "already_used"
                ? "Промокод уже использован"
                : "Ошибка промокода"
            );
            return;
          }
        } catch (e) {
          alert(
            "Не удалось проверить промокод. Проверьте, что CRM-сервер запущен на 8888."
          );
          return;
        }
      }

      // 2) Отправка уведомления в Telegram (или в лог, если токены не заданы)
      try {
        const resp = await fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qty, address, phone, date, promo }),
        });
        const data = await resp.json();
        if (!resp.ok || data.error) {
          alert("Не удалось отправить уведомление. Попробуйте ещё раз.");
          return;
        }
      } catch (e) {
        alert(
          "Сбой при отправке уведомления. Проверьте запуск локального сервера."
        );
        return;
      }

      alert("Заказ принят! Мы свяжемся с вами.");
      const orderModal = document.getElementById("orderModal");
      if (orderModal) orderModal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    });
});
