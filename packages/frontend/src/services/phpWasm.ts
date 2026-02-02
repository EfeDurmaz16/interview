export type PhpRunResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

let php: any = null;
let initPromise: Promise<void> | null = null;

function normalizePhp(code: string): string {
  const trimmed = code.trimStart();
  return trimmed.startsWith("<?php") ? code : `<?php\n${code}`;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("PHP execution timeout")), ms)
    ),
  ]);
}

export async function initPhp(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // 🔥 BURASI DEĞİŞTİ
    const { PhpWeb } = await import( "https://cdn.jsdelivr.net/npm/php-wasm/PhpWeb.mjs");

    php =  new PhpWeb();

    await new Promise<void>((resolve) => {
      const onReady = () => {
        php.removeEventListener("ready", onReady);
        resolve();
      };
      php.addEventListener("ready", onReady);
    });
  })();

  return initPromise;
}

export async function runPhp(
  code: string,
  stdin: string = "",
  timeoutMs = 10_000
): Promise<PhpRunResult> {
  
  await initPhp();

  if (!php) throw new Error("PHP not initialized");

  const stdout: string[] = [];
  const stderr: string[] = [];

  const onOut = (e: any) => stdout.push(String(e?.detail ?? ""));
  const onErr = (e: any) => stderr.push(String(e?.detail ?? ""));

  php.addEventListener("output", onOut);
  php.addEventListener("error", onErr);

  try {
    const exec = (async () => {
      if (stdin) {
        php.inputString(stdin);
      }

      const exitCode = await php.run(normalizePhp(code));

      return {
        stdout: stdout.join(""),
        stderr: stderr.join(""),
        exitCode: Number(exitCode ?? 0),
      };
    })();

    return await withTimeout(exec, timeoutMs);
  } finally {
    php.removeEventListener("output", onOut);
    php.removeEventListener("error", onErr);
  }
}