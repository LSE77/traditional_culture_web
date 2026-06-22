export function initRouter() {
  const pageButtons = document.querySelectorAll("[data-page]");
  const pages = document.querySelectorAll(".page");
  const navButtons = document.querySelectorAll(".nav-btn");

  function moveToPage(pageName) {
    console.log("이동할 페이지:", pageName);

    pages.forEach((page) => {
      page.classList.remove("active");
      page.style.display = "none";
    });

    const targetPage = document.getElementById(`${pageName}-page`);

    if (!targetPage) {
      console.error(`페이지를 찾을 수 없습니다: ${pageName}-page`);
      return;
    }

    targetPage.classList.add("active");
    targetPage.style.display = "block";

    navButtons.forEach((button) => {
      button.classList.remove("active");

      if (button.dataset.page === pageName) {
        button.classList.add("active");
      }
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  pageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const pageName = button.dataset.page;
      moveToPage(pageName);
    });
  });

  moveToPage("home");
}