// Production entry point for cPanel's "Startup file" field and PM2 on a VPS.
// Runs the built Next.js server on the port the host provides (PORT) or 3000.
// Plain CommonJS: this file runs under bare Node, outside the Next.js build.
/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");

const port = String(process.env.PORT || 3000);
const nextBin = require.resolve("next/dist/bin/next");

const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
  stdio: "inherit",
  cwd: __dirname,
});

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig);
  });
}

child.on("exit", (code) => process.exit(code == null ? 0 : code));
