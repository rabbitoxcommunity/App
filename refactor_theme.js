const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

const sourceFiles = project.getSourceFiles();

let filesModified = 0;

for (const sourceFile of sourceFiles) {
  const imports = sourceFile.getImportDeclarations();
  let themeImport = null;
  let importsColors = false;

  for (const imp of imports) {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    if (moduleSpecifier.endsWith('theme')) {
      themeImport = imp;
      const namedImports = imp.getNamedImports();
      for (const namedImport of namedImports) {
        if (namedImport.getName() === 'colors') {
          importsColors = true;
        }
      }
    }
  }

  // We skip ConfigContext because we don't want to refactor the provider itself
  if (!importsColors || sourceFile.getBaseName() === 'ConfigContext.tsx') continue;

  console.log(`Refactoring ${sourceFile.getBaseName()}...`);

  const filePath = sourceFile.getFilePath();
  const srcDir = path.join(__dirname, 'src');
  const relativeToSrc = path.relative(path.dirname(filePath), srcDir);
  const configContextPath = (relativeToSrc === '' ? '.' : relativeToSrc) + '/store/ConfigContext';
  
  const existingConfigImport = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue().includes('store/ConfigContext'));
  
  if (existingConfigImport) {
      if (!existingConfigImport.getNamedImports().some(n => n.getName() === 'useTheme')) {
          existingConfigImport.addNamedImport('useTheme');
      }
  } else {
      sourceFile.addImportDeclaration({
        namedImports: ['useTheme'],
        moduleSpecifier: configContextPath.replace(/\\/g, '/'),
      });
  }

  const styleDeclarations = sourceFile.getVariableDeclarations().filter(d => d.getName() === 'styles');
  let hasStyles = false;
  for (const styleDecl of styleDeclarations) {
    const init = styleDecl.getInitializer();
    if (init && init.getText().startsWith('StyleSheet.create')) {
        hasStyles = true;
        const statement = styleDecl.getFirstAncestorByKind(SyntaxKind.VariableStatement);
        statement.replaceWithText(`const makeStyles = (colors: any) => ${init.getText()};`);
    }
  }

  const functions = sourceFile.getFunctions();
  const arrowFunctions = sourceFile.getVariableDeclarations()
      .map(d => d.getInitializer())
      .filter(i => i && i.getKind() === SyntaxKind.ArrowFunction);
      
  const allComponents = [...functions, ...arrowFunctions].filter(func => {
      // Very basic heuristic for React component: Returns JSX
      // Or in our case, we can just inject into every component
      const body = func.getBody ? func.getBody() : null;
      if (!body) return false;
      return body.getText().includes('return <') || body.getText().includes('return (');
  });

  for (const func of allComponents) {
    const body = func.getBody ? func.getBody() : func;
    if (body && body.getKind() === SyntaxKind.Block) {
      let statementsToInsert = `const { colors } = useTheme();\n`;
      if (hasStyles) {
          statementsToInsert += `const styles = React.useMemo(() => makeStyles(colors), [colors]);\n`;
          
          const reactImport = sourceFile.getImportDeclaration(decl => decl.getModuleSpecifierValue() === 'react');
          if (!reactImport) {
              sourceFile.addImportDeclaration({
                  defaultImport: 'React',
                  moduleSpecifier: 'react'
              });
          } else if (!reactImport.getDefaultImport() && !reactImport.getNamespaceImport()) {
               reactImport.setDefaultImport('React');
          }
      }
      // @ts-ignore
      func.insertStatements ? func.insertStatements(0, statementsToInsert) : body.insertStatements(0, statementsToInsert);
    }
  }

  if (themeImport) {
      const namedImports = themeImport.getNamedImports();
      const colorsImport = namedImports.find(n => n.getName() === 'colors');
      if (colorsImport) {
          colorsImport.remove();
      }
      if (themeImport.getNamedImports().length === 0) {
          themeImport.remove();
      }
  }

  filesModified++;
}

project.saveSync();
console.log(`Modified ${filesModified} files.`);
