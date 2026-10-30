// Mobile menu: open/close the main menu and the "About Us" drop-down.
document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("main-menu");

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open);
    });

    // Close the menu after following an in-page link such as "#contact".
    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.querySelectorAll(".submenu-toggle").forEach(function (button) {
    button.addEventListener("click", function () {
      var submenu = button.nextElementSibling;
      var open = submenu.classList.toggle("is-open");
      button.setAttribute("aria-expanded", open);
    });
  });
});
