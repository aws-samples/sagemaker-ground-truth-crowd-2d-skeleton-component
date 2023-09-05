/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
/**
 * This script can be used to update which icons are available in the UI.
 * See the packageIcons function for more details.
 *
 * Run:
 *      node packageIcons.js
 * */
import * as fs from 'fs';
import https from 'https';

/**
 * Extracts CSS classes from a file and saves them to another file.
 * @param {string} cssFilePath - The path to the CSS file.
 * @param {string[]} classList - The list of CSS class names to extract.
 * @param {string} outputFilePath - The path to the output file.
 */
function extractClassesFromFile (cssFilePath, classList, outputFilePath) {
  const cssContent = fs.readFileSync(cssFilePath, 'utf8');
  let result = '';

  classList.forEach(className => {
    const regexString = `\\.${className}\\b[^{]*{[^}]*}`;
    const regex = new RegExp(regexString, 'g');
    const matches = cssContent.match(regex);

    if (matches && matches.length > 0) {
      matches.forEach(match => {
        const classBlock = match.replace(/[\r\n\t]/g, '');
        result += `${classBlock}\n`;
      });
    } else {
      console.log(`Class not found: ${className}\n`);
    }
  });

  fs.writeFileSync(outputFilePath, result);
  console.log(`Results saved to: ${outputFilePath}`);
}

/**
 * Downloads a CSS file from a given URL and saves it to a destination file.
 * @param {string} fileUrl - The URL of the CSS file to download.
 * @param {string} destination - The path to the destination file.
 * @returns {Promise} A promise that resolves when the file is downloaded successfully or rejects with an error.
 */
function downloadCSSFile (fileUrl, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https.get(fileUrl, (response) => {
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`File downloaded successfully to ${destination}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destination, () => {
        console.error(`Error downloading file: ${err.message}`);
        reject(err);
      });
    });
  });
}

/**
 * Packages a subset of iconoir icons by downloading the full CSS file and extracting specific classes.
 * Modify the `classesToExtract` array with the icons you want to export. Once exported to iconoir.css
 * add them to src/iconoir.js
 */
async function packageIcons () {
  const fileUrl = 'https://cdn.jsdelivr.net/gh/iconoir-icons/iconoir@main/css/iconoir.css';
  const cssFilePath = './iconoir.css';

  await downloadCSSFile(fileUrl, cssFilePath);

  const classesToExtract = [
    'iconoir-eye-empty', 'iconoir-eye-off', 'iconoir-delete-circle', 'iconoir-trash',
    'iconoir-add-hexagon', 'iconoir-add-frame', 'iconoir-zoom-in', 'iconoir-zoom-out', 'iconoir-center-align',
    'iconoir-frame-select', 'iconoir-frame-select', 'iconoir-delete-circle', 'iconoir-add-circle',
    'iconoir-save-floppy-disk', 'iconoir-linear', 'iconoir-3d-select-point', 'iconoir-undo', 'iconoir-redo'
  ]; // Replace with the icons you want to export.
  const outputFilePath = 'extracted_classes.txt';
  extractClassesFromFile(cssFilePath, classesToExtract, outputFilePath);
}

packageIcons();
