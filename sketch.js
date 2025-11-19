let mappa;
let myMap;
let leafletMap; // new: direct Leaflet instance
let canvas;
let imgs = [];
let estado = "inicio"; // Pantalla inicial o mapa
let popupActivo = -1;  // Guardará el índice del popup abierto
let mapReady = false; // indica cuando leaflet está listo
let _loggedCoords = false; // evita spam en consola

const options = {
  lat: 4.705080263533609,
  lng: -74.08241603470928,
  zoom: 12,
  style: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
};

// Coordenadas
let puntos = [
  [4.624872641950023, -74.06789781939149], // Casa de la Paz
  [4.6101134849575764, -74.18468699431672], // Skafuche
  [4.6171544056693286, -74.06177707628522], // Mutualitos y Mutualitas
  [4.638375081942084, -74.18635666279167], // Huerta Chisas
  [4.7395655698489225, -74.07585071561883], // Tamboras de Suba
  [4.7408676572677475, -74.1087921353675], // Casa Memoria
  [4.51408680217403, -74.11315539115098],   // Usmekaz
  [4.637602957833763, -74.1870189510734],   // Golpe de Barrio
  [4.638503855941462, -74.18771574332891],  // Ambientes de Paz
  [4.626351626061748, -74.14693686620646]   // Aguante Popular
];

// Nombres y enlaces
let nombres = [
  "Casa de la Paz",
  "Skafuche",
  "Mutualitos y Mutualitas",
  "Huerta Chisas",
  "Tamboras de Suba",
  "Casa Memoria",
  "Usmekaz",
  "Golpe de Barrio",
  "Ambientes de Paz",
  "Aguante Popular"
];

let links = [
  "casapaz.html",
  "skafuche.html",
  "mutualitosymutualidades.html",
  "huertachisas.html",
  "tamboras.html",
  "casamemoria.html",
  "usmekaz.html",
  "golpedebarrio.html",
  "ambientesdepaz.html",
  "aguantepopular.html"
];

// --- preload: load images from assets/ with callbacks to confirm success ---
function preload() {
  const assetList = [
    'assets/casitapaz.jpg',       // 0
    'assets/skafuche.jpg',        // 1
    'assets/mochila.jpg',         // 2 (used previously as mochila)
    'assets/huertachisas.jpg',    // 3
    'assets/tamboras.jpg',        // 4
    'assets/logo_casaMemoria.png',// 5
    'assets/logo_usmekas.png',    // 6
    'assets/logo-golpe.png',      // 7
    'assets/encuentros.jpeg',     // 8 (fallback image)
    'assets/logo1.jpg'            // 9
  ];

  function loadImg(idx, path) {
    loadImage(path,
      img => { imgs[idx] = img; console.log('Loaded image:', path); },
      err => { imgs[idx] = null; console.error('Failed to load image:', path, err); }
    );
  }

  for (let i = 0; i < assetList.length; i++) loadImg(i, assetList[i]);
}

// --- setup: create canvas inside #map and position it absolutely over tiles ---
function setup() {
  // determine map container size
  const mapContainer = document.getElementById('map');
  const canvasWidth = mapContainer ? mapContainer.clientWidth : windowWidth;
  const canvasHeight = mapContainer ? (mapContainer.clientHeight || 480) : 480;

  canvas = createCanvas(canvasWidth, canvasHeight);
  if (mapContainer) {
    canvas.parent('map');
    // place the p5 canvas absolutely to match Leaflet pane coordinates
    try {
      canvas.position(0, 0);
      canvas.style('position', 'absolute');
      canvas.style('top', '0px');
      canvas.style('left', '0px');
      // choose a z-index that is above tile layers but below UI controls
      canvas.style('z-index', '650');
    } catch (e) {
      console.warn('No se pudo aplicar estilos al canvas:', e);
    }
  }

  imageMode(CENTER);
  textAlign(CENTER, CENTER);
  noStroke();

  // Use direct Leaflet map instead of relying on Mappa internals that may not be exposed
  try {
    // create Leaflet map attached to the #map div
    leafletMap = L.map('map', {
      center: [options.lat, options.lng],
      zoom: options.zoom,
      scrollWheelZoom: false
    });
    L.tileLayer(options.style, { maxZoom: 19 }).addTo(leafletMap);

    // enable scroll wheel zoom so users can navigate with mouse wheel
    try { if (leafletMap.scrollWheelZoom && typeof leafletMap.scrollWheelZoom.enable === 'function') leafletMap.scrollWheelZoom.enable(); } catch(e){}

    // readiness events
    leafletMap.on('load', () => { mapReady = true; console.log('Leaflet load -> mapReady'); redraw(); });
    leafletMap.on('moveend zoomend', () => { mapReady = true; redraw(); });
    leafletMap.on('move', () => { redraw(); }); // redraw while panning/zooming

    // listen for clicks on the map and translate to canvas positions
    leafletMap.on('click', (e) => {
      if (estado !== 'mapa') return;
      const pt = leafletMap.latLngToContainerPoint(e.latlng);
      let found = false;
      for (let i = 0; i < puntos.length; i++) {
        const ico = leafletMap.latLngToContainerPoint(L.latLng(puntos[i][0], puntos[i][1]));
        const dx = pt.x - ico.x;
        const dy = pt.y - ico.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < 26) { popupActivo = i; found = true; break; }
      }
      if (!found) popupActivo = -1;
      redraw();
    });

    if (typeof leafletMap.whenReady === 'function') leafletMap.whenReady(() => { mapReady = true; console.log('Leaflet whenReady -> mapReady'); redraw(); });

    // if load already happened synchronously, mark ready
    if (leafletMap._loaded) { mapReady = true; }
  } catch (e) {
    console.error('Error al crear Leaflet map directamente:', e);
    mapReady = true; // fallback to avoid blocking rendering during debug
  }

  // after creating the p5 canvas, allow pointer events to pass through so Leaflet receives them
  try{ if (canvas && canvas.elt) canvas.elt.style.pointerEvents = 'none'; } catch(e){}
}

function draw() {
  clear();

  if (estado === "inicio") {
    pantallaInicio();
  } else if (estado === "mapa") {
    dibujarMapa();
    if (popupActivo !== -1) dibujarPopup(popupActivo);
  }
}

// 🌍 Pantalla de bienvenida (sin cambios significativos)
function pantallaInicio() {
  background(10, 30, 40);
  noStroke();
  fill(255, 255, 255, 20);
  ellipse(width / 2, height / 2 - 50, 500, 500);

  fill(255);
  textFont("Georgia");
  textSize(60);
  textStyle(BOLD);
  text("Mochileando por la Paz", width / 2, height / 2 - 100);

  textSize(20);
  textStyle(NORMAL);
  fill(220);
  text(
    "Un recorrido por los territorios, colectivos y memorias vivas\n" +
    "que construyen paz desde lo cotidiano.",
    width / 2, height / 2
  );

  let bx = width / 2;
  let by = width ? (height / 2 + 120) : (height / 2 + 120);
  let bw = 230;
  let bh = 60;

  // Botón "Entrar al mapa"
  if (mouseX > bx - bw / 2 && mouseX < bx + bw / 2 && mouseY > by - bh / 2 && mouseY < by + bh / 2) {
    fill(255, 200);
    cursor(HAND);
  } else {
    fill(255, 150);
    cursor(ARROW);
  }

  rectMode(CENTER);
  rect(bx, by, bw, bh, 20);
  fill(0);
  textSize(22);
  textStyle(BOLD);
  text("Entrar al mapa", bx, by);
}

// 🗺️ Mapa e íconos (con validaciones)
function dibujarMapa() {
  if (!mapReady || !leafletMap || typeof leafletMap.latLngToContainerPoint !== 'function') return;

  for (let i = 0; i < puntos.length; i++) {
    const latlng = L.latLng(puntos[i][0], puntos[i][1]);
    const point = leafletMap.latLngToContainerPoint(latlng);
    const pos = { x: point.x, y: point.y };

    if (!pos || !isFinite(pos.x) || !isFinite(pos.y)) {
      if (!_loggedCoords) {
        console.warn('pos inválida para punto', i, puntos[i], pos);
        _loggedCoords = true; // log only once
      }
      continue;
    }

    // Logear una primera posición válida para ayudar al debug
    if (!_loggedCoords) {
      console.log('pos válida ejemplo (i=' + i + '):', pos);
      _loggedCoords = true;
    }

    if (imgs[i]) {
      image(imgs[i], pos.x, pos.y, 48, 48);
    } else {
      fill(200, 50, 50, 200);
      ellipse(pos.x, pos.y, 44, 44);
    }
  }
}

// 🪶 Popup con botón “Ver más” (agregar protecciones por si pos inválida)
function dibujarPopup(i) {
  if (!mapReady || !leafletMap || typeof leafletMap.latLngToContainerPoint !== 'function') return;
  const latlng = L.latLng(puntos[i][0], puntos[i][1]);
  const point = leafletMap.latLngToContainerPoint(latlng);
  const pos = { x: point.x, y: point.y };
  if (!pos || !isFinite(pos.x) || !isFinite(pos.y)) return;

  let w = 240;
  let h = 270;

  // Fondo
  fill(255, 245);
  stroke(0, 80);
  strokeWeight(1);
  rectMode(CENTER);
  rect(pos.x, pos.y - 150, w, h, 15);
  noStroke();

  // Imagen
  if (imgs[i]) image(imgs[i], pos.x, pos.y - 200, 180, 100);

  // Nombre
  fill(30);
  textSize(18);
  textStyle(BOLD);
  text(nombres[i], pos.x, pos.y - 120);

  // Botón
  let bx = pos.x;
  let by = pos.y - 50;
  let bw = 100;
  let bh = 35;

  fill(80, 160, 255);
  if (mouseX > bx - bw / 2 && mouseX < bx + bw / 2 && mouseY > by - bh / 2 && mouseY < by + bh / 2) {
    fill(60, 140, 230);
    cursor(HAND);
  }

  rectMode(CENTER);
  rect(bx, by, bw, bh, 10);
  fill(255);
  textSize(14);
  text("Ver más", bx, by);
}

// 🖱️ Manejo de clics
function mousePressed() {
  if (estado === "inicio") {
    let bx = width / 2;
    let by = height / 2 + 120;
    let bw = 230;
    let bh = 60;
    if (mouseX > bx - bw / 2 && mouseX < bx + bw / 2 && mouseY > by - bh / 2 && mouseY < by + bh / 2) {
      estado = "mapa";
    }
  } else if (estado === "mapa") {
    if (!mapReady || !leafletMap || typeof leafletMap.latLngToContainerPoint !== 'function') return;

    // Si hay popup abierto, comprobar clic en “Ver más”
    if (popupActivo !== -1) {
      const latlng = L.latLng(puntos[popupActivo][0], puntos[popupActivo][1]);
      const point = leafletMap.latLngToContainerPoint(latlng);
      const pos = { x: point.x, y: point.y };
      if (pos && isFinite(pos.x) && isFinite(pos.y)) {
        let bx = pos.x;
        let by = pos.y - 50;
        let bw = 100;
        let bh = 35;
        if (mouseX > bx - bw / 2 && mouseX < bx + bw / 2 && mouseY > by - bh / 2 && mouseY < by + bh / 2) {
          window.open(links[popupActivo], "_self");
          return;
        }
      }
    }

    // Si clic en ícono → mostrar popup
    let clicEnPunto = false;
    for (let i = 0; i < puntos.length; i++) {
      const latlng = L.latLng(puntos[i][0], puntos[i][1]);
      const point = leafletMap.latLngToContainerPoint(latlng);
      const pos = { x: point.x, y: point.y };
      if (!pos || !isFinite(pos.x) || !isFinite(pos.y)) continue;
      let d = dist(mouseX, mouseY, pos.x, pos.y);
      if (d < 26) {
        popupActivo = i;
        clicEnPunto = true;
        break;
      }
    }

    if (!clicEnPunto) popupActivo = -1; // Cerrar popup si clic fuera
  }
}

// responsive: resize main canvas to fit #map container
function windowResized() {
  const mapContainer = document.getElementById('map');
  const newWidth = mapContainer ? mapContainer.clientWidth : windowWidth;
  const newHeight = mapContainer ? (mapContainer.clientHeight || 480) : 480;
  resizeCanvas(newWidth, newHeight);
}


// --- helper: create p5 instance sketches for stacked canvases (unchanged) ---
function makeSketch(id, colorA, colorB) {
  return function(p) {
    let w, h = 320;
    p.setup = function() {
      const parent = document.getElementById(id);
      w = parent ? parent.clientWidth : windowWidth;
      p.createCanvas(w, h).parent(id);
      p.noStroke();
    };
    p.draw = function() {
      const t = p.millis() * 0.0003;
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

// Sketch A (interactive slideshow + video) - ensure this is defined before creating instances
const sketchA = (p) => {
  let estadoA = 0;
  let foto1, foto2;
  let videoYT;
  let parentElA;

  p.preload = function() {
    // try both png and jpg fallbacks if needed
    try { foto1 = p.loadImage('assets/foto1.png'); } catch(e) { foto1 = null; }
    try { foto2 = p.loadImage('assets/foto2.png'); } catch(e) { foto2 = null; }
  };

  p.setup = function() {
    parentElA = document.getElementById('sketch-a');
    const w = parentElA ? parentElA.clientWidth : 800;
    const h = 400;
    p.createCanvas(w, h).parent('sketch-a');
    p.textAlign(p.CENTER, p.CENTER);
    p.textFont('Georgia');

    // iframe video, parent to container so it doesn't overflow page
    videoYT = p.createElement('iframe');
    videoYT.attribute('src', 'https://www.youtube.com/embed/M9BhSC9P_44?rel=0');
    videoYT.parent('sketch-a');
    videoYT.style('position','absolute');
    videoYT.style('left','50%');
    videoYT.style('top','50%');
    videoYT.style('transform','translate(-50%,-50%)');
    videoYT.style('max-width','95%');
    videoYT.style('width', Math.min(950, w * 0.95) + 'px');
    videoYT.style('height','auto');
    videoYT.style('z-index','1000');
    videoYT.hide();
  };

  p.draw = function() {
    p.background(0);
    if (estadoA === 0) {
      if (foto1) p.image(foto1, 0, 0, p.width, p.height);
      drawOverlay();
      drawTitle('Colectivo Casa Memoria Suba', 'Presiona una tecla para continuar');
    } else if (estadoA === 1) {
      if (foto2) p.image(foto2, 0, 0, p.width, p.height);
      drawOverlay();

      const rw = Math.min(730, p.width * 0.9);
      const rh = Math.min(330, p.height * 0.8);
      const cx = p.width / 2;
      const cy = p.height / 2;

      p.fill(250, 235);
      p.noStroke();
      p.rectMode(p.CENTER);
      p.rect(cx, cy, rw, rh, 20);
      p.rectMode(p.CORNER);

      const textX = cx - rw/2 + 20;
      const textY = cy - rh/2 + 20;
      p.push();
      p.fill(30);
      p.textSize(Math.max(14, Math.min(20, p.width*0.02)));
      p.textStyle(p.NORMAL);
      p.textAlign(p.LEFT, p.TOP);
      p.text(
        'El Colectivo Casa Memoria Suba es un espacio de reparación simbólica en el barrio La Gaitana, Bogotá. Desde la memoria, el contra muralismo y la Verdad, Justicia reparación y No Repetición, se construye un lugar de encuentro y reflexión.',
        textX, textY, rw - 40, rh - 60);
      p.pop();

      p.textSize(16);
      p.fill(255);
      p.textAlign(p.CENTER, p.BASELINE);
      p.text('Presiona una tecla para ver el documental', p.width / 2, cy + rh/2 + 10);

      try { videoYT.hide(); } catch(e){}
    } else if (estadoA === 2) {
      p.background(20);
      try { videoYT.show(); } catch(e){}
      p.fill(255);
      p.textSize(16);
      p.text('Documental stop motion: La Gaitana barrio historico', p.width / 2, p.height - 20);
    }
  };

  p.keyPressed = function() {
    if (estadoA === 0) estadoA = 1;
    else if (estadoA === 1) estadoA = 2;
    else if (estadoA === 2) { try{ videoYT.hide(); } catch(e){} estadoA = 0; }
  };

  function drawOverlay() {
    p.fill(0, 120);
    p.rect(0, 0, p.width, p.height);
  }

  function drawTitle(titulo, subtitulo) {
    p.fill(255);
    p.textSize(Math.max(24, Math.min(40, p.width*0.05)));
    p.textStyle(p.BOLD);
    try { p.drawingContext.shadowColor = p.color(0); p.drawingContext.shadowBlur = 8; } catch(e){}
    p.text(titulo, p.width / 2, p.height / 2 - 20);
    try { p.drawingContext.shadowBlur = 0; } catch(e){}
    p.textSize(Math.max(12, Math.min(18, p.width*0.02)));
    p.textStyle(p.NORMAL);
    p.text(subtitulo, p.width / 2, p.height / 2 + 40);
  }

  p.windowResized = function() {
    const newW = parentElA ? parentElA.clientWidth : windowWidth;
    p.resizeCanvas(newW, 400);
    try { videoYT.style('width', Math.min(950, newW * 0.95) + 'px'); } catch(e){}
  };
};

// create three sketches when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const startSketches = () => {
    if (typeof sketchA === 'undefined') { setTimeout(startSketches, 50); return; }

    // instantiate sketchA
    new p5(sketchA);

    // --- Sketch B (user-provided) ---
    const sketchB = (p) => {
      let btnAmbientes;
      let vidAmbientes;
      let parentEl;

      p.setup = function() {
        parentEl = document.getElementById('sketch-b');
        const w = parentEl ? parentEl.clientWidth : 800;
        const h = 360;
        p.createCanvas(w, h).parent('sketch-b');
        p.noStroke();

        // Button (use p5 to create it and parent it inside the container)
        btnAmbientes = p.createButton('Ambientes de paz');
        btnAmbientes.parent(parentEl);
        btnAmbientes.style('position','absolute');
        btnAmbientes.style('left','12px');
        btnAmbientes.style('top','12px');
        btnAmbientes.style('z-index','1200');
        btnAmbientes.mousePressed(function(){ toggleAmbientesDePaz(vidAmbientes); });

        // Video: create and parent, style responsively
        vidAmbientes = p.createVideo(['assets/ambientes-de-paz.mp4']);
        vidAmbientes.parent('sketch-b');
        vidAmbientes.style('position','absolute');
        vidAmbientes.style('left','50%');
        vidAmbientes.style('top','50%');
        vidAmbientes.style('transform','translate(-50%,-50%)');
        vidAmbientes.style('max-width','95%');
        vidAmbientes.style('width', Math.min(640, (parentEl ? parentEl.clientWidth : 800) * 0.9) + 'px');
        vidAmbientes.style('height','auto');
        vidAmbientes.elt.setAttribute('playsinline', '');
        vidAmbientes.elt.setAttribute('controls', '');
        vidAmbientes.hide();

        vidAmbientes.onended(() => { try{ vidAmbientes.hide(); }catch(e){} });
      };

      p.draw = function() {
        p.background(20);
        // Optional: draw a placeholder or thumbnail when video is hidden
        if (!vidAmbientes || (vidAmbientes && vidAmbientes.elt && vidAmbientes.elt.style.display === 'none')) {
          p.fill(30);
          p.rect(0, 0, p.width, p.height);
          p.fill(255);
          p.textAlign(p.CENTER, p.CENTER);
          p.textSize(18);
          p.text('Pulsa "Ambientes de paz" para ver el video', p.width/2, p.height/2);
        }
      };

      function toggleAmbientesDePaz(vid) {
        try {
          const oculto = vid.elt.style.display === 'none' || vid.elt.style.display === '';
          if (oculto) {
            vid.show();
            vid.play();
          } else {
            vid.pause();
            vid.hide();
          }
        } catch (e) { console.warn('toggleAmbientes error', e); }
      }

      p.windowResized = function() {
        const newW = parentEl ? parentEl.clientWidth : windowWidth;
        p.resizeCanvas(newW, 360);
        try { vidAmbientes.style('width', Math.min(640, newW * 0.9) + 'px'); } catch(e){}
      };
    };

    new p5(sketchB);

    // --- Sketch C (user-provided with audio fallback) ---
    const sketchC = (p) => {
      let imagen;
      let miAudio = null; // p5.Sound or HTMLAudio fallback
      let parentElC;
      let audioIsP5 = false;

      p.preload = function() {
        imagen = p.loadImage('assets/mariposa.png');
        // try p.loadSound if available
        if (typeof p.loadSound === 'function') {
          try {
            miAudio = p.loadSound('assets/muchacha.mp4', () => { audioIsP5 = true; }, (err) => { console.warn('p5 loadSound failed, using HTMLAudio fallback', err); miAudio = null; });
          } catch(e) { console.warn('p5 loadSound exception', e); miAudio = null; }
        }
        // HTMLAudio fallback will be created in setup if miAudio is null
      };

      p.setup = function() {
        parentElC = document.getElementById('sketch-c');
        const w = parentElC ? parentElC.clientWidth : 800;
        const h = 400;
        p.createCanvas(w, h).parent('sketch-c');
        p.imageMode(p.CENTER);

        if (!miAudio) {
          try { miAudio = new Audio('assets/muchacha.mp4'); audioIsP5 = false; } catch(e){ console.warn('HTMLAudio fallback failed', e); }
        }
      };

      p.draw = function() {
        p.background(220);
        if (imagen) p.image(imagen, p.width/2, p.height/2, Math.min(p.width*0.9, imagen.width), Math.min(p.height*0.9, imagen.height));
      };

      p.mouseClicked = function(event) {
        try {
          // Only respond if the click occurred inside this sketch's canvas
          const canvasEl = p.canvas || (p._renderer && p._renderer.canvas);
          if (canvasEl && event && typeof event.clientX !== 'undefined') {
            const rect = canvasEl.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (x < 0 || y < 0 || x > rect.width || y > rect.height) return; // click was outside
          } else {
            // fallback: use p.mouseX / p.mouseY (they may be NaN when outside)
            if (typeof p.mouseX === 'number' && typeof p.mouseY === 'number') {
              if (p.mouseX < 0 || p.mouseY < 0 || p.mouseX > p.width || p.mouseY > p.height) return;
            }
          }

          // Toggle audio playback (p5 sound or HTMLAudio fallback)
          if (audioIsP5 && miAudio && typeof miAudio.isPlaying === 'function') {
            if (miAudio.isPlaying()) miAudio.stop(); else miAudio.play();
          } else if (miAudio && typeof miAudio.play === 'function') {
            if (!miAudio.paused) { miAudio.pause(); miAudio.currentTime = 0; } else { miAudio.play(); }
          }
        } catch(e){ console.warn('audio toggle error', e); }
      };

      p.windowResized = function() {
        const newW = parentElC ? parentElC.clientWidth : windowWidth;
        p.resizeCanvas(newW, 400);
      };
    };

    new p5(sketchC);

    // --- Sketch D (user provided) ---
    const sketchD = (p) => {
      let boton;
      let imgD;
      let sonidoD;
      let mostrar = false;
      let parentElD;

      p.preload = function() {
        imgD = p.loadImage('assets/imagen.jpg');
        // attempt to load with p5.sound if available
        if (typeof p.loadSound === 'function') {
          try { sonidoD = p.loadSound('assets/audio.mp3'); } catch(e){ console.warn('p5.loadSound failed for sketchD', e); sonidoD = null; }
        } else {
          sonidoD = null;
        }
      };

      p.setup = function() {
        parentElD = document.getElementById('sketch-d');
        const w = parentElD ? parentElD.clientWidth : 800;
        const h = 800; // as user provided
        p.createCanvas(w, h).parent('sketch-d');
        p.background(51, 255, 136);

        // Create button and parent it to the container
        boton = p.createButton('EL BICHO');
        boton.parent(parentElD);
        boton.position( Math.max(12, Math.floor(w*0.4)), 180 );
        boton.mousePressed(() => { mostrarContenido(); });

        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(16);
        p.fill(50);
      };

      function mostrarContenido() {
        mostrar = true;
        try {
          if (sonidoD && typeof sonidoD.play === 'function') sonidoD.play();
          else if (!sonidoD) {
            // try HTMLAudio fallback
            try { const a = new Audio('assets/audio.mp3'); a.play(); } catch(e){ console.warn('HTMLAudio fallback failed for sketchD', e); }
          }
        } catch(e){ console.warn('Error jugando audio en sketchD', e); }
        try{ boton.hide(); } catch(e){}
      }

      p.draw = function() {
        if (mostrar) {
          p.background(51, 190, 255);
          // Mostrar imagen
          if (imgD) p.image(imgD, 250, 50, 300, 250);

          // Mostrar descripción
          p.fill(0);
          p.textSize(18);
          p.textAlign(p.CENTER);
          p.text("Esta huerta agroecológica comunitaria y popular con enfoque en memoria, paz, cultura y soberanía alimentaria en Bosa Porvenir surge como un espacio de resistencia ante la disputa territorial contra el paramilitarismo y el microtráfico así como de las violencias ambientales. Este territorio ha sido históricamente marcado por los intentos de masacre a líderes sociales, donde, a lo largo de los años, han sido asesinados jóvenes comprometidos con la construcción de una paz con justicia social, entre ellos Camila y Camilo. La huerta se constituye como una de las colectividades que convergen alrededor de “El Bicho”, una estructura móvil diseñada por Arquitectura Expandida, que se transforma en un escenario movible para diversas prácticas pedagógicas", p.width/7, p.height/8, 550, 700);
          p.text("HUERTA CHISAS", p.width/2, 20);
        }
      };

      p.windowResized = function() {
        const newW = parentElD ? parentElD.clientWidth : windowWidth;
        p.resizeCanvas(newW, 800);
      };
    };

    new p5(sketchD);
  };

  startSketches();
});
