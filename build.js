const esbuild = require('esbuild');
const alias = require('esbuild-plugin-alias');
const fs = require('fs-extra');
const crypto = require('crypto');

fs.emptyDirSync('public');
esbuild.build({
    bundle: true,
    minify: true,
    entryPoints: ['./src/lsp.ts'],
    outdir: './public/',
    format: 'iife',
    plugins: [
        alias({
            vscode: require.resolve('@codingame/monaco-languageclient/lib/vscode-compatibility'),
        }),
    ],
}).then(() => {
    const data = fs.readFileSync('./public/lsp.js', 'utf8');
    const hash = crypto.createHash('md5').update(data).digest('hex').substring(0, 8);
    fs.renameSync('./public/lsp.js', `./public/lsp-${hash}.js`);
    fs.writeFileSync(
        './public/lsp-index.page.js',
        `${['cpp', 'c', 'python', 'java'].map((i) => `window.externalModules['monaco-${i}@lsp']`).join('=')}=UiContext.cdn_prefix+'lsp-${hash}.js';`,
    );
});
