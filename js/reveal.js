const informationGrid = document.querySelector(".information-grid");
const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

if (informationGrid && !prefersReducedMotion && "IntersectionObserver" in window) {
  document.documentElement.classList.add("reveal-enabled");

  const revealObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;

      informationGrid.classList.add("is-visible");
      revealObserver.disconnect();
    },
    {
      threshold: 0.2,
      rootMargin: "0px 0px -8%",
    },
  );

  revealObserver.observe(informationGrid);
}
