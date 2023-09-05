/**
 * @license
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
import { defineConfig } from 'vite';
import banner from 'vite-plugin-banner';
import * as fs from 'fs';

let bannerContents = '';
bannerContents += fs.readFileSync('THIRD_PARTY_LICENSES', { encoding: 'utf8', flag: 'r' });
bannerContents += `
--------------------------------------------------------------------------------

`;
bannerContents += fs.readFileSync('LICENSE', { encoding: 'utf8', flag: 'r' });
bannerContents += `

--------------------------------------------------------------------------------
This code was built using a minification process. See 
https://github.com/aws-samples/sagemaker-ground-truth-crowd-2d-skeleton-component
for more details. 
`;

export default defineConfig({
  plugins: [banner(bannerContents)],
  build: {
    copyPublicDir: false,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'crowd-2d-skeleton.js'
      }
    }
  }
});
