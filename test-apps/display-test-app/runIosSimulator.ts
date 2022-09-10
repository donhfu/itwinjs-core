/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { copyFile } from 'fs/promises';
import { execSync } from 'child_process';

// Can't use import here otherwise Typescript complains: Could not find a declaration file for module 'node-simctl'.
const Simctl = require("node-simctl").default;

const appName = "imodeljs-test-app"
const bundleId = `bentley.${appName}`;
const bimFile = "mirukuru.ibim";

// Similar to the launchApp function but doesn't retry, adds the --console option, and allows for args.
Simctl.prototype.launchAppWithConsole = async function (bundleId: string, ...args: [string]) {
  const {stdout} = await this.exec('launch', {
    args: ["--console", this.requireUdid('launch'), bundleId, ...args],
  });
  return stdout.trim();
}

async function main() {
  const simctl = new Simctl();
  process.exitCode = 1;

  console.log("Getting iOS devices");
  const results = await simctl.getDevices(undefined, 'iOS');
  var device: { name: string; sdk: string; udid: string; state: string; } | undefined;
  const keys = Object.keys(results).filter(key => key.startsWith("13"));
  if (!keys.length) {
    console.log("No simulators for iOS 13 found.");
    return;
  }

  // Sort by version, newest first
  if (keys.length > 1)
    keys.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  
  // Look for a booted simulator
  for (const key of keys) {
    device = results[key].find((curr: { state: string; }) => curr.state === "Booted");
    if (device)
      break;
  }

  // If none are booted, use the iPad Pro (ii-inch) if available, otherwise the first one listed
  if (!device) {
    device = results[keys[0]].find((device: { name: string; }) => device.name.startsWith("iPad Pro (11")) ?? results[keys[0]][0];
  }

  if (!device) {
    console.log("Unable to find an iOS 13.x simulator.")
    return;
  }

  // Select the simulator we're using with simctl
  console.log(`Using simulator: ${device.name} iOS: ${device.sdk}`);
  simctl.udid = device.udid;

  // Boot the simulator if needed
  if (device.state !== "Booted") {
    console.log(`Booting simulator: ${device.name}`);
    await simctl.bootDevice();
  }

  // Install the app
  console.log("Getting build directory");
  const output = execSync("xcodebuild -showBuildSettings", { cwd: `${__dirname}/ios/imodeljs-test-app`, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore']}).split("\n");
  const buildDir = output.find(line => line.includes("BUILD_DIR = "))?.trim().substring(12).slice(0, -9); // removes the "BUILD_DIR = " prefix, and the "/Products" suffix
  if (!buildDir) {
    console.log("Unable to determine BUILD_DIR from xcodebuild -showBuildSettings");
    return;
  }
  const appPath = `${buildDir}/Debug-iphonesimulator/${appName}.app`;
  console.log(`Installing app from: ${appPath}`);
  await simctl.installApp(appPath);

  // Copy the model to the simulator's Documents dir
  const container = await simctl.getAppContainer(bundleId, "data");
  const assetsPath = "../../core/backend/src/test/assets";
  console.log(`Copying model from: ${assetsPath} into the app's Documents.`);
  await copyFile(`${__dirname}/${assetsPath}/${bimFile}`, `${container}/Documents/${bimFile}`);

  // Launch the app instructing it to open the model and exit
  console.log("Launching app");
  const stdout = await simctl.launchAppWithConsole(bundleId, `IMJS_STANDALONE_FILENAME=${bimFile}`, "IMJS_EXIT_AFTER_MODEL_OPENED=1");
  if (stdout.includes("iModel opened")) {
    process.exitCode = 0;
    console.log("Success!");
  } else {
    console.log("Failed.");
  }
}

main();
