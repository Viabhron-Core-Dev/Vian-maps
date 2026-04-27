import fs from 'fs';
import path from 'path';

const rootBuildGradle = path.join(process.cwd(), 'android', 'build.gradle');
const appBuildGradle = path.join(process.cwd(), 'android', 'app', 'build.gradle');
const gradleWrapperProperties = path.join(process.cwd(), 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');

function patchGradleFile(filePath) {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Match both 'classpath "com.android.tools.build:gradle:X.X.X"' and 'version "X.X.X"'
    content = content.replace(/com\.android\.tools\.build:gradle:\d+\.\d+\.\d+/, 'com.android.tools.build:gradle:8.3.2');
    content = content.replace(/id ['"]com\.android\.application['"] version ['"]\d+\.\d+\.\d+['"]/, "id 'com.android.application' version '8.3.2'");
    content = content.replace(/id ['"]com\.android\.library['"] version ['"]\d+\.\d+\.\d+['"]/, "id 'com.android.library' version '8.3.2'");
    
    // Set Java 21 and Kotlin
    content = content.replace(/sourceCompatibility = JavaVersion\.VERSION_\d+/g, 'sourceCompatibility = JavaVersion.VERSION_21');
    content = content.replace(/targetCompatibility = JavaVersion\.VERSION_\d+/g, 'targetCompatibility = JavaVersion.VERSION_21');
    content = content.replace(/jvmTarget = ['"]\d+['"]/g, "jvmTarget = '21'");
    content = content.replace(/id ['"]org\.jetbrains\.kotlin\.android['"] version ['"]\d+\.\d+\.\d+['"]/, "id 'org.jetbrains.kotlin.android' version '1.9.23'");
    content = content.replace(/ext\.kotlin_version = ['"]\d+\.\d+\.\d+['"]/, "ext.kotlin_version = '1.9.23'");
    
    if (content !== original) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Patched ${filePath} (AGP 8.3.2 / Java 21)`);
    } else {
      console.log(`ℹ️ No changes needed for ${filePath}`);
    }
  }
}

// 1. Upgrade AGP and Java versions
patchGradleFile(rootBuildGradle);
patchGradleFile(appBuildGradle);

// 2. Upgrade Gradle Wrapper
if (fs.existsSync(gradleWrapperProperties)) {
  let content = fs.readFileSync(gradleWrapperProperties, 'utf8');
  // Replace gradle-8.2-all.zip with gradle-8.7-all.zip
  content = content.replace(/gradle-\d+\.\d+-all\.zip/, 'gradle-8.7-all.zip');
  fs.writeFileSync(gradleWrapperProperties, content);
  console.log('✅ Upgraded Gradle Wrapper to 8.7 in gradle-wrapper.properties');
}
