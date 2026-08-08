/**
 * ATOYO - DESKTOP ILOVASI (Electron).
 *
 * NEGA ELECTRON: sayt allaqachon bor va u har kuni yangilanadi.
 * Ilovada UI QAYTA YOZILMAYDI - u saytning o'zini oynada ochadi va
 * ustiga do'kon kompyuterida kerak bo'ladigan narsalarni qo'shadi:
 *
 *   • chek/etiketka chop etish (Ctrl+P, printer to'g'ridan-to'g'ri);
 *   • shtrix-kod skaneri (USB skaner klaviatura kabi ishlaydi -
 *     sanoq va sotuv sahifalarida shundoq yozadi);
 *   • do'kon ekrani (/tv) ni alohida to'liq ekranli oynada ochish -
 *     ikkinchi monitor yoki televizorga chiqarish uchun;
 *   • internet uzilganda tushunarli ekran va "Qayta urinish";
 *   • bitta nusxa (ikki marta ochilmaydi), oyna o'lchami eslab qolinadi.
 *
 * Kod SAYTNI o'zgartirmaydi - shuning uchun sayt yangilansa, ilova
 * ham avtomatik yangilangan bo'ladi (qayta o'rnatish shart emas).
 */
const { app, BrowserWindow, Menu, shell, dialog, session } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

/** Standart manzil. `ATOYO_URL` bilan yoki menyudan o'zgartiriladi. */
const DEFAULT_URL = "https://atoyo-uz.web.app";

const configPath = () => path.join(app.getPath("userData"), "config.json");

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(patch) {
  const next = { ...readConfig(), ...patch };
  try {
    fs.mkdirSync(path.dirname(configPath()), { recursive: true });
    fs.writeFileSync(configPath(), JSON.stringify(next, null, 2));
  } catch (error) {
    console.error("Sozlama saqlanmadi:", error);
  }
  return next;
}

function siteUrl() {
  const fromEnv = process.env.ATOYO_URL;
  const fromConfig = readConfig().url;
  const value = (fromEnv || fromConfig || DEFAULT_URL).trim();
  return value.replace(/\/$/, "");
}

function siteOrigin() {
  try {
    return new URL(siteUrl()).origin;
  } catch {
    return new URL(DEFAULT_URL).origin;
  }
}

let mainWindow = null;
let tvWindow = null;

function createWindow() {
  const bounds = readConfig().bounds ?? {};

  mainWindow = new BrowserWindow({
    width: bounds.width ?? 1280,
    height: bounds.height ?? 820,
    x: bounds.x,
    y: bounds.y,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#04202F",
    title: "Atoyo",
    icon: path.join(__dirname, "build", "icon.png"),
    show: false,
    webPreferences: {
      // Sayt masofadagi kod - shuning uchun izolyatsiya YOQILGAN va
      // Node API'lari sahifaga BERILMAYDI.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
      spellcheck: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  const saveBounds = () => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized()) return;
    writeConfig({ bounds: mainWindow.getNormalBounds() });
  };
  mainWindow.on("resize", saveBounds);
  mainWindow.on("move", saveBounds);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  attachGuards(mainWindow);
  void mainWindow.loadURL(siteUrl());
  return mainWindow;
}

/**
 * Oyna faqat SAYT ichida yuradi: boshqa manzillar tashqi brauzerda
 * ochiladi (Telegram havolasi, to'lov tizimi va h.k.).
 */
function attachGuards(win) {
  const origin = siteOrigin();

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(origin)) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    // Firebase/Google kirish oynalari ham ochilishi kerak.
    const allowed = [origin, "https://accounts.google.com", "https://atoyo-uz.firebaseapp.com"];
    if (allowed.some((item) => url.startsWith(item))) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  // Sichqonchaning yon tugmalari (Windows) va macOS'dagi ikki barmoq
  // surish - brauzerdagi kabi orqaga/oldinga.
  win.on("app-command", (event, command) => {
    if (command === "browser-backward" && win.webContents.navigationHistory.canGoBack()) {
      win.webContents.navigationHistory.goBack();
    } else if (command === "browser-forward" && win.webContents.navigationHistory.canGoForward()) {
      win.webContents.navigationHistory.goForward();
    }
  });

  win.on("swipe", (event, direction) => {
    if (direction === "left" && win.webContents.navigationHistory.canGoBack()) {
      win.webContents.navigationHistory.goBack();
    } else if (direction === "right" && win.webContents.navigationHistory.canGoForward()) {
      win.webContents.navigationHistory.goForward();
    }
  });

  win.webContents.on("did-fail-load", (event, code, description, url, isMainFrame) => {
    // -3 = so'rov bekor qilindi (oddiy holat, xato emas).
    if (!isMainFrame || code === -3) return;
    void win.loadFile(path.join(__dirname, "offline.html"), {
      query: { code: String(code), text: description ?? "", url: url ?? "" },
    });
  });
}

/** Do'kon ekrani (/tv) - alohida to'liq ekranli oyna. */
function openTvWindow() {
  if (tvWindow && !tvWindow.isDestroyed()) {
    tvWindow.focus();
    return;
  }
  tvWindow = new BrowserWindow({
    fullscreen: true,
    backgroundColor: "#04202F",
    title: "Do'kon ekrani",
    icon: path.join(__dirname, "build", "icon.png"),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  attachGuards(tvWindow);
  tvWindow.on("closed", () => {
    tvWindow = null;
  });
  void tvWindow.loadURL(`${siteUrl()}/tv`);
}

async function changeUrl() {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: ["Asosiy sayt", "Boshqa manzil (test)", "Bekor qilish"],
    defaultId: 0,
    cancelId: 2,
    title: "Sayt manzili",
    message: "Ilova qaysi manzilni ochsin?",
    detail: `Hozirgi manzil: ${siteUrl()}`,
  });
  if (response === 0) {
    writeConfig({ url: DEFAULT_URL });
    void mainWindow.loadURL(DEFAULT_URL);
  } else if (response === 1) {
    // Test manzili faqat ATOYO_URL orqali beriladi - ilova ichida
    // ixtiyoriy manzil terish xavfli (fishing sahifasi ochilishi mumkin).
    await dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Test manzili",
      message: "Boshqa manzilni ATOYO_URL muhit o'zgaruvchisi bilan bering.",
      detail: 'Masalan Windows"da:  set ATOYO_URL=http://localhost:3000 && Atoyo.exe',
    });
  }
}

function buildMenu() {
  const template = [
    {
      label: "Fayl",
      submenu: [
        {
          label: "Chek chop etish",
          accelerator: "CmdOrCtrl+P",
          click: () => mainWindow?.webContents.print({ silent: false, printBackground: true }),
        },
        { type: "separator" },
        { label: "Sayt manzili…", click: () => void changeUrl() },
        { type: "separator" },
        { role: "quit", label: "Chiqish" },
      ],
    },
    {
      label: "O'tish",
      submenu: [
        {
          // Windows/Linux standarti. Ctrl+←/→ esa `preload.js` da
          // (u matn maydonida yozayotganda tegmasligi kerak).
          label: "Orqaga",
          accelerator: "Alt+Left",
          click: () => {
            const history = mainWindow?.webContents.navigationHistory;
            if (history?.canGoBack()) history.goBack();
          },
        },
        {
          label: "Oldinga",
          accelerator: "Alt+Right",
          click: () => {
            const history = mainWindow?.webContents.navigationHistory;
            if (history?.canGoForward()) history.goForward();
          },
        },
        { type: "separator" },
        {
          label: "Bosh sahifa",
          accelerator: "Alt+Home",
          click: () => void mainWindow?.loadURL(siteUrl()),
        },
      ],
    },
    {
      label: "Ko'rinish",
      submenu: [
        { role: "reload", label: "Yangilash" },
        { role: "forceReload", label: "To'liq yangilash" },
        { type: "separator" },
        { role: "resetZoom", label: "Oddiy o'lcham" },
        { role: "zoomIn", label: "Kattalashtirish" },
        { role: "zoomOut", label: "Kichiklashtirish" },
        { type: "separator" },
        { role: "togglefullscreen", label: "To'liq ekran" },
        { role: "toggleDevTools", label: "Dasturchi vositalari" },
      ],
    },
    {
      label: "Tahrirlash",
      submenu: [
        { role: "undo", label: "Bekor qilish" },
        { role: "redo", label: "Qaytarish" },
        { type: "separator" },
        { role: "cut", label: "Kesish" },
        { role: "copy", label: "Nusxalash" },
        { role: "paste", label: "Qo'yish" },
        { role: "selectAll", label: "Hammasini tanlash" },
      ],
    },
    {
      label: "Do'kon",
      submenu: [
        { label: "Do'kon ekrani (televizor)", click: openTvWindow },
        {
          label: "Admin panel",
          click: () => mainWindow?.loadURL(`${siteUrl()}/admin`),
        },
        {
          label: "Katalog",
          click: () => mainWindow?.loadURL(`${siteUrl()}/katalog`),
        },
      ],
    },
    {
      label: "Yordam",
      submenu: [
        {
          label: "Dastur haqida",
          click: () =>
            void dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Atoyo",
              message: `Atoyo — do'kon ilovasi\nVersiya ${app.getVersion()}`,
              detail:
                `Manzil: ${siteUrl()}\n\n` +
                "Ilova saytning o'zini ochadi — sayt yangilansa, ilova ham " +
                "yangilangan bo'ladi.",
            }),
        },
        { label: "Saytni brauzerda ochish", click: () => void shell.openExternal(siteUrl()) },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// Bitta nusxa: ikkinchi marta ochilsa mavjud oyna oldinga chiqadi.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    // Kamera/mikrofon kabi ruxsatlar so'ralmaydi - do'kon ilovasiga
    // kerak emas (rasm yuklash oddiy fayl tanlash orqali ishlaydi).
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      callback(["clipboard-read", "clipboard-sanitized-write", "fullscreen"].includes(permission));
    });

    buildMenu();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
