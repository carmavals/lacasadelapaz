// --- p5.js + mappa.js ---
// Reworked to attach main map canvas into a #map container to avoid body overflow
// and to create three additional stacked canvases (using p5 instance mode) inside
// #sketch-a, #sketch-b, #sketch-c.

let mappa;
let myMap;
let mapCanvas;
let imgs = [];
let popupActivo = null;

const options = {
  lat: 4.705080263533609,
  lng: -74.08241603470928,
  zoom: 12,
  style: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
};

// Puntos con información (same as before)
let puntos = [
  { lat: 4.624872641950023, lng: -74.06789781939149, nombre: "Casa de la Paz", descripcion: "Espacio comunitario y cultural.", img: "assets/casitapaz.jpg" },
  { lat: 4.6101134849575764, lng: -74.18468699431672, nombre: "Skafuche", descripcion: "Centro social y artístico.", img: "assets/skafuche.jpg" },
  { lat: 4.6171544056693286, lng: -74.06177707628522, nombre: "Mutualitos y Mutualitas", descripcion: "Red de apoyo comunitario.", img: "assets/mochila.jpg" },
  { lat: 4.638375081942084, lng: -74.18635666279167, nombre: "Huerta Chisas", descripcion: "Proyecto agroecológico y educativo.", img: "assets/huertachisas.jpg" },
  { lat: 4.7395655698489225, lng: -74.07585071561883, nombre: "Tamboras de Suba", descripcion: "Colectivo musical y cultural.", img: "assets/tamboras.jpg" },
  { lat: 4.7408676572677475, lng: -74.1087921353675, nombre: "Casa Memoria", descripcion: "Espacio de memoria viva.", img: "assets/logo1.jpg" },
  { lat: 4.70, lng: -74.10, nombre: "Punto 7", descripcion: "Lugar experimental.", img: "assets/mochila.jpg" },
  { lat: 4.72, lng: -74.07, nombre: "Punto 8", descripcion: "Zona de encuentro.", img: "assets/mochila.jpg" },
  { lat: 4.73, lng: -74.08, nombre: "Punto 9", descripcion: "Espacio abierto.", img: "assets/mochila.jpg" }
];

let puntosOriginales = []; // para restaurar luego

// Preload images for puntos
function preload() {
  for (let i = 0; i < puntos.length; i++) {
    imgs[i] = loadImage(puntos[i].img);
  }
}

// Create the main map canvas inside the #map element
function setup() {
  // find the map container and use its width to create a canvas that fits
  const mapContainer = document.getElementById('map');
  const containerWidth = mapContainer ? mapContainer.clientWidth : windowWidth;
  const canvasHeight = 600; // fixed height for the map canvas

  mapCanvas = createCanvas(containerWidth, canvasHeight);
  // attach canvas inside the #map container
  if (mapContainer) mapCanvas.parent('map');
  else mapCanvas.position(0, 0);

  mappa = new Mappa('Leaflet');
  myMap = mappa.tileMap(options);
  myMap.overlay(mapCanvas);

  imageMode(CENTER);
  textAlign(CENTER);
  textSize(14);
  noStroke();

  // Guardar copia original
  puntosOriginales = structuredClone(puntos);

  // Buttons placed relative to the map container instead of absolute page coords
  const btnContainer = document.createElement('div');
  btnContainer.style.position = 'absolute';
  btnContainer.style.left = '14px';
  btnContainer.style.top = (canvasHeight + 12) + 'px';
  btnContainer.style.zIndex = 9999;
  btnContainer.id = 'map-btns';
  if (mapContainer) mapContainer.appendChild(btnContainer);

  let botonLimpiar = createButton('Limpiar puntos');
  botonLimpiar.parent(btnContainer);
  botonLimpiar.mousePressed(() => {
    puntos = [];
    popupActivo = null;
  });

  let botonRestaurar = createButton('Restaurar puntos');
  botonRestaurar.parent(btnContainer);
  botonRestaurar.mousePressed(restaurarPuntos);
}

function draw() {
  clear();

  // Dibujar imágenes por punto
  for (let i = 0; i < puntos.length; i++) {
    let pos = myMap.latLngToPixel(puntos[i].lat, puntos[i].lng);
    image(imgs[i], pos.x, pos.y, 40, 40);
  }

  // Dibujar popup si hay uno activo
  if (popupActivo) {
    fill(255);
    stroke(0);
    rectMode(CENTER);
    rect(popupActivo.x, popupActivo.y - 60, 220, 70, 10);
    noStroke();
    fill(0);
    text(popupActivo.texto, popupActivo.x, popupActivo.y - 60);
  }
}

// Clic sobre un punto
function mousePressed() {
  popupActivo = null;
  for (let i = 0; i < puntos.length; i++) {
    let pos = myMap.latLngToPixel(puntos[i].lat, puntos[i].lng);
    let d = dist(mouseX, mouseY, pos.x, pos.y);
    if (d < 25) {
      popupActivo = {
        x: pos.x,
        y: pos.y,
        texto: puntos[i].nombre + "\n" + puntos[i].descripcion
      };
      break;
    }
  }
}

// Restaurar puntos originales
function restaurarPuntos() {
  puntos = structuredClone(puntosOriginales);
  popupActivo = null;
}

function windowResized() {
  // resize main map canvas to fit its container width
  const mapContainer = document.getElementById('map');
  const newWidth = mapContainer ? mapContainer.clientWidth : windowWidth;
  const newHeight = 600; // keep constant height for map canvas
  resizeCanvas(newWidth, newHeight);
}

// --- Additional stacked sketches (three canvases) ---
// Each sketch draws a simple animated background; they are created in p5 instance mode
// and attach to divs with ids: sketch-a, sketch-b, sketch-c

function makeSketch(id, colorA, colorB) {
  return function(p) {
    let w, h;
    p.setup = function() {
      const parent = document.getElementById(id);
      w = parent ? parent.clientWidth : windowWidth;
      h = 320;
      p.createCanvas(w, h);
      p.noStroke();
    };
    p.draw = function() {
      // simple animated gradient
      const t = p.millis() * 0.0002;
      for (let y = 0; y < p.height; y++) {
        const n = p.map(y, 0, p.height, 0, 1);
        const r = p.lerp(colorA[0], colorB[0], n + 0.12 * Math.sin(t + y * 0.01));
        const g = p.lerp(colorA[1], colorB[1], n);
        const b = p.lerp(colorA[2], colorB[2], n - 0.08 * Math.cos(t + y * 0.013));
        p.fill(r, g, b);
        p.rect(0, y, p.width, 1);
      }
    };
    p.windowResized = function() {
      const parent = document.getElementById(id);
      const newW = parent ? parent.clientWidth : windowWidth;
      p.resizeCanvas(newW, h);
    };
  };
}

// create three sketches when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  new p5(makeSketch('sketch-a', [24,18,38], [191,145,234]));
  new p5(makeSketch('sketch-b', [8,20,12], [126,26,96]));
  new p5(makeSketch('sketch-c', [10,10,20], [242,234,105]));
});
