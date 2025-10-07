let map = L.map('map').setView([4.705080263533609, -74.08241603470928], 12); // Centered on Spain

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


function setup() {
  createCanvas(windowWidth, 300);
  background(30, 30, 40);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text('¡Hola desde p5.js!', width/2, height/2);
}

function windowResized() {
  resizeCanvas(windowWidth, 300);
  background(30, 30, 40);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text('¡Hola desde p5.js!', width/2, height/2);
}
