import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const cwd = process.cwd();
const packageJsonFile = resolve(cwd, "package.json");
const manifestFile = resolve(cwd, "platforms/android/app/src/main/AndroidManifest.xml");
const buildGradleFile = resolve(cwd, "platforms/android/app/build.gradle");
const pbxprojFile = resolve(cwd, "platforms/ios/runner.xcodeproj/project.pbxproj");
const javaDir = resolve(cwd, "platforms/android/app/src/main/java");
const stringsFile = resolve(cwd, "platforms/android/app/src/main/res/values/strings.xml");
const indexHtml = resolve(cwd, "src/index.html");
const webManifest = resolve(cwd, "src/res/manifest.json");
const settingsGradleFile = resolve(cwd, "platforms/android/settings.gradle");
const infoPlistFile = resolve(cwd, "platforms/ios/runner/Info.plist");
const androidBuildFile = resolve(cwd, "dev/android/build.js");
const vscodeSettingsFile = resolve(cwd, ".vscode/settings.json");

export default function sync() {
  const pkg = JSON.parse(readFileSync(packageJsonFile, "utf8"));
  const oldGradle = readFileSync(buildGradleFile, "utf8");
  const oldNs = oldGradle.match(/namespace\s*=\s*'([^']*)'/)?.[1] || "";

  const nameParts = pkg.name.split(".");
  const scheme = nameParts[nameParts.length - 1];
  const secondScheme = nameParts.length >= 2 ? nameParts[nameParts.length - 2] : scheme;

  patchManifest(pkg);
  patchBuildGradle(pkg);
  patchPbxproj(pkg);
  patchJavaRImport(oldNs, pkg.name);
  patchDisplayName(pkg);
  patchSettingsGradle(pkg);
  patchManifestScheme(scheme);
  patchInfoPlist(pkg, scheme, secondScheme);
  patchAndroidBuildBackup();
  patchVscodeSpellCheck(pkg, scheme);
}

function patchManifest(pkg) {
  let content = readFileSync(manifestFile, "utf8");
  content = content.replace(/android:versionName="[^"]*"/g, `android:versionName="${pkg.version}"`);
  content = content.replace(/android:versionCode="[^"]*"/g, `android:versionCode="${pkg.versionCode}"`);
  writeFileSync(manifestFile, content, "utf8");
}

function patchBuildGradle(pkg) {
  let content = readFileSync(buildGradleFile, "utf8");
  content = content.replace(/namespace\s*=\s*'[^']*'/g, `namespace = '${pkg.name}'`);
  writeFileSync(buildGradleFile, content, "utf8");
}

function patchPbxproj(pkg) {
  let content = readFileSync(pbxprojFile, "utf8");
  content = content.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, `PRODUCT_BUNDLE_IDENTIFIER = ${pkg.name};`);
  content = content.replace(/MARKETING_VERSION = [\d.]+;/g, `MARKETING_VERSION = ${pkg.version};`);
  content = content.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${pkg.versionCode};`);
  content = content.replace(/INFOPLIST_KEY_CFBundleDisplayName = [^;]+;/g, `INFOPLIST_KEY_CFBundleDisplayName = "${pkg.displayName}";`);
  writeFileSync(pbxprojFile, content, "utf8");
}

function patchJavaRImport(oldNs, newNs) {
  if (!oldNs || oldNs === newNs) return;
  const oldImport = `import ${oldNs}.R;`;
  const newImport = `import ${newNs}.R;`;
  walkJavaFiles(javaDir, (filePath) => {
    let content = readFileSync(filePath, "utf8");
    if (!content.includes(oldImport)) return;
    content = content.replace(oldImport, newImport);
    writeFileSync(filePath, content, "utf8");
  });
}

function walkJavaFiles(dir, callback) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkJavaFiles(fullPath, callback);
    } else if (entry.name.endsWith(".java")) {
      callback(fullPath);
    }
  }
}

function patchDisplayName(pkg) {
  let strings = readFileSync(stringsFile, "utf8");
  strings = strings.replace(/<string name="app_name">[^<]*<\/string>/, `<string name="app_name">${pkg.displayName}</string>`);
  writeFileSync(stringsFile, strings, "utf8");

  let html = readFileSync(indexHtml, "utf8");
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${pkg.displayName}</title>`);
  writeFileSync(indexHtml, html, "utf8");

  try {
    let wm = readFileSync(webManifest, "utf8");
    wm = wm.replace(/"name":\s*"[^"]*"/, `"name": "${pkg.displayName}"`);
    wm = wm.replace(/"short_name":\s*"[^"]*"/, `"short_name": "${pkg.displayName}"`);
    wm = wm.replace(/"description":\s*"[^"]*"/, `"description": "A ${pkg.displayName} app"`);
    writeFileSync(webManifest, wm, "utf8");
  } catch {
    // web manifest may not exist yet
  }

  let pkgContent = readFileSync(packageJsonFile, "utf8");
  pkgContent = pkgContent.replace(/"description":\s*"[^"]*"/, `"description": "A hybrid app built with the ${pkg.displayName} template"`);
  writeFileSync(packageJsonFile, pkgContent, "utf8");
}

function patchSettingsGradle(pkg) {
  let content = readFileSync(settingsGradleFile, "utf8");
  content = content.replace(/rootProject\.name\s*=\s*"[^"]*"/, `rootProject.name = "${pkg.displayName}"`);
  writeFileSync(settingsGradleFile, content, "utf8");
}

function patchManifestScheme(scheme) {
  let content = readFileSync(manifestFile, "utf8");
  content = content.replace(/android:scheme="[^"]*"/g, `android:scheme="${scheme}"`);
  writeFileSync(manifestFile, content, "utf8");
}

function patchInfoPlist(pkg, scheme, secondScheme) {
  let content = readFileSync(infoPlistFile, "utf8");
  content = content.replace(/(<key>CFBundleDisplayName<\/key>\s*\n\s*<string>)[^<]*(<\/string>)/, `$1${pkg.displayName}$2`);
  content = content.replace(/(<key>CFBundleURLName<\/key>\s*\n\s*<string>)[^-<]+(-deep-link<\/string>)/, `$1${scheme}$2`);
  content = content.replace(
    /(<key>CFBundleURLSchemes<\/key>\s*\n\s*<array>\s*\n\s*<string>)[^<]*(<\/string>\s*\n\s*<string>)[^<]*(<\/string>)/,
    `$1${secondScheme}$2${scheme}$3`,
  );
  writeFileSync(infoPlistFile, content, "utf8");
}

function patchAndroidBuildBackup() {
  let content = readFileSync(androidBuildFile, "utf8");
  content = content.replace(/\$\{gradlePropertiesPath\}\.proteus\.bak/g, "$" + "{gradlePropertiesPath}.backup");
  writeFileSync(androidBuildFile, content, "utf8");
}

function patchVscodeSpellCheck(pkg, scheme) {
  try {
    const settings = JSON.parse(readFileSync(vscodeSettingsFile, "utf8"));
    if (!settings["cSpell.words"]) {
      settings["cSpell.words"] = [];
    }
    const words = new Set(settings["cSpell.words"]);
    words.add(pkg.displayName);
    words.add(scheme);
    settings["cSpell.words"] = [...words].sort();
    writeFileSync(vscodeSettingsFile, `${JSON.stringify(settings, null, "\t")}\n`, "utf8");
  } catch {
    // vscode settings may not exist
  }
}
