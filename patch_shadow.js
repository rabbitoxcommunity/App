const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

const files = [
    'src/screens/CartScreen.tsx',
    'src/screens/HomeScreen.tsx',
    'src/components/BottomSheet.tsx',
    'src/components/Toast.tsx',
    'src/components/CartPeekBar.tsx',
    'src/components/ui.tsx'
];

for (const filePath of files) {
    const sourceFile = project.getSourceFile(filePath);
    if (!sourceFile) continue;

    // 1. Remove `shadow` from static import
    const themeImports = sourceFile.getImportDeclarations().filter(d => {
        const spec = d.getModuleSpecifierValue();
        return spec === '../theme' || spec === '../../theme';
    });
    for (const imp of themeImports) {
        const namedImports = imp.getNamedImports();
        for (const named of namedImports) {
            if (named.getName() === 'shadow') {
                named.remove();
            }
        }
    }

    // 2. Change `const { colors } = useTheme();` to `const { colors, theme } = useTheme();`
    // And handle files that already have `useTheme` but didn't destructure `theme`.
    // Instead of parsing perfectly, let's just use string replacement on the file text.
    let text = sourceFile.getFullText();
    text = text.replace(/const \{ colors \} = useTheme\(\);/g, 'const { colors, theme } = useTheme();');
    
    // Replace all usages of `shadow.` with `theme.shadow.`
    // Make sure we don't accidentally replace something else, but since we know it's styling:
    text = text.replace(/shadow\./g, 'theme.shadow.');

    sourceFile.replaceWithText(text);
}

project.saveSync();
console.log('Shadows patched.');
