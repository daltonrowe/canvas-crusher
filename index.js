import * as lib from "./lib.js";

const file = document.querySelector('#file');

/** @type {HTMLCanvasElement} */
const canvas = document.querySelector('#canvas');

/** @type {HTMLCanvasElement} */
const offscreen = new OffscreenCanvas(0, 0);

const options = document.querySelector('#options');
const range = document.querySelector('#range');
const select = document.querySelector('#algo');
const strip = document.querySelector('#strip');
const download = document.querySelector('#download');

const hasThreshold = ['threshold', 'bayer']

const target = { image: null, algo: 'bayer', threshold: 128, strip: 'none' }

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
  const dithered = dither(offscreen, state.image, state.algo, state.threshold)
  const stripped = stripPixels(dithered);

  draw(stripped)
}

function stripPixels(data) {
  const pixels = data.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    if (state.strip === 'black' && r < 1) pixels[i + 3] = 0
    if (state.strip === 'white' && r > 254) pixels[i + 3] = 0
  }

  return data;
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
select.addEventListener('input', (event) => state.algo = event.target.value)
strip.addEventListener('input', (event) => state.strip = event.target.value)
download.addEventListener('click', async () => { await downloadImage() })
updateOptions();
