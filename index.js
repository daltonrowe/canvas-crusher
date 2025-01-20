import * as lib from "./lib.js";

/** @type {HTMLImageElement} */
const file = document.querySelector('#file');

/** @type {HTMLCanvasElement} */
const canvas = document.querySelector('#canvas');

/** @type {HTMLCanvasElement} */
const offscreen = new OffscreenCanvas(0, 0);

const range = document.querySelector('#range');
const select = document.querySelector('#algo');

const target = { image: null, algo: 'bayer', threshold: 128 }

const state = new Proxy(target, {
  async set(target, prop, receiver) {
    if (prop === 'image') {
      offscreen.width = receiver.width
    }

    target[prop] = receiver
    requestAnimationFrame(render)
  }
});

function draw(canvas, data) {
  canvas.width = data.width;
  canvas.height = data.height;

  const context = canvas.getContext('2d');
  context.putImageData(data, 0, 0)
}

function render() {
  const dithered = dither(offscreen, state.image, state.algo, state.threshold)
  draw(canvas, dithered)
}

function dither(canvas, image, algo, thres) {
  canvas.width = image.width;
  canvas.height = image.height

  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0)

  const data = context.getImageData(0, 0, canvas.width, canvas.height);

  if (lib[algo]) return lib[algo](data, thres)
  return data
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

range.addEventListener('input', (event) => state.threshold = parseInt(event.target.value))
select.addEventListener('input', (event) => state.algo = event.target.value)
