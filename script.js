const $welcome = document.querySelector(".welcome");
const $loading = document.querySelector(".loading");
const $motion  = document.querySelector(".motion-switch");
const $board   = document.querySelector(".board");

let context  = null;
let gainNode = null;
let samples  = null;

let isMotionControlActive = false;

$motion.addEventListener("click", () => {
      isMotionControlActive = !isMotionControlActive;
      $motion.classList[isMotionControlActive ? "add" : "remove"]("active");
});

$welcome.addEventListener("click", async () => {
      try {
            await document.body.requestFullscreen();
            await screen.orientation.lock("landscape-secondary");

            $welcome.style.display = "none";

            context  = new AudioContext();
            gainNode = context.createGain();
            samples  = await loadSamples();

            initializeBoard();
            initializeMotion();
      }

      catch (error) { alert(error.message) }
});

async function loadSamples() {
      const notes = ["C4", "Db4", "D4", "Eb4", "E4", "F4", "Gb4", "G4", "Ab4", "A4", "Bb4", "B4", "C5"];

      const $loaded = $loading.children[0];
      const $total  = $loading.children[2];

      let samples = {};
      let sampleLoaded = 0;

      $loading.style.display = "flex";
      $total.innerText = notes.length;

      try { 
            for (let i = 0; i < notes.length; i++) {
                  const note = notes[i];

                  const resp = await fetch("assets/samples/" + note + ".mp3");
                  const data = await resp.arrayBuffer();

                  samples[note] = await await context.decodeAudioData(data);
                  sampleLoaded += 1;
                  $loaded.innerText = sampleLoaded;
            }
      }

      catch (error) { return Promise.reject(error) }

      $loading.style.display = "none";
      return Promise.resolve(samples);
}

function initializeBoard() {
      const activeKeys = new Map();

      $board.addEventListener("touchstart", handleTouchStart);
      $board.addEventListener("touchmove" , handleTouchMove);
      $board.addEventListener("touchend"  , handleTouchEnd);

      function handleTouchStart(event) {
            event.preventDefault();

            [...event.touches].forEach(touch => {
                  const $key = document.elementFromPoint(touch.clientX, touch.clientY);
                  const $target = touch.target;

                  if (!$key) return;

                  const sample = samples[$key.dataset.note];
                  const source = playSample(sample);

                  $key.classList.add("active");
                  activeKeys.set($target, { $key, ...source });
            });
      }

      function handleTouchMove(event) {
            event.preventDefault();

            [...event.touches].forEach(touch => {
                  const $key = document.elementFromPoint(touch.clientX, touch.clientY);
                  const $target = touch.target;

                  if (activeKeys.has($target) && activeKeys.get($target).$key != $key) {
                        stopSample(activeKeys.get($target).source, activeKeys.get($target).volume);
                        activeKeys.get($target).$key.classList.remove("active");

                        const sample = samples[$key.dataset.note];
                        const source = playSample(sample);

                        $key.classList.add("active");
                        activeKeys.set($target, { $key, ...source });
                  }
            });
      }

      function handleTouchEnd(event) {
            event.preventDefault();

            [...event.changedTouches].forEach(touch => {
                  const $target = touch.target;

                  if (activeKeys.has($target)) {
                        const { $key, source, volume } = activeKeys.get($target);

                        stopSample(source, volume);

                        $key.classList.remove("active");
                        activeKeys.delete($target);
                  }
            });
      }

      function playSample(sample) {
            const source = context.createBufferSource();
            const volume = context.createGain();
      
            source.buffer = sample;
            source.connect(volume);
            volume.connect(context.destination);
            source.start();
      
            return { source, volume };
      }
      
      function stopSample(source, volume) {
            let interval, handler;
      
            handler = () => {
                  if (volume.gain.value <= 0) {
                        source.stop();
                        clearInterval(interval);
                  }
      
                  volume.gain.value -= 0.005;
            };
      
            interval = setInterval(handler, 2);
            // volume.gain.linearRampToValueAtTime(0, source.context.currentTime + 1);
      }
}

function initializeMotion() {
      window.addEventListener("devicemotion", event => {
            if (!isMotionControlActive) return;
            console.log(event);
      });
}
