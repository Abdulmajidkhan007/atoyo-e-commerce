/**
 * RN CODEGEN TEKSHIRUVI (CI uchun tez qalqon).
 *
 * Native kutubxonalarning yangi versiyalari React Native'ning
 * codegen'idan ilgarilab ketishi mumkin: masalan react-native-screens
 * 4.20+ da propType `CT.WithDefault<...>` ko'rinishida yozilgan va
 * RN 0.76 codegen'i uni tushunmaydi ("Unknown prop type"). Bunday holda
 * Gradle build 3 daqiqadan keyin yiqiladi. Bu skript o'sha xatoni
 * bir necha soniyada, Android SDK'siz topadi.
 */
import {execFileSync} from 'node:child_process';
import {existsSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const LIBS = [
  'react-native-screens',
  'react-native-safe-area-context',
  '@react-native-async-storage/async-storage',
  '@react-native-firebase/app',
  '@react-native-firebase/auth',
  '@react-native-firebase/firestore',
  '@react-native-google-signin/google-signin',
];

const cli = 'node_modules/@react-native/codegen/lib/cli/combine/combine-js-to-schema-cli.js';
const out = join(mkdtempSync(join(tmpdir(), 'codegen-')), 'schema.json');
let failed = false;

for (const lib of LIBS) {
  const dir = ['src', 'lib'].map(d => `node_modules/${lib}/${d}`).find(existsSync);
  if (!dir) {
    console.log(`- ${lib}: spec papkasi topilmadi, o'tkazib yuborildi`);
    continue;
  }
  try {
    execFileSync('node', [cli, out, dir], {stdio: 'pipe'});
    console.log(`✓ ${lib}`);
  } catch (error) {
    failed = true;
    const message = String(error.stderr ?? error.message)
      .split('\n')
      .find(line => line.startsWith('Error:')) ?? 'codegen xatosi';
    console.error(`✗ ${lib}: ${message}`);
  }
}

if (failed) {
  console.error(
    '\nCodegen mos kelmadi. Yechim: tegishli paketni React Native ' +
      '0.76 bilan ishlaydigan versiyaga qotirish (package.json da `^` siz).',
  );
  process.exit(1);
}
console.log('\nCodegen tekshiruvi o‘tdi.');
