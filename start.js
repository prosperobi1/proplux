// Production entry point: cPanel's "Startup file" field and PM2 on a VPS.
// The built Next.js server runs inside this process, so the process the host
// starts is the one that listens. Next loads .env from this folder the same
// way `next start` does. PORT comes from the host and defaults to 3000.
/* eslint-disable @typescript-eslint/no-require-imports */
process.env.NODE_ENV = "production";

const { createServer } = require("http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log("> proplux ready on http://localhost:" + port);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
