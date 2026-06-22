export function initRouter() {
  const navButtons = document.querySelectorAll("[data-page]");
  const pages = document.querySelectorAll(".page");

  navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetPage = button.dataset.page;

      if (!targetPage) return;

      pages.forEach((page) => {
        page.classList.remove("active");
      });

      const selectedPage = document.getElementById(`${targetPage}-page`);

      if (selectedPage) {
        selectedPage.classList.add("active");
      }

      document.querySelectorAll(".nav-btn").forEach((navBtn) => {
        navBtn.classList.remove("active");
      });

      if (button.classList.contains("nav-btn")) {
        button.classList.add("active");
      }
    });
  });
}