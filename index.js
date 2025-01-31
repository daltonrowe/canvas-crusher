import * as lib from "./lib.js";

const file = document.querySelector('#file');

/** @type {HTMLCanvasElement} */
const canvas = document.querySelector('#canvas');

/** @type {HTMLCanvasElement} */
const offscreen = new OffscreenCanvas(0, 0);

const options = document.querySelector('#options');
const range = document.querySelector('#range');
const contrastInput = document.querySelector('#contrast');
const select = document.querySelector('#algo');
const strip = document.querySelector('#strip');

const black = document.querySelector('#color-black');
const white = document.querySelector('#color-white');
const resetColor = document.querySelector('#color-reset');

const download = document.querySelector('#download');

const hasThreshold = ['threshold', 'bayer']

const target = { contrast: 0.2, image: null, algo: 'bayer', threshold: 128, strip: 'black', white: null, black: null }

const state = new Proxy(target, {
  async set(target, prop, receiver) {

    target[prop] = receiver
    requestAnimationFrame(render)
    if (prop === 'algo') updateOptions();
  }
});

function draw(data) {
  canvas.width = data.width;
  canvas.height = data.height;

  const context = canvas.getContext('2d');
  context.putImageData(data, 0, 0)
}

function render() {
  offscreen.width = state.image.width;
  offscreen.height = state.image.height

  const context = offscreen.getContext('2d');
  context.drawImage(state.image, 0, 0)

  const data = context.getImageData(0, 0, state.image.width, state.image.height);

  contrast(data)
  dither(data)
  stripPixels(data);

  draw(data)
}

function stripPixels(data) {
  const skip = !(state.strip !== 'none' || state.white || state.black)
  if (skip) return;

  const pixels = data.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]

    if (r > 128) {
      if (state.strip === 'white') {
        pixels[i + 3] = 0
        continue;
      } else if (state.white) {
        pixels[i] = state.white[0]
        pixels[i + 1] = state.white[1]
        pixels[i + 2] = state.white[2]
      }
    } else {
      if (state.strip === 'black') {
        pixels[i + 3] = 0
        continue;
      } else if (state.black) {
        pixels[i] = state.black[0]
        pixels[i + 1] = state.black[1]
        pixels[i + 2] = state.black[2]
      }
    }
  }

  return data;
}

function dither(data) {
  if (lib[state.algo]) lib[state.algo](data, state.threshold)
}

function contrast(data) {
  if (!state.contrast) return

  const pixels = data.data;
  const clamp = (num) => {
    return Math.max(0, Math.min(255, num))
  }

  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = clamp(pixels[i] + (pixels[i] * state.contrast));
    pixels[i + 1] = clamp(pixels[i + 1] + (pixels[i + 1] * state.contrast));
    pixels[i + 2] = clamp(pixels[i + 2] + (pixels[i + 2] * state.contrast));
  }
}

function updateOptions() {
  if (hasThreshold.includes(state.algo)) {
    options.classList.add('show-threshold')
  }
  else {
    options.classList.remove('show-threshold')
  }
}

file.addEventListener('change', (event) => {
  const [file] = event.target.files
  const reader = new FileReader()

  reader.onload = () => {
    const image = new Image();
    image.onload = () => state.image = image
    image.src = reader.result
  }

  reader.readAsDataURL(file)
})

function channels(hex) {
  const r = hex.substring(1, 3)
  const g = hex.substring(3, 5)
  const b = hex.substring(5, 7)

  return [r, g, b].map(c => parseInt(c, 16))
}

async function downloadImage() {
  const dataUrl = canvas.toDataURL("image/png");
  const blob = await (await fetch(dataUrl)).blob();

  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);

  a.href = url;
  a.download = `${file.files[0].name}-dither.png`;
  document.body.appendChild(a);

  a.click();

  setTimeout(function () {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 0);
}

range.addEventListener('input', (event) => state.threshold = parseInt(event.target.value))
contrastInput.addEventListener('input', (event) => state.contrast = parseFloat(event.target.value))
select.addEventListener('input', (event) => state.algo = event.target.value)
strip.addEventListener('input', (event) => state.strip = event.target.value)
black.addEventListener('change', (event) => state.black = channels(event.target.value))
white.addEventListener('change', (event) => state.white = channels(event.target.value))
resetColor.addEventListener('click', () => {
  black.value = "#000000"
  white.value = "#FFFFFF"
  state.black = null; state.white = null;
})
download.addEventListener('click', async () => { await downloadImage() })

function loadDefault() {
  const image = new Image();
  image.onload = () => state.image = image
  image.src = './default.png'
}

updateOptions();
loadDefault();
