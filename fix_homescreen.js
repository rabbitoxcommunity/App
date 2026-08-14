const fs = require('fs');
let text = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');
text = text.replace('const styles = React.useMemo(() => makeStyles(colors), [colors]);', 'const styles = React.useMemo(() => makeStyles(colors, theme), [colors, theme]);');
text = text.replace('const makeStyles = (colors: ThemeColors) => StyleSheet.create({', "import { Theme } from '../theme';\nconst makeStyles = (colors: ThemeColors, theme: Theme) => StyleSheet.create({");
fs.writeFileSync('src/screens/HomeScreen.tsx', text);
