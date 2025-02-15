import * as lib from "./lib.js";

const file = document.querySelector("#file");

/** @type {HTMLCanvasElement} */
const canvas = document.querySelector("#canvas");

/** @type {HTMLCanvasElement} */
const offscreen = new OffscreenCanvas(0, 0);

const options = document.querySelector("#options");
const range = document.querySelector("#range");
const inputScale = document.querySelector("#input-scale");
const outputScale = document.querySelector("#output-scale");
const contrastInput = document.querySelector("#contrast");
const select = document.querySelector("#algo");
const strip = document.querySelector("#strip");

const black = document.querySelector("#color-black");
const white = document.querySelector("#color-white");
const resetColor = document.querySelector("#color-reset");
const swapColor = document.querySelector("#color-swap");

const download = document.querySelector("#download");

const hasThreshold = ["threshold", "bayer"];

const target = {
  contrast: 0.2,
  image: null,
  algo: "bayer",
  threshold: 128,
  strip: "none",
  white: [112, 189, 205],
  black: [89, 18, 18],
  inputScale: 1,
  outputScale: 1,
};

const state = new Proxy(target, {
  async set(target, prop, receiver) {
    target[prop] = receiver;
    requestAnimationFrame(render);
    if (prop === "algo") updateOptions();
  },
});

function draw(data) {
  const w = data.width;
  const h = data.height;

  const w2 = w * state.outputScale
  const h2 = h * state.outputScale

  canvas.width = w2;
  canvas.height = h2;

  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.putImageData(data, 0, 0);
  context.drawImage(canvas, 0, 0, w, h, 0, 0, w2, h2)
}

function render() {
  const w = state.image.width * state.inputScale;
  const h = state.image.height * state.inputScale;

  offscreen.width = w;
  offscreen.height = h;

  const context = offscreen.getContext("2d", { willReadFrequently: true });
  context.drawImage(state.image, 0, 0, w, h);

  const data = context.getImageData(0, 0, w, h);

  contrast(data);
  dither(data);
  stripPixels(data);

  draw(data);
}

function stripPixels(data) {
  const skip = !(state.strip !== "none" || state.white || state.black);
  if (skip) return;

  const pixels = data.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];

    if (r > 128) {
      if (state.strip === "white") {
        pixels[i + 3] = 0;
      }

      if (state.white && state.strip !== "white") {
        pixels[i] = state.white[0];
        pixels[i + 1] = state.white[1];
        pixels[i + 2] = state.white[2];
      }
    } else {
      if (state.strip === "black") {
        pixels[i + 3] = 0;
      }

      if (state.black && state.strip !== "black") {
        pixels[i] = state.black[0];
        pixels[i + 1] = state.black[1];
        pixels[i + 2] = state.black[2];
      }
    }
  }

  return data;
}

function dither(data) {
  if (lib[state.algo]) lib[state.algo](data, state.threshold);
}

function contrast(data) {
  if (!state.contrast) return;

  const pixels = data.data;
  const clamp = (num) => {
    return Math.max(0, Math.min(255, num));
  };

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = clamp(pixels[i] + pixels[i] * state.contrast);
    pixels[i + 1] = clamp(pixels[i + 1] + pixels[i + 1] * state.contrast);
    pixels[i + 2] = clamp(pixels[i + 2] + pixels[i + 2] * state.contrast);
  }
}

function updateOptions() {
  if (hasThreshold.includes(state.algo)) {
    options.classList.add("show-threshold");
  } else {
    options.classList.remove("show-threshold");
  }
}

file.addEventListener("change", (event) => {
  const [file] = event.target.files;
  const reader = new FileReader();

  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      state.image = image;
    };
    image.src = reader.result;
  };

  reader.readAsDataURL(file);
});

function channels(hex) {
  const r = hex.substring(1, 3);
  const g = hex.substring(3, 5);
  const b = hex.substring(5, 7);

  return [r, g, b].map((c) => Number.parseInt(c, 16));
}

async function downloadImage() {
  const dataUrl = canvas.toDataURL("image/png");
  const blob = await (await fetch(dataUrl)).blob();

  const a = document.createElement("a");
  const url = URL.createObjectURL(blob);

  a.href = url;
  a.download = `${file?.files[0]?.name || "paris"}-dither.png`;
  document.body.appendChild(a);

  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}

range.addEventListener("input", (event) => {
  state.threshold = Number.parseInt(event.target.value);
});

inputScale.addEventListener("input", (event) => {
  state.inputScale = Number.parseFloat(event.target.value);
});

outputScale.addEventListener("input", (event) => {
  state.outputScale = Number.parseInt(event.target.value);
});

contrastInput.addEventListener("input", (event) => {
  state.contrast = Number.parseFloat(event.target.value);
});

select.addEventListener("input", (event) => {
  state.algo = event.target.value;
});

strip.addEventListener("input", (event) => {
  state.strip = event.target.value;
});

black.addEventListener("change", (event) => {
  state.black = channels(event.target.value);
});

white.addEventListener("change", (event) => {
  state.white = channels(event.target.value);
});

resetColor.addEventListener("click", () => {
  black.value = "#000000";
  white.value = "#FFFFFF";
  state.black = null;
  state.white = null;
});

swapColor.addEventListener("click", () => {
  [black.value, white.value] = [white.value, black.value];

  state.black = channels(black.value);
  state.white = channels(white.value);
});

download.addEventListener("click", async () => {
  await downloadImage();
});

function loadDefault() {
  const image = new Image();
  image.onload = () => {
    state.image = image;
  };
  image.src = "./default.png";
}

updateOptions();
loadDefault();
