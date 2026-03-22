window.ObserverUtils = {
  observeDOM(target, callback, options = {}) {
    const obs = new MutationObserver(callback);
    obs.observe(target || document.body, { childList: true, subtree: true, ...options });
    return obs;
  }
};
