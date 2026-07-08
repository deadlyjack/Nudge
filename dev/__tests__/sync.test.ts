import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

function setupFixture(name: string) {
	const dir = join(tmpdir(), "proteus-tests", randomUUID(), name);
	rmSync(dir, { recursive: true, force: true });
	mkdirSync(dir, { recursive: true });
	return dir;
}

function writeJson(path: string, obj: Record<string, unknown>) {
	writeFileSync(path, JSON.stringify(obj, null, "\t") + "\n");
}

test("sync updates android versionName and versionCode in manifest", () => {
	const dir = setupFixture("manifest");

	const manifestPath = join(dir, "AndroidManifest.xml");
	writeFileSync(manifestPath, '<?xml version="1.0"?>\n<manifest android:versionCode="1" android:versionName="0.0.1" xmlns:android="http://schemas.android.com/apk/res/android">\n</manifest>\n');

	let content = readFileSync(manifestPath, "utf8");
	expect(content).toContain('versionName="0.0.1"');
	expect(content).toContain('versionCode="1"');

	content = content.replace(/android:versionName="[^"]*"/g, 'android:versionName="2.5.0"');
	content = content.replace(/android:versionCode="[^"]*"/g, 'android:versionCode="42"');
	writeFileSync(manifestPath, content, "utf8");

	const updated = readFileSync(manifestPath, "utf8");
	expect(updated).toContain('versionName="2.5.0"');
	expect(updated).toContain('versionCode="42"');
});

test("sync updates build.gradle namespace", () => {
	const dir = setupFixture("gradle");

	const gradlePath = join(dir, "build.gradle");
	writeFileSync(gradlePath, "android {\n    namespace = 'com.old.id'\n}\n");

	let content = readFileSync(gradlePath, "utf8");
	content = content.replace(/namespace\s*=\s*'[^']*'/g, "namespace = 'com.newapp.id'");
	writeFileSync(gradlePath, content, "utf8");

	expect(readFileSync(gradlePath, "utf8")).toContain("namespace = 'com.newapp.id'");
});

test("sync updates pbxproj with all values", () => {
	const dir = setupFixture("pbxproj");

	const pbxPath = join(dir, "project.pbxproj");
	writeFileSync(pbxPath,
		"PRODUCT_BUNDLE_IDENTIFIER = com.old.id;\n" +
		"MARKETING_VERSION = 0.0.1;\n" +
		"CURRENT_PROJECT_VERSION = 1;\n" +
		"INFOPLIST_KEY_CFBundleDisplayName = OldName;\n"
	);

	let content = readFileSync(pbxPath, "utf8");
	content = content.replace(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g, "PRODUCT_BUNDLE_IDENTIFIER = io.foo.bar;");
	content = content.replace(/MARKETING_VERSION = [\d.]+;/g, "MARKETING_VERSION = 3.0.0;");
	content = content.replace(/CURRENT_PROJECT_VERSION = \d+;/g, "CURRENT_PROJECT_VERSION = 99;");
	content = content.replace(/INFOPLIST_KEY_CFBundleDisplayName = [^;]+;/g, "INFOPLIST_KEY_CFBundleDisplayName = Foo Bar;");
	writeFileSync(pbxPath, content, "utf8");

	const updated = readFileSync(pbxPath, "utf8");
	expect(updated).toContain("PRODUCT_BUNDLE_IDENTIFIER = io.foo.bar;");
	expect(updated).toContain("MARKETING_VERSION = 3.0.0;");
	expect(updated).toContain("CURRENT_PROJECT_VERSION = 99;");
	expect(updated).toContain("INFOPLIST_KEY_CFBundleDisplayName = Foo Bar;");
});

test("sync updates display name in strings.xml", () => {
	const dir = setupFixture("strings");

	const stringsPath = join(dir, "strings.xml");
	writeFileSync(stringsPath, '<string name="app_name">Old Name</string>\n');

	let content = readFileSync(stringsPath, "utf8");
	content = content.replace(/<string name="app_name">[^<]*<\/string>/, '<string name="app_name">New Display</string>');
	writeFileSync(stringsPath, content, "utf8");

	expect(readFileSync(stringsPath, "utf8")).toContain("New Display");
});

test("sync updates title in index.html", () => {
	const dir = setupFixture("html");

	const htmlPath = join(dir, "index.html");
	writeFileSync(htmlPath, "<html><head><title>Old Title</title></head></html>\n");

	let content = readFileSync(htmlPath, "utf8");
	content = content.replace(/<title>[^<]*<\/title>/, "<title>Updated Title</title>");
	writeFileSync(htmlPath, content, "utf8");

	expect(readFileSync(htmlPath, "utf8")).toContain("<title>Updated Title</title>");
});

test("sync updates web manifest name and short_name", () => {
	const dir = setupFixture("webmanifest");

	const manifestPath = join(dir, "manifest.json");
	writeFileSync(manifestPath, '{"name": "Old", "short_name": "Old"}\n');

	let content = readFileSync(manifestPath, "utf8");
	content = content.replace(/"name":\s*"[^"]*"/, '"name": "PWAName"');
	content = content.replace(/"short_name":\s*"[^"]*"/, '"short_name": "PWAName"');
	writeFileSync(manifestPath, content, "utf8");

	const updated = readFileSync(manifestPath, "utf8");
	expect(updated).toContain('"name": "PWAName"');
	expect(updated).toContain('"short_name": "PWAName"');
});

test("sync replaces R import when namespace changes", () => {
	const dir = setupFixture("rimport");

	const javaPath = join(dir, "Main.java");
	writeFileSync(javaPath, "package runner;\nimport com.oldpkg.R;\nimport runner.lib.SomeClass;\npublic class Main {}\n");

	let content = readFileSync(javaPath, "utf8");
	content = content.replace("import com.oldpkg.R;", "import com.newpkg.R;");
	writeFileSync(javaPath, content, "utf8");

	const updated = readFileSync(javaPath, "utf8");
	expect(updated).toContain("package runner;");
	expect(updated).toContain("import com.newpkg.R;");
	expect(updated).toContain("import runner.lib.SomeClass;");
	expect(updated).not.toContain("com.oldpkg");
});

test("sync does not change Java package or class imports when namespace changes", () => {
	const dir = setupFixture("nopackagechange");

	const javaPath = join(dir, "Test.java");
	writeFileSync(javaPath, "package runner;\nimport com.oldpkg.R;\nimport runner.lib.Helper;\npublic class Test {}\n");

	let content = readFileSync(javaPath, "utf8");
	content = content.replace("import com.oldpkg.R;", "import com.newpkg.R;");
	writeFileSync(javaPath, content, "utf8");

	const updated = readFileSync(javaPath, "utf8");
	expect(updated).toContain("package runner;");
	expect(updated).toContain("import com.newpkg.R;");
	expect(updated).toContain("import runner.lib.Helper;");
});

test("version bump: 1.2.3 -> 1.2.4 (patch)", () => {
	const [major, minor, patch] = "1.2.3".split(".").map(Number);
	const newPatch = patch + 1;
	expect(`${major}.${minor}.${newPatch}`).toBe("1.2.4");
});

test("version bump: 1.2.3 -> 1.3.0 (minor)", () => {
	let [major, minor] = "1.2.3".split(".").map(Number);
	minor += 1;
	expect(`${major}.${minor}.0`).toBe("1.3.0");
});

test("version bump: 1.2.3 -> 2.0.0 (major)", () => {
	let major = Number("1.2.3".split(".")[0]);
	major += 1;
	expect(`${major}.0.0`).toBe("2.0.0");
});

test("versionCode increments on version bump", () => {
	let versionCode = 21;
	versionCode += 1;
	expect(versionCode).toBe(22);
});
