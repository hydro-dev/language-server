const esbuild = require('esbuild');
const alias = require('esbuild-plugin-alias');
const fs = require('fs-extra');
const crypto = require('crypto');

fs.emptyDirSync('public')
esbuild.build({
    bundle: true,
    minify: true,
    entryPoints: ['./src/index.ts'],
    outfile: './public/lsp-cpp.js',
    plugins: [
        alias({
            "vscode": require.resolve("@codingame/monaco-languageclient/lib/vscode-compatibility")
        }),
    ],
}).then(() => {
    const data = fs.readFileSync('./public/lsp-cpp.js', 'utf8');
    const hash = crypto.createHash('md5').update(data).digest('hex').substring(0, 8);
    fs.renameSync('./public/lsp-cpp.js', `./public/lsp-cpp-${hash}.js`);
    fs.writeFileSync('./public/lsp-cpp.page.js', `window.externalModules['monaco-cpp']=UiContext.cdn_prefix+'lsp-cpp-${hash}.js';`);
});
