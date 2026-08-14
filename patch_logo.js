const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

const loginScreen = project.getSourceFile('src/screens/LoginScreen.tsx');
if (loginScreen) {
    const reactNativeImport = loginScreen.getImportDeclaration(decl => decl.getModuleSpecifierValue() === 'react-native');
    if (reactNativeImport && !reactNativeImport.getNamedImports().some(n => n.getName() === 'Image')) {
        reactNativeImport.addNamedImport('Image');
    }
    
    // We already added useTheme via refactor_theme.js, but now we need to extract config from useConfig
    loginScreen.addImportDeclaration({
        namedImports: ['useConfig'],
        moduleSpecifier: '../store/ConfigContext',
    });

    const components = loginScreen.getFunctions().filter(f => f.getName() === 'LoginScreen');
    for (const comp of components) {
        comp.insertStatements(1, `const { config } = useConfig();\nconst logoUrl = config?.branding?.logoUrl;`);
    }

    // Replace `<Icon name="leaf"` with `<Image>`
    const text = loginScreen.getFullText();
    const newText = text.replace(
        /<Icon name="leaf" size={64} color={colors\.primary} \/>/g,
        `{logoUrl ? <Image source={{ uri: logoUrl }} style={{ width: 64, height: 64, resizeMode: 'contain' }} /> : <Icon name="leaf" size={64} color={colors.primary} />}`
    );
    loginScreen.replaceWithText(newText);
}

const splashScreen = project.getSourceFile('src/screens/SplashScreen.tsx');
if (splashScreen) {
    const reactNativeImport = splashScreen.getImportDeclaration(decl => decl.getModuleSpecifierValue() === 'react-native');
    if (reactNativeImport && !reactNativeImport.getNamedImports().some(n => n.getName() === 'Image')) {
        reactNativeImport.addNamedImport('Image');
    }
    
    splashScreen.addImportDeclaration({
        namedImports: ['ConfigContext'],
        moduleSpecifier: '../store/ConfigContext',
    });
    
    const reactImport = splashScreen.getImportDeclaration(decl => decl.getModuleSpecifierValue() === 'react');
    if (reactImport && !reactImport.getNamedImports().some(n => n.getName() === 'useContext')) {
        reactImport.addNamedImport('useContext');
    }

    const components = splashScreen.getFunctions().filter(f => f.getName() === 'SplashScreen');
    for (const comp of components) {
        comp.insertStatements(1, `const ctx = useContext(ConfigContext);\nconst logoUrl = ctx?.config?.branding?.logoUrl;`);
    }

    // Replace `<Icon name="leaf"` with `<Image>`
    const text = splashScreen.getFullText();
    const newText = text.replace(
        /<Icon name="leaf" size={64} color={colors\.primary} \/>/g,
        `{logoUrl ? <Image source={{ uri: logoUrl }} style={{ width: 64, height: 64, resizeMode: 'contain' }} /> : <Icon name="leaf" size={64} color={colors.primary} />}`
    );
    splashScreen.replaceWithText(newText);
}

project.saveSync();
console.log('Logo patched.');
