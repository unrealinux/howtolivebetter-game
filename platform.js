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
