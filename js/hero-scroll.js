const hero = document.querySelector(".oms-hero");
const heroMark = document.querySelector(".oms-mark");
const information = document.querySelector(".oms-information");
const informationLayout = document.querySelector(".information-grid");
const footer = document.querySelector(".oms-footer");

if (hero && heroMark && information && informationLayout && footer) {
  let frameRequested = false;

  const updateHeroScale = () => {
    const scaleDistance = Math.max(window.innerHeight * 0.48, 1);
    const progress = Math.max(0, Math.min(1, window.scrollY / scaleDistance));
    const easedProgress = progress * progress * (3 - 2 * progress);
    const finalScale = 0.8;
    const scale = 1 - easedProgress * (1 - finalScale);
    const rootFontSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    const baseRestingTop = Math.max(
      48,
      Math.min(72, window.innerHeight * 0.07),
    );
    const baseMarkTop = baseRestingTop + rootFontSize * 0.4;
    const baseMarkHeight = heroMark.offsetHeight * 0.68;
    const contentOffset = Math.max(55, Math.min(28, window.innerHeight * 0.225));
    const baseInformationTop =
      baseMarkTop * 2 + baseMarkHeight + contentOffset;
    const informationMinHeight = Number.parseFloat(
      getComputedStyle(information).minHeight,
    );
    const initialClearance = Math.max(
      24,
      Math.min(48, window.innerHeight * 0.04),
    );
    const belowFoldPadding = Math.max(
      0,
      window.innerHeight - hero.clientHeight + initialClearance,
    );
    const baseInformationPadding = Math.max(
      0,
      baseInformationTop + informationMinHeight - window.innerHeight,
      belowFoldPadding,
    );
    const actualBaseInformationTop =
      window.innerHeight - informationMinHeight + baseInformationPadding;
    const informationStyles = getComputedStyle(information);
    const naturalFooterTop =
      window.innerHeight -
      Number.parseFloat(informationStyles.paddingBottom) -
      footer.offsetHeight;
    const naturalContentGap = Math.max(
      0,
      naturalFooterTop -
        (actualBaseInformationTop + informationLayout.offsetHeight),
    );
    const desiredInformationTop =
      actualBaseInformationTop + naturalContentGap * 0.3;
    const informationPadding = Math.max(
      0,
      desiredInformationTop + informationMinHeight - window.innerHeight,
      belowFoldPadding,
    );
    document.documentElement.classList.toggle(
      "oms-has-scrolled",
      window.scrollY > 1,
    );
    heroMark.style.setProperty("--oms-scroll-scale", scale.toFixed(4));
    information.style.setProperty(
      "--oms-information-padding-top",
      `${informationPadding.toFixed(2)}px`,
    );
    footer.style.removeProperty("--oms-footer-lift");

    const informationGridDocumentTop =
      information.offsetTop + informationLayout.offsetTop;
    const maximumScroll = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const informationTopAtBottom =
      informationGridDocumentTop - maximumScroll;
    const finalMarkHeight = heroMark.offsetHeight * finalScale;
    const finalMarkTop = Math.max(
      0,
      (informationTopAtBottom - finalMarkHeight) / 2,
    );
    const finalOffset =
      finalMarkTop - heroMark.offsetTop - rootFontSize * 0.4;
    const offset = easedProgress * finalOffset;

    heroMark.style.setProperty("--oms-scroll-offset", `${offset.toFixed(2)}px`);
    frameRequested = false;
  };

  const requestHeroScaleUpdate = () => {
    if (frameRequested) {
      return;
    }

    frameRequested = true;
    window.requestAnimationFrame(updateHeroScale);
  };

  updateHeroScale();
  window.addEventListener("scroll", requestHeroScaleUpdate, { passive: true });
  window.addEventListener("resize", requestHeroScaleUpdate);
  window.addEventListener("pageshow", requestHeroScaleUpdate);
  document.fonts?.ready.then(requestHeroScaleUpdate);
}
