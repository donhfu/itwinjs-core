#!/bin/bash

cd ios/imodeljs-test-app || { echo "cd failed"; exit 1; }
echo "Getting Xcode build settings"
BUILD_SETTINGS=$(xcrun xcodebuild -resolvePackageDependencies -showBuildSettings) || { echo "xcrun xcodebuild -resolvePackageDependencies -showBuildSettings failed"; exit 1; }
echo "Getting BUILD_DIR"
BUILD_DIR=$(grep -E '^[ ]+BUILD_DIR = ' <<< "${BUILD_SETTINGS}") || { echo "grep for BUILD_DIR failed, full output from xcodebuild:"; echo "$BUILD_SETTINGS"; exit 1; }
SYMROOT=${BUILD_DIR# *BUILD_DIR = }
SYMROOT=${SYMROOT%/Products}
if [ -z "$SYMROOT" ]; then
    echo "ERROR: SYMROOT is empty"
    exit 1
fi
echo "SYMROOT: $SYMROOT"

CODE_SIGNING=("CODE_SIGN_STYLE='Manual'" "CODE_SIGN_IDENTITY=''" "CODE_SIGNING_REQUIRED=NO" "PROVISIONING_PROFILE_SPECIFIER=''")
OPTS=("-arch" "x86_64" "-sdk" "iphonesimulator" "-configuration" "Debug")
xcrun xcodebuild build SYMROOT="${SYMROOT}" "${CODE_SIGNING[@]}" "${OPTS[@]}"
