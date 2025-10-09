// Inicializa el mapa Leaflet en el div 'map' (solo una vez, fuera de setup/draw)
var map = L.map('map').setView([4.705080263533609, -74.08241603470928], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

L.marker([4.624872641950023, -74.06789781939149]).addTo(map)
    .bindPopup('Holi, esta es la casa de la pazzz!')
    .openPopup();

// Código para p5.js + mappa.js (canvas debajo del mapa Leaflet)
let mappa;
let myMap;
let canvas;
const options = {
  lat: 4.705080263533609,
  lng: -74.08241603470928,
  zoom: 12,
  style: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
};

function setup() {
  canvas = createCanvas(windowWidth, 800);
  mappa = new Mappa('Leaflet');
  myMap = mappa.tileMap(options);
  myMap.overlay(canvas);

//  background(100);
}

function draw() {
  clear();
 //latitud y longitud de la casa de la paz
 let laCasaDeLaPaz = myMap.latLngToPixel(4.624872641950023, -74.06789781939149);
 fill(255, 0, 0);
 let a = 20
 let b= 20
 a++
 if(a == 60){
a = 20

 }
 ellipse(laCasaDeLaPaz.x, laCasaDeLaPaz.y, 20, 20);
}