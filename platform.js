// 平台适配：微信小游戏 和 浏览器 各一套。别的文件都通过这里拿画布和输入。
(function () {
  const G = typeof GameGlobal !== "undefined" ? GameGlobal : globalThis;
  const IS_WX = typeof wx !== "undefined" && typeof wx.createCanvas === "function";

  const Platform = {
    isWx: IS_WX,

    sys() {
      if (IS_WX) {
        const i = wx.getSystemInfoSync();
        const safe = i.safeArea;
        return {
          w: i.windowWidth,
          h: i.windowHeight,
          dpr: i.pixelRatio || 1,
          safeTop: safe ? safe.top : 0,
          safeBottom: safe ? Math.max(0, i.screenHeight - safe.bottom) : 0,
        };
      }
      return { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio || 1, safeTop: 0, safeBottom: 0 };
    },

    canvas() {
      return IS_WX ? wx.createCanvas() : document.getElementById("c");
    },

    // cb(x, y) —— 按下、拖动、抬起
    bind(handlers) {
      if (IS_WX) {
        wx.onTouchStart((e) => handlers.start(e.touches[0].clientX, e.touches[0].clientY));
        wx.onTouchMove((e) => handlers.move(e.touches[0].clientX, e.touches[0].clientY));
        wx.onTouchEnd((e) => {
          const t = e.changedTouches[0];
          handlers.end(t.clientX, t.clientY);
        });
        return;
      }
      const c = document.getElementById("c");
      const at = (e) => {
        const r = c.getBoundingClientRect();
        return [e.clientX - r.left, e.clientY - r.top];
      };
      c.addEventListener("pointerdown", (e) => handlers.start(...at(e)));
      c.addEventListener("pointermove", (e) => handlers.move(...at(e)));
      c.addEventListener("pointerup", (e) => handlers.end(...at(e)));
      c.addEventListener("pointercancel", (e) => handlers.end(...at(e)));

      // 键盘：1/2/3 选选项，回车/空格点底部按钮。小游戏没键盘，不绑
      window.addEventListener("keydown", (e) => {
        if (e.key >= "1" && e.key <= "3") handlers.key("pick", Number(e.key) - 1);
        else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handlers.key("action");
        }
      });
    },

    // 存档：小游戏用 wx storage，网页用 localStorage
    save(data) {
      try {
        if (IS_WX) wx.setStorageSync("htlb.save", data);
        else localStorage.setItem("htlb.save", data);
      } catch (e) {
        // 无痕模式等写不进去：本局照常玩，只是关掉就没了
      }
    },

    load() {
      try {
        const v = IS_WX ? wx.getStorageSync("htlb.save") : localStorage.getItem("htlb.save");
        return v || null;
      } catch (e) {
        return null;
      }
    },

    clear() {
      try {
        if (IS_WX) wx.removeStorageSync("htlb.save");
        else localStorage.removeItem("htlb.save");
      } catch (e) {
        // 同上
      }
    },

    // 结局分享：能拉起系统分享就拉，否则退回复制。都返回 Promise<boolean>
    share(text) {
      if (!IS_WX && navigator.share) return navigator.share({ text }).then(() => true, () => false);
      return this.copy(text);
    },

    copy(text) {
      if (IS_WX) {
        return new Promise((resolve) => {
          wx.setClipboardData({
            data: text,
            success() {
              wx.showToast({ title: "已复制，去粘给朋友", icon: "none", duration: 2000 });
              resolve(true);
            },
            fail() { resolve(false); },
          });
        });
      }
      if (navigator.clipboard) return navigator.clipboard.writeText(text).then(() => true, () => false);
      window.prompt("复制这段：", text);
      return Promise.resolve(false);
    },

    // 小游戏里打不开外链，只能复制
    openURL(url) {
      if (IS_WX) {
        wx.setClipboardData({
          data: url,
          success() {
            wx.showToast({ title: "链接已复制，去浏览器打开", icon: "none", duration: 2500 });
          },
        });
        return;
      }
      window.open(url, "_blank", "noopener");
    },
  };

  G.Platform = Platform;
  if (typeof module === "object" && module.exports) module.exports = Platform;
})();
