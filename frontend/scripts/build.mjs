// Ejecuta `ng build` y termina en cuanto Angular informa el resultado.
//
// Con @angular/build 21.2 + esbuild 0.28 el proceso deja vivo el servicio de esbuild al acabar, de modo que
// `ng build` nunca devuelve el control (también ocurre con una app vacía). Esto colgaría `docker build`.
// Cuando se corrija en Angular, este script puede volver a ser simplemente `ng build`.
import { spawn } from 'node:child_process';

const SUCCESS = /Output location:/;
const FAILURE = /Application bundle generation failed|✘ \[ERROR\]/;
const MAX_MINUTES = 15;

const child = spawn(process.execPath, ['node_modules/@angular/cli/bin/ng.js', 'build', '--no-progress', ...process.argv.slice(2)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

let result = null;

function finish(code) {
  if (result !== null) {
    return;
  }
  result = code;
  // Margen para que Angular termine de escribir antes de cerrarlo.
  setTimeout(() => child.kill(), 3000);
}

for (const [stream, target] of [
  [child.stdout, process.stdout],
  [child.stderr, process.stderr],
]) {
  stream.on('data', (chunk) => {
    target.write(chunk);
    const text = chunk.toString();
    if (FAILURE.test(text)) {
      finish(1);
    } else if (SUCCESS.test(text)) {
      finish(0);
    }
  });
}

const watchdog = setTimeout(() => {
  console.error(`La compilación superó ${MAX_MINUTES} minutos sin terminar.`);
  finish(1);
}, MAX_MINUTES * 60_000);

child.on('exit', (code) => {
  clearTimeout(watchdog);
  process.exit(result ?? code ?? 1);
});
