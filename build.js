const esbuild = require('esbuild');
const alias = require('esbuild-plugin-alias');
const fs = require('fs-extra');
const crypto = require('crypto');

fs.emptyDirSync('public')
esbuild.build({
    bundle: true,
    minify: true,
    entryPoints: ['./src/cpp.ts', './src/python.ts'],
    outdir: './public/',
    plugins: [
        alias({
            "vscode": require.resolve("@codingame/monaco-languageclient/lib/vscode-compatibility")
        }),
    ],
}).then(() => {
    for (const t of ['cpp', 'python']) {
        const data = fs.readFileSync('./public/' + t + '.js', 'utf8');
        const hash = crypto.createHash('md5').update(data).digest('hex').substring(0, 8);
        fs.renameSync(`./public/${t}.js`, `./public/lsp-${t}-${hash}.js`);
        fs.writeFileSync(`./public/lsp-${t}.page.js`, `window.externalModules['monaco-${t}']=UiContext.cdn_prefix+'lsp-${t}-${hash}.js';`);
    }
});
