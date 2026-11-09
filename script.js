"use strict";

/* ================= 基本資料 ================= */

const DESIGN_WIDTH = 1920;

const app = document.querySelector("#app");

const pages = [
  ...document.querySelectorAll(".page")
];

const validPageIds = new Set(
  pages.map((page) => page.id)
);

const headerTemplate = document.querySelector(
  "#header-template"
);

const footerTemplate = document.querySelector(
  "#footer-template"
);

let pendingScrollTarget = null;


/* ================= 建立共用頁首與頁尾 ================= */

document.querySelectorAll(".site-header").forEach((header) => {
  header.append(
    headerTemplate.content.cloneNode(true)
  );
});

/*
  首頁使用自己的新版 footer。
  其他頁面才加入共用頁尾內容。
*/
document.querySelectorAll(
  ".site-footer:not(.home-footer)"
).forEach((footer) => {
  footer.append(
    footerTemplate.content.cloneNode(true)
  );
});


/* ================= 電腦左右滿版 ================= */

/*
  使用瀏覽器「實際可用內容寬度」，
  不包含垂直捲軸所佔的寬度。

  例如：
  1920 / 1920 = 1
  1440 / 1920 = 0.75
  1280 / 1920 = 0.6667

  文字、圖片、座標、間距一起縮放。
*/
function fitPageToWindow() {
  const availableWidth =
    document.documentElement.clientWidth;

  if (availableWidth <= 0) return;

  const scale = availableWidth / DESIGN_WIDTH;
  const nextZoom = String(scale);

  if (app.style.zoom !== nextZoom) {
    app.style.zoom = nextZoom;
  }
}

let resizeFrame = null;

function scheduleFit() {
  if (resizeFrame !== null) return;

  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null;
    fitPageToWindow();
  });
}

window.addEventListener("resize", scheduleFit);

window.addEventListener("load", scheduleFit);

/*
  頁面長短切換時，垂直捲軸可能出現或消失。
  觀察可用寬度，確保切換後仍維持滿版。
*/
if ("ResizeObserver" in window) {
  const resizeObserver = new ResizeObserver(scheduleFit);

  resizeObserver.observe(
    document.documentElement
  );
}


/* ================= 選單關閉 ================= */

function closeMenus() {
  document.querySelectorAll(".menu-panel").forEach((menu) => {
    menu.hidden = true;
  });

  document.querySelectorAll(".menu-button").forEach((button) => {
    button.setAttribute(
      "aria-expanded",
      "false"
    );

    button.setAttribute(
      "aria-label",
      "開啟選單"
    );
  });
}


/* ================= 頁面切換 ================= */

function getPageIdFromHash() {
  const requestedId = location.hash.slice(1);

  return validPageIds.has(requestedId)
    ? requestedId
    : "age";
}

function renderPage() {
  const pageId = getPageIdFromHash();

  pages.forEach((page) => {
    page.hidden = page.id !== pageId;
  });

  document.body.classList.toggle(
    "is-age-page",
    pageId === "age"
  );

  closeMenus();

  /*
    不替所有頁面設定相同高度。
    隱藏其他頁面後，只有目前頁面參與排版。
  */
  fitPageToWindow();

  window.scrollTo({
    top: 0,
    left: 0,
    behavior: "instant"
  });

  const targetId = pendingScrollTarget;
  pendingScrollTarget = null;

  /*
    等縮放和捲軸狀態穩定後，
    再處理選單要求捲動到的區域。
  */
  requestAnimationFrame(() => {
    fitPageToWindow();

    requestAnimationFrame(() => {
      if (!targetId) return;

      const target = document.getElementById(targetId);
      const activePage = document.getElementById(pageId);

      if (target && activePage.contains(target)) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest"
        });
      }
    });
  });
}

function navigate(pageId, scrollTarget = null) {
  if (!validPageIds.has(pageId)) return;

  pendingScrollTarget = scrollTarget;

  if (location.hash === `#${pageId}`) {
    renderPage();
  } else {
    location.hash = pageId;
  }
}

window.addEventListener(
  "hashchange",
  renderPage
);


/* ================= 年齡確認 ================= */

document.querySelector("#age-yes").addEventListener(
  "click",
  () => {
    navigate("home");
  }
);

document.querySelector("#age-no").addEventListener(
  "click",
  () => {
    window.alert("未滿20歲不得吸菸。");
  }
);


/* ================= 選單開關 ================= */

document.addEventListener("click", (event) => {
  const toggleButton = event.target.closest(
    ".menu-button"
  );

  if (toggleButton) {
    const header = toggleButton.closest(
      ".site-header"
    );

    const menu = header.querySelector(
      ".menu-panel"
    );

    const shouldOpen = menu.hidden;

    closeMenus();

    menu.hidden = !shouldOpen;

    toggleButton.setAttribute(
      "aria-expanded",
      String(shouldOpen)
    );

    toggleButton.setAttribute(
      "aria-label",
      shouldOpen ? "關閉選單" : "開啟選單"
    );

    return;
  }

  /*
    點擊一般選單連結後關閉選單。
    頁面切換交給網址 hash 處理。
  */
  if (event.target.closest(".menu-panel a")) {
    closeMenus();
    return;
  }

  /*
    點選單外部也可以關閉。
  */
  if (!event.target.closest(".menu-panel")) {
    closeMenus();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenus();
  }
});


/* ================= 首頁指定區域 ================= */

document.querySelectorAll(
  "[data-scroll-target]"
).forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    navigate(
      "home",
      link.dataset.scrollTarget
    );
  });
});


/* ================= 登入展示 ================= */

/*
  目前只有前端畫面切換：
  不驗證真實帳密、不建立登入狀態，
  也不儲存或傳送密碼。

  正式使用時，需另外串接後端登入 API。
*/
const loginForm = document.querySelector(
  "#login-form"
);

/* ---------- 會員名字 ---------- */

const DEFAULT_MEMBER_NAME = "名字";
const MEMBER_NAME_KEY = "smokyGlassMemberName";

/*
  把名字顯示在所有帶有 .js-member-name 的位置：
  會員條碼頁、會員資料頁的「您好，○○」。
  使用 textContent，輸入的內容只會當純文字顯示。
*/
function setMemberName(name) {
  const displayName = name || DEFAULT_MEMBER_NAME;

  document
    .querySelectorAll(".js-member-name")
    .forEach((element) => {
      element.textContent = displayName;
      element.title = displayName;
    });
}

/* 重新整理後仍保留名字（只存在這個分頁，關閉分頁就清除） */
function saveMemberName(name) {
  try {
    sessionStorage.setItem(MEMBER_NAME_KEY, name);
  } catch (error) {
    /* 瀏覽器不允許儲存時，仍可在本次畫面正常顯示 */
  }
}

function loadMemberName() {
  try {
    return sessionStorage.getItem(MEMBER_NAME_KEY) || "";
  } catch (error) {
    return "";
  }
}

setMemberName(loadMemberName());

/* ---------- 會員資料（隨機生成） ---------- */

const MEMBER_DATA_KEY = "smokyGlassMemberData";
const BRANDS = [
  "Marlboro", "Parliament", "Kent",
  "Lucky Strike", "Mevius", "Winston", "Camel"
];
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pad(n) {
  return String(n).padStart(2, "0");
}

/* 每次登入都產生一組新的假資料 */
function createMemberData() {
  const now = new Date();
  const age = randomInt(20, 55);
  const week = Array.from({ length: 7 }, () => randomInt(1, 14));

  const records = Array.from({ length: 3 }, () => {
    const d = new Date(now);
    d.setDate(d.getDate() - randomInt(0, 3));
    d.setHours(randomInt(8, 23), randomInt(0, 59));

    if (d > now) {
      d.setTime(now.getTime() - randomInt(1, 6) * 3600000);
    }

    return {
      time: d.getTime(),
      brand: BRANDS[randomInt(0, BRANDS.length - 1)],
      count: randomInt(1, 2)
    };
  }).sort((a, b) => b.time - a.time);

  return {
    gender: Math.random() < 0.5 ? "男" : "女",
    age,
    years: randomInt(1, Math.min(25, age - 18)),
    minutes: randomInt(4, 12),
    week,
    days: week.map((_, i) =>
      WEEKDAYS[
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - (6 - i)
        ).getDay()
      ]
    ),
    records
  };
}

function saveMemberData(data) {
  try {
    sessionStorage.setItem(MEMBER_DATA_KEY, JSON.stringify(data));
  } catch (error) {}
}

function loadMemberData() {
  try {
    const data = JSON.parse(
      sessionStorage.getItem(MEMBER_DATA_KEY)
    );
    return data && data.week && data.records ? data : null;
  } catch (error) {
    return null;
  }
}

function renderMemberData(data) {
  const setStat = (key, text) => {
    document.querySelector(`[data-stat="${key}"]`).textContent = text;
  };

  setStat("gender", data.gender);
  setStat("age", `${data.age} 歲`);
  setStat("years", `${data.years} 年`);

  const total = data.week.reduce((sum, n) => sum + n, 0);
  const average = (total / 7).toFixed(1);
  const today = data.week[6];
  const diff = (today - total / 7).toFixed(1);
  const last = new Date(data.records[0].time);

  document.querySelector("#today-stats").innerHTML = `
    <div class="today-cards">
      <div><span>今日吸菸</span><strong>${today}<small> 支</small></strong></div>
      <div><span>平均每支時長</span><strong>${data.minutes}<small> 分鐘</small></strong></div>
      <div><span>上次吸菸</span><strong>${pad(last.getHours())}:${pad(last.getMinutes())}</strong></div>
    </div>
    <p>${diff >= 0 ? "高於" : "低於"}近一週平均 ${Math.abs(diff)} 支</p>`;

  document.querySelector("#week-chart").innerHTML = data.week
    .map((n, i) => `
      <div class="week-col">
        <span>${n}</span>
        <div class="week-bar" style="height:${Math.max(8, Math.min(110, (n / 14) * 110))}px"></div>
        <span>${data.days[i]}</span>
      </div>`)
    .join("");

  document.querySelector("#record-table").innerHTML =
    `<div class="record-row record-head"><span>日期</span><span>時間</span><span>菸品品牌</span><span>支數</span></div>` +
    data.records.slice(0, 3).map((r) => {
      const d = new Date(r.time);
      return `<div class="record-row"><span>${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}</span><span>${pad(d.getHours())}:${pad(d.getMinutes())}</span><span>${r.brand}</span><span>${r.count}</span></div>`;
    }).join("");

  document.querySelector("#habit-stats").innerHTML = `
    <div class="habit-row"><span>每日平均</span><strong>${average} 支</strong></div>
    <div class="habit-row"><span>平均每支時長</span><strong>${data.minutes} 分鐘</strong></div>
    <div class="habit-row"><span>本月約</span><strong>${Math.round((total / 7) * 30)} 支</strong></div>`;
}

let memberData = loadMemberData();

if (!memberData) {
  memberData = createMemberData();
  saveMemberData(memberData);
}

renderMemberData(memberData);

/* 菸品紀錄右上角的 + ：新增一筆紀錄（隨機品牌） */
document.querySelector("#add-record").addEventListener("click", () => {
  memberData.records.unshift({
    time: Date.now(),
    brand: BRANDS[randomInt(0, BRANDS.length - 1)],
    count: 1
  });
  memberData.records = memberData.records.slice(0, 10);
  memberData.week[6] += 1;

  saveMemberData(memberData);
  renderMemberData(memberData);
});

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!loginForm.reportValidity()) return;

  const memberName = document
    .querySelector("#account")
    .value.trim();

  setMemberName(memberName);
  saveMemberName(memberName);

  memberData = createMemberData();
  saveMemberData(memberData);
  renderMemberData(memberData);

  document.querySelector("#password").value = "";

  navigate("member");
});

/*
  原稿沒有可見登入按鈕，
  在輸入欄按 Enter 即可送出。
*/
loginForm.addEventListener("keydown", (event) => {
  if (
    event.key === "Enter" &&
    !event.isComposing
  ) {
    event.preventDefault();
    loginForm.requestSubmit();
  }
});


/* ================= 尚未串接的功能 ================= */

document.querySelectorAll(
  '[data-action="settings"]'
).forEach((button) => {
  button.addEventListener("click", () => {
    closeMenus();

    window.alert(
      "目前原稿未提供設定頁，可在這裡接上設定功能。"
    );
  });
});



/* ================= 初次顯示 ================= */

renderPage();