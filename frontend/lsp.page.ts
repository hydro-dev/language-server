import { provideFeature } from '@hydrooj/ui-default';

for (const lang of ['c', 'cpp', 'python', 'java']) {
    provideFeature(`monaco-${lang}@lsp`, 'lsp');
}
