const omsMark = document.querySelector(".oms-mark");
const omsLogo = omsMark?.querySelector("img");
const omsTagline = omsMark?.querySelector("h1");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const REVEAL_DURATION = 1600;
const DISTORTION_PORTION = 0.82;
const HANDOFF_START = 0.86;
const RECONSTRUCTION_STEPS = 18;
const BAYER_MATRIX = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
];

const finishPixelReveal = () => {
  window.clearTimeout(window.__omsPixelRevealFallback);
  omsMark?.style.removeProperty("--pixel-reveal-canvas-opacity");
  omsMark?.style.removeProperty("--tagline-reveal-opacity");
  omsMark?.querySelector(".pixel-reveal-canvas")?.remove();
  document.documentElement.classList.remove(
    "pixel-reveal-pending",
    "pixel-reveal-active",
  );
};

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function preparePixelated(source, scratch, targetWidth) {
  const width = Math.max(1, Math.min(Math.round(targetWidth), source.width));
  const height = Math.max(1, Math.round(source.height * (width / source.width)));
  const context = scratch.getContext("2d");

  scratch.width = width;
  scratch.height = height;
  context.imageSmoothingEnabled = true;
  context.clearRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
}

function drawPreparedPixelation(destination, scratch, width, height) {
  destination.imageSmoothingEnabled = false;
  destination.drawImage(
    scratch,
    0,
    0,
    scratch.width,
    scratch.height,
    0,
    0,
    width,
    height,
  );
}

function resolutionAt(progress, fullWidth) {
  const startingWidth = Math.min(22, fullWidth);

  return startingWidth * Math.pow(fullWidth / startingWidth, progress);
}

function applyOrderedDither(canvas, mask, strength) {
  if (strength <= 0) {
    return;
  }

  const context = canvas.getContext("2d");
  const maskContext = mask.getContext("2d");
  const image = maskContext.createImageData(4, 4);
  const removalThreshold = strength * 0.46;
  const transitionWidth = 0.14;

  BAYER_MATRIX.forEach((value, index) => {
    const threshold = (value + 0.5) / 16;
    const visibility = Math.max(
      0,
      Math.min(1, (threshold - removalThreshold) / transitionWidth + 0.5),
    );
    const pixelIndex = index * 4;
    image.data[pixelIndex] = 255;
    image.data[pixelIndex + 1] = 255;
    image.data[pixelIndex + 2] = 255;
    image.data[pixelIndex + 3] = Math.round(visibility * 255);
  });

  maskContext.putImageData(image, 0, 0);
  const pattern = context.createPattern(mask, "repeat");

  if (!pattern) {
    return;
  }

  context.save();
  context.globalCompositeOperation = "destination-in";
  context.fillStyle = pattern;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.restore();
}

function renderSignalLayer(source, destination, progress, scratch) {
  const width = source.width;
  const height = source.height;
  const baseResolution = resolutionAt(progress, width);

  preparePixelated(source, scratch.base, baseResolution);
  drawPreparedPixelation(destination, scratch.base, width, height);

  if (progress >= 1) {
    return;
  }

  // A deliberately coarse reconstruction occupies only the lower-left field.
  const blockResolution = Math.max(
    8,
    Math.round(baseResolution * (0.28 + progress * 0.72)),
  );
  preparePixelated(source, scratch.blocks, blockResolution);
  destination.save();
  destination.beginPath();
  destination.rect(0, height * 0.43, width * 0.47, height * 0.57);
  destination.clip();
  destination.clearRect(0, 0, width, height);
  drawPreparedPixelation(destination, scratch.blocks, width, height);
  destination.restore();

  // The right field resolves through a sparse ordered dither on a separate grid.
  const ditherResolution = Math.min(
    width,
    Math.max(30, Math.round(baseResolution * 1.18)),
  );
  preparePixelated(source, scratch.dither, ditherResolution);
  applyOrderedDither(scratch.dither, scratch.ditherMask, 1 - progress);
  destination.save();
  destination.beginPath();
  destination.moveTo(width * 0.59, 0);
  destination.lineTo(width, 0);
  destination.lineTo(width, height);
  destination.lineTo(width * 0.54, height);
  destination.lineTo(width * 0.54, height * 0.57);
  destination.lineTo(width * 0.61, height * 0.57);
  destination.closePath();
  destination.clip();
  destination.clearRect(0, 0, width, height);
  drawPreparedPixelation(destination, scratch.dither, width, height);
  destination.restore();
}

async function runPixelReveal() {
  if (!omsMark || !omsLogo || !omsTagline || reduceMotion) {
    finishPixelReveal();
    return;
  }

  await Promise.all([document.fonts.ready, omsLogo.decode()]);

  if (!document.documentElement.classList.contains("pixel-reveal-pending")) {
    return;
  }

  window.clearTimeout(window.__omsPixelRevealFallback);

  const markBounds = omsMark.getBoundingClientRect();
  const logoBounds = omsLogo.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const sceneWidth = Math.ceil(markBounds.width * pixelRatio);
  const sceneHeight = Math.ceil(markBounds.height * pixelRatio);
  const logoScene = createCanvas(sceneWidth, sceneHeight);
  const logoContext = logoScene.getContext("2d");

  if (!logoContext) {
    finishPixelReveal();
    return;
  }

  logoContext.scale(pixelRatio, pixelRatio);
  logoContext.filter = getComputedStyle(omsLogo).filter;
  logoContext.drawImage(
    omsLogo,
    logoBounds.left - markBounds.left,
    logoBounds.top - markBounds.top,
    logoBounds.width,
    logoBounds.height,
  );

  const coverPadding = 2 * pixelRatio;
  const logoCover = {
    x: Math.max(0, (logoBounds.left - markBounds.left) * pixelRatio - coverPadding),
    y: Math.max(0, (logoBounds.top - markBounds.top) * pixelRatio - coverPadding),
    width: Math.min(
      sceneWidth,
      logoBounds.width * pixelRatio + coverPadding * 2,
    ),
    height: Math.min(
      sceneHeight,
      logoBounds.height * pixelRatio + coverPadding * 2,
    ),
  };

  const canvas = createCanvas(sceneWidth, sceneHeight);
  canvas.className = "pixel-reveal-canvas";
  canvas.setAttribute("aria-hidden", "true");
  omsMark.append(canvas);

  const outputContext = canvas.getContext("2d");
  const logoFrame = createCanvas(sceneWidth, sceneHeight);
  const logoFrameContext = logoFrame.getContext("2d");

  if (!outputContext || !logoFrameContext) {
    canvas.remove();
    finishPixelReveal();
    return;
  }

  const createScratchSet = () => ({
    base: createCanvas(1, 1),
    blocks: createCanvas(1, 1),
    dither: createCanvas(1, 1),
    ditherMask: createCanvas(4, 4),
  });
  const logoScratch = createScratchSet();
  let startTime;
  let distortionComplete = false;
  let revealStarted = false;
  let previousReconstructionStep = -1;

  const animate = (timestamp) => {
    startTime ??= timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / REVEAL_DURATION, 1);

    if (progress >= 1) {
      omsMark.style.setProperty("--pixel-reveal-canvas-opacity", "0");
      omsMark.style.setProperty("--tagline-reveal-opacity", "1");
      window.requestAnimationFrame(finishPixelReveal);
      return;
    }

    const distortionProgress = Math.min(progress / DISTORTION_PORTION, 1);
    const reconstructionStep = Math.min(
      RECONSTRUCTION_STEPS,
      Math.floor(distortionProgress * RECONSTRUCTION_STEPS),
    );
    const steppedDistortion = reconstructionStep / RECONSTRUCTION_STEPS;
    const easedDistortion =
      steppedDistortion * steppedDistortion * (3 - 2 * steppedDistortion);
    const taglineFade =
      distortionProgress * distortionProgress * (3 - 2 * distortionProgress);

    if (!distortionComplete && reconstructionStep !== previousReconstructionStep) {
      logoFrameContext.clearRect(0, 0, sceneWidth, sceneHeight);
      renderSignalLayer(
        logoScene,
        logoFrameContext,
        easedDistortion,
        logoScratch,
      );

      outputContext.clearRect(0, 0, sceneWidth, sceneHeight);
      outputContext.fillStyle = "#000";
      outputContext.fillRect(
        logoCover.x,
        logoCover.y,
        logoCover.width,
        logoCover.height,
      );
      outputContext.drawImage(logoFrame, 0, 0);
      distortionComplete = distortionProgress >= 1;
      previousReconstructionStep = reconstructionStep;
    }

    omsMark.style.setProperty(
      "--tagline-reveal-opacity",
      taglineFade.toFixed(3),
    );

    if (!revealStarted) {
      document.documentElement.classList.add("pixel-reveal-active");
      revealStarted = true;
    }

    const rawHandoff = Math.max(
      0,
      Math.min(1, (progress - HANDOFF_START) / (1 - HANDOFF_START)),
    );
    const handoffProgress = rawHandoff * rawHandoff * (3 - 2 * rawHandoff);
    omsMark.style.setProperty(
      "--pixel-reveal-canvas-opacity",
      (1 - handoffProgress).toFixed(3),
    );

    window.requestAnimationFrame(animate);
  };

  window.requestAnimationFrame(animate);
}

runPixelReveal().catch(finishPixelReveal);
