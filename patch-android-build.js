import fs from 'fs';
import path from 'path';

const rootBuildGradle = path.join(process.cwd(), 'android', 'build.gradle');
const gradleWrapperProperties = path.join(process.cwd(), 'android', 'gradle', 'wrapper', 'gradle-wrapper.properties');

// 1. Upgrade AGP in android/build.gradle
if (fs.existsSync(rootBuildGradle)) {
  let content = fs.readFileSync(rootBuildGradle, 'utf8');
  // Match both 'classpath "com.android.tools.build:gradle:X.X.X"' and 'version "X.X.X"'
  content = content.replace(/com\.android\.tools\.build:gradle:\d+\.\d+\.\d+/, 'com.android.tools.build:gradle:8.3.2');
  content = content.replace(/id ['"]com\.android\.application['"] version ['"]\d+\.\d+\.\d+['"]/, "id 'com.android.application' version '8.3.2'");
  content = content.replace(/id ['"]com\.android\.library['"] version ['"]\d+\.\d+\.\d+['"]/, "id 'com.android.library' version '8.3.2'");
  fs.writeFileSync(rootBuildGradle, content);
  console.log('✅ Upgraded AGP to 8.3.2 in android/build.gradle');
}

// 2. Upgrade Gradle Wrapper
if (fs.existsSync(gradleWrapperProperties)) {
  let content = fs.readFileSync(gradleWrapperProperties, 'utf8');
  // Replace gradle-8.2-all.zip with gradle-8.7-all.zip
  content = content.replace(/gradle-\d+\.\d+-all\.zip/, 'gradle-8.7-all.zip');
  fs.writeFileSync(gradleWrapperProperties, content);
  console.log('✅ Upgraded Gradle Wrapper to 8.7 in gradle-wrapper.properties');
}
