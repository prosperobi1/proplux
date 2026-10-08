// Sends ngrok the header its free tier requires, so real phones and
// browsers load the app directly instead of the "You are about to visit"
// warning page. Registered only on the ngrok tunnel; production never
// installs this worker, and nothing here is ever cached.
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  if (url.hostname.indexOf("ngrok-free") === -1) return;
  var headers = new Headers(event.request.headers);
  headers.set("ngrok-skip-browser-warning", "1");
  event.respondWith(
    fetch(new Request(event.request, { headers: headers, credentials: event.request.credentials })).catch(
      function () {
        return fetch(event.request);
      }
    )
  );
});
