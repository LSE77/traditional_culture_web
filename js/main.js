import { initRouter } from "./router.js";
import { initHistoryPage } from "./history.js";

window.addEventListener("DOMContentLoaded", () => {
  initRouter();
  initHistoryPage();

  console.log("main.js 실행됨");
});