import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const isWindows = process.platform === "win32";

const getPortlessEnv = () => {
  const env = { ...process.env };

  if (isWindows) {
    const gitOpenSslBin = "C:\\Program Files\\Git\\usr\\bin";
    const gitOpenSslPath = join(gitOpenSslBin, "openssl.exe");

    if (existsSync(gitOpenSslPath)) {
      const currentPath = env.Path ?? env.PATH ?? "";
      env.Path = `${gitOpenSslBin};${currentPath}`;
    }
  }

  return env;
};

const child = spawn("portless", process.argv.slice(2), {
  env: getPortlessEnv(),
  shell: isWindows,
  stdio: "inherit",
});

child.on("error", (error) => {
  if (error.code === "ENOENT") {
    console.error(
      "portless is not available on PATH. Install it globally with: npm install -g portless",
    );
    process.exit(1);
  }

  console.error(`portless failed to start: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`portless exited after receiving signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});
