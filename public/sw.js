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

  // Everything is re-issued by URL. Rebuilding from the original request
  // fails for no-cors styles and scripts (extra headers rejected) and for
  // streamed POST bodies (missing duplex).
  var init = {
    method: event.request.method,
    headers: headers,
    credentials: event.request.credentials,
    redirect: event.request.redirect,
  };
  if (event.request.method !== "GET" && event.request.method !== "HEAD") {
    init.body = event.request.body;
    init.duplex = "half";
  }

  event.respondWith(
    fetch(event.request.url, init).catch(function () {
      return fetch(event.request);
    })
  );
});
