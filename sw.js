// Offline support. Network first so updates show up right away, cache as the
// fallback so the app still works on a plane or with Wi-Fi off.
const CACHE = 'tiny-explorers-v4';
const SHELL = [
  './', 'index.html', 'css/styles.css', 'manifest.webmanifest',
  'js/app.js', 'js/audio.js', 'js/learner.js', 'js/confetti.js', 'js/diagnostics.js', 'js/i18n.js',
  'js/modules/index.js', 'js/modules/farm.js', 'js/modules/wild.js', 'js/modules/birds.js',
  'js/modules/ocean.js', 'js/modules/fruits.js', 'js/modules/veggies.js', 'js/modules/plants.js',
  'js/modules/vehicles.js', 'js/modules/colors.js', 'js/modules/body.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
  // Recorded sounds (about 2 MB), cached up front so the app works offline.
  'sounds/airplane.mp3',
  'sounds/applebite.mp3',
  'sounds/bear.mp3',
  'sounds/bees.mp3',
  'sounds/bigbubble.mp3',
  'sounds/bikebell.mp3',
  'sounds/bird.mp3',
  'sounds/bite.mp3',
  'sounds/blop.mp3',
  'sounds/bubbles.mp3',
  'sounds/bus.mp3',
  'sounds/car.mp3',
  'sounds/cat.mp3',
  'sounds/cheer.mp3',
  'sounds/chick.mp3',
  'sounds/chicken.mp3',
  'sounds/chips.mp3',
  'sounds/clap.mp3',
  'sounds/cow.mp3',
  'sounds/crunch.mp3',
  'sounds/dog.mp3',
  'sounds/dolphin.mp3',
  'sounds/drip.mp3',
  'sounds/duck.mp3',
  'sounds/eagle.mp3',
  'sounds/elephant.mp3',
  'sounds/firetruck.mp3',
  'sounds/flamingo.mp3',
  'sounds/footsteps.mp3',
  'sounds/frog.mp3',
  'sounds/giraffe.mp3',
  'sounds/goat.mp3',
  'sounds/helicopter.mp3',
  'sounds/horse.mp3',
  'sounds/kick.mp3',
  'sounds/kiss.mp3',
  'sounds/leaves.mp3',
  'sounds/lion.mp3',
  'sounds/monkey.mp3',
  'sounds/owl.mp3',
  'sounds/parrot.mp3',
  'sounds/peacock.mp3',
  'sounds/penguin.mp3',
  'sounds/pig.mp3',
  'sounds/plop.mp3',
  'sounds/police.mp3',
  'sounds/popcorn.mp3',
  'sounds/rain.mp3',
  'sounds/raspberry.mp3',
  'sounds/rocket.mp3',
  'sounds/rooster.mp3',
  'sounds/seal.mp3',
  'sounds/sheep.mp3',
  'sounds/shiphorn.mp3',
  'sounds/slurp.mp3',
  'sounds/smell.mp3',
  'sounds/snake.mp3',
  'sounds/sniff.mp3',
  'sounds/splash.mp3',
  'sounds/swan.mp3',
  'sounds/tiger.mp3',
  'sounds/toothbrush.mp3',
  'sounds/train.mp3',
  'sounds/turkey.mp3',
  'sounds/waves.mp3',
  'sounds/whale.mp3',
  'sounds/wind.mp3',
  'sounds/wolf.mp3',
  'sounds/xylojingle.mp3',
  'sounds/zebra.mp3',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && (new URL(e.request.url).origin === location.origin || e.request.url.includes('fonts.g'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
