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
import { ICONOIR_CSS } from '../../../iconoir';
const template = document.createElement('template');
template.innerHTML = `
<style>
    *{
        box-sizing: border-box;
    }
    :host {
      box-sizing: border-box;
    }
    .button{
        width: 32px;
        height: 32px;
        padding: 5px;
        border: solid 1px grey;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
    }
    ${ICONOIR_CSS}
</style>

<div></div>
<div class="button" role="button" title="{{tooltip}}">
    <i class="{{icon}}"></i>
</div>
`;

class CrowdPose extends HTMLElement {
  constructor () {
    super();
    const templateVariables = {
      tooltip: this.getAttribute('tooltip'),
      icon: this.getAttribute('icon')
    };
    const clone = template.content.cloneNode(true);
    const button = clone.querySelector('.button');
    const icon = clone.querySelector('i');

    button.setAttribute('title', templateVariables.tooltip);
    icon.className = templateVariables.icon;

    const shadowRoot = this.attachShadow({ mode: 'open' });

    shadowRoot.append(clone);
  }
}

customElements.define('icon-button', CrowdPose);
