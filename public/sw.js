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

function skipHeader(source) {
  var headers = new Headers(source.headers);
  headers.set("ngrok-skip-browser-warning", "1");
  return headers;
}

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);
  if (url.hostname.indexOf("ngrok-free") === -1) return;

  // Chrome refuses to rebuild navigate requests with extra headers, so
  // page loads are re-issued against the same URL with the header added.
  if (event.request.mode === "navigate" && event.request.method === "GET") {
    event.respondWith(
      fetch(event.request.url, {
        headers: skipHeader(event.request),
        credentials: event.request.credentials,
      }).catch(function () {
        return fetch(event.request);
      })
    );
    return;
  }

  event.respondWith(
    fetch(new Request(event.request, { headers: skipHeader(event.request), credentials: event.request.credentials })).catch(
      function () {
        return fetch(event.request);
      }
    )
  );
});
