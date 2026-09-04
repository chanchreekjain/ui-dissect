import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const isWatch = process.argv.includes('--watch');

function copyStatic() {
  fs.mkdirSync('dist/popup', { recursive: true });
  fs.mkdirSync('dist/icons', { recursive: true });
  
  if (fs.existsSync('public/manifest.json')) {
    fs.copyFileSync('public/manifest.json', 'dist/manifest.json');
  }
  if (fs.existsSync('src/popup/index.html')) {
    fs.copyFileSync('src/popup/index.html', 'dist/popup/index.html');
  }
  if (fs.existsSync('public/icons')) {
    for (const file of fs.readdirSync('public/icons')) {
      fs.copyFileSync(path.join('public/icons', file), path.join('dist/icons', file));
    }
  }
}

const buildOptions = {
  entryPoints: {
    'background/index': 'src/background/index.ts',
    'content/index': 'src/content/index.ts',
    'popup/index': 'src/popup/index.ts'
  },
  outdir: 'dist',
  bundle: true,
  format: 'esm',
  target: ['chrome114'],
  sourcemap: isWatch ? 'inline' : false,
  logLevel: 'info',
};

copyStatic();

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('Build complete.');
}
