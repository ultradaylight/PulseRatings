function handleNavClick(page) {
  console.log(`Navigated to ${page}`);
  // Placeholder: Add routing logic for pulseratings/<page> later
  // Hide mobile menu after clicking a link
  const mobileMenu = document.getElementById("mobileMenu");
  if (mobileMenu) {
    mobileMenu.classList.add("hidden");
    const hamburgerBtn = document.getElementById("hamburgerBtn");
    if (hamburgerBtn) hamburgerBtn.textContent = "☰";
    // Hide footer when mobile menu is closed
    const footer = document.querySelector("footer");
    if (footer) {
      footer.classList.remove("fixed", "bottom-0", "left-0", "right-0", "z-10");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const mobileMenu = document.getElementById("mobileMenu");
  
  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener("click", () => {
      console.log("Hamburger button clicked");
      mobileMenu.classList.toggle("hidden");
      hamburgerBtn.textContent = mobileMenu.classList.contains("hidden") ? "☰" : "✕";
      console.log(`Mobile menu is now ${mobileMenu.classList.contains("hidden") ? "hidden" : "visible"}`);
      
      // Toggle footer fixed positioning based on mobile menu visibility
      const footer = document.querySelector("footer");
      if (footer) {
        if (mobileMenu.classList.contains("hidden")) {
          // Mobile menu is hidden, make footer regular
          footer.classList.remove("fixed", "bottom-0", "left-0", "right-0", "z-10");
        } else {
          // Mobile menu is visible, fix footer to bottom
          footer.classList.add("fixed", "bottom-0", "left-0", "right-0", "z-10");
        }
      }
    });

    // Add event listeners to mobile menu links
    const mobileLinks = mobileMenu.querySelectorAll("a");
    mobileLinks.forEach(link => {
      const page = link.textContent.trim(); // Extract page name from link text
      link.addEventListener("click", (event) => {
        if (link.getAttribute("href") === "https://aurelips.com/") {
          // For Aurelips, allow default behavior (open in new tab) and close menu
          handleNavClick(page);
        } else {
          // For other links, prevent default and navigate in current tab
          event.preventDefault();
          handleNavClick(page);
          window.location.href = link.getAttribute("href");
        }
      });
    });
  } else {
    console.error("Hamburger button or mobile menu not found");
  }
});
