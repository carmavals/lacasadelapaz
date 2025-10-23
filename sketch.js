// --- p5.js + mappa.js ---
// Mapa con imágenes individuales, popups y botones de control

let mappa;
let myMap;
let canvas;
let imgs = [];
let popupActivo = null;

const options = {
  lat: 4.705080263533609,
  lng: -74.08241603470928,
  zoom: 12,
  style: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
};

// Puntos con información
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

function preload() {
  for (let i = 0; i < puntos.length; i++) {
    imgs[i] = loadImage(puntos[i].img);
  }
}

function setup() {
  canvas = createCanvas(windowWidth, 800);
  mappa = new Mappa('Leaflet');
  myMap = mappa.tileMap(options);
  myMap.overlay(canvas);

  imageMode(CENTER);
  textAlign(CENTER);
  textSize(14);
  noStroke();

  // Guardar copia original
  puntosOriginales = structuredClone(puntos);

  // Botones
  let botonLimpiar = createButton("Limpiar puntos");
  botonLimpiar.position(20, 890);
  botonLimpiar.mousePressed(() => {
    puntos = [];
    popupActivo = null;
  });

  let botonRestaurar = createButton("Restaurar puntos");
  botonRestaurar.position(140, 890);
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
  resizeCanvas(windowWidth, 800);
}
