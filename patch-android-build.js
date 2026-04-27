import fs from 'fs';
import path from 'path';

const rootBuildGradle = path.join(process.cwd(), 'android', 'build.gradle');
const appBuildGradle = path.join(process.cwd(), 'android', 'app', 'build.gradle');
const variablesGradle = path.join(process.cwd(), 'android', 'variables.gradle');
const gradleWrapperProperties = path.join(process.cwd(), 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');

/**
 * Robustly patches a Gradle or properties file by replacing patterns.
 * Supports patterns with or without equals sign, and quoted strings.
 */
function patchFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) {
        console.log(`ℹ️ File not found: ${filePath}`);
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    for (const { pattern, replacement } of replacements) {
        content = content.replace(pattern, replacement);
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Patched ${path.relative(process.cwd(), filePath)}`);
    } else {
        console.log(`ℹ️ No changes needed for ${path.relative(process.cwd(), filePath)}`);
    }
}

// 1. Patch variables.gradle (Source of truth for versions in Capacitor)
patchFile(variablesGradle, [
    { pattern: /minSdkVersion\s*=?\s*\d+/g, replacement: 'minSdkVersion = 22' },
    { pattern: /compileSdkVersion\s*=?\s*\d+/g, replacement: 'compileSdkVersion = 34' },
    { pattern: /targetSdkVersion\s*=?\s*\d+/g, replacement: 'targetSdkVersion = 34' },
    { pattern: /kotlin_version\s*=?\s*['"][\d.]+['"]/g, replacement: "kotlin_version = '1.9.10'" }
]);

// 2. Patch root build.gradle
patchFile(rootBuildGradle, [
    // Support both old 'classpath' and new 'plugins' style
    { pattern: /com\.android\.tools\.build:gradle:\d+\.\d+\.\d+/g, replacement: 'com.android.tools.build:gradle:8.2.1' },
    { pattern: /id\s*['"]com\.android\.application['"]\s*version\s*['"][\d.]+['"]/g, replacement: "id 'com.android.application' version '8.2.1'" },
    { pattern: /id\s*['"]com\.android\.library['"]\s*version\s*['"][\d.]+['"]/g, replacement: "id 'com.android.library' version '8.2.1'" },
    { pattern: /id\s*['"]org\.jetbrains\.kotlin\.android['"]\s*version\s*['"][\d.]+['"]/g, replacement: "id 'org.jetbrains.kotlin.android' version '1.9.10'" },
    { pattern: /ext\.kotlin_version\s*=\s*['"][\d.]+['"]/g, replacement: "ext.kotlin_version = '1.9.10'" }
]);

// 3. Patch app build.gradle
patchFile(appBuildGradle, [
    // Ensure Java 17 compatibility (handles both Groovy styles)
    { pattern: /sourceCompatibility\s*=?\s*JavaVersion\.VERSION_\d+/g, replacement: 'sourceCompatibility = JavaVersion.VERSION_17' },
    { pattern: /targetCompatibility\s*=?\s*JavaVersion\.VERSION_\d+/g, replacement: 'targetCompatibility = JavaVersion.VERSION_17' },
    { pattern: /jvmTarget\s*=?\s*['"][\d.]+['"]/g, replacement: "jvmTarget = '17'" }
]);

// 4. Patch gradle-wrapper.properties
patchFile(gradleWrapperProperties, [
    // Capacitor 6 works best with 8.2 or 8.5+. We'll stick to 8.2.1 for consistency with AGP 8.2.1
    { pattern: /gradle-\d+\.\d+(\.\d+)?-all\.zip/, replacement: 'gradle-8.2.1-all.zip' }
]);
