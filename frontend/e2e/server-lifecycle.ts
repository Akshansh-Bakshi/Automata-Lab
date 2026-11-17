import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backendDir = path.resolve(frontendDir, "../backend");

function launch(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env) {
  const child = spawn(command, args, { cwd, env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let output = "";
  let launchError: Error | null = null;
  child.on("error", (error) => { launchError = error; });
  child.stdout?.on("data", (chunk: Buffer) => { output = (output + chunk.toString()).slice(-4000); });
  child.stderr?.on("data", (chunk: Buffer) => { output = (output + chunk.toString()).slice(-4000); });
  return { child, output: () => output, launchError: () => launchError };
}

async function ready(url: string, process: ReturnType<typeof launch>) {
  for (let attempt = 0; attempt < 240; attempt++) {
    if (process.launchError()) throw new Error(`Could not launch test server: ${process.launchError()?.message}`);
    if (process.child.exitCode !== null) throw new Error(`Test server exited early: ${process.output()}`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* Server is still starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Test server did not become ready at ${url}: ${process.output()}`);
}

async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.pid === undefined) return;
  child.kill();
  await Promise.race([
    new Promise<void>((resolve) => child.once("exit", () => resolve())),
    new Promise<void>((resolve) => setTimeout(resolve, 3000)),
  ]);
}

export default async function setup() {
  const backend = launch(process.env.AUTOMATALAB_BACKEND_PYTHON ?? "python", ["-m", "uvicorn", "automatalab.api.main:app", "--host", "localhost", "--port", "8017"], backendDir);
  const frontend = launch(process.execPath, [path.join(frontendDir, "node_modules/next/dist/bin/next"), "dev", "--hostname", "localhost", "--port", "3000"], frontendDir, { ...process.env, NEXT_PUBLIC_API_BASE_URL: "http://localhost:8017" });
  try {
    await Promise.all([ready("http://localhost:8017/api/health", backend), ready("http://localhost:3000", frontend)]);
  } catch (error) {
    await Promise.all([stop(frontend.child), stop(backend.child)]);
    throw error;
  }
  return async () => { await Promise.all([stop(frontend.child), stop(backend.child)]); };
}
