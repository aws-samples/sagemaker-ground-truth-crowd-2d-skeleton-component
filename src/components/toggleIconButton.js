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
import { ICONOIR_CSS } from '../iconoir';
class ToggleIconButton extends HTMLElement {
  constructor () {
    super();

    // Create a shadow root
    const shadow = this.attachShadow({ mode: 'open' });

    // Create the button element
    const button = document.createElement('div');

    // Get the icon names from attributes or use default values
    const iconOn = this.getAttribute('icon-on') || 'iconoir-eye-empty';
    const iconOff = this.getAttribute('icon-off') || 'iconoir-eye-off';
    const iconOnTooltip = this.getAttribute('icon-on-tooltip') || null;
    const iconOffTooltip = this.getAttribute('icon-off-tooltip') || null;

    this.startingState = this.getAttribute('starting-state') || true;

    // Set the initial icon
    button.innerHTML = `<div class="button" role="button" title="${iconOnTooltip}">
                        <i  class="icon ${iconOn}"></i>
                    </div>`;

    // Get the size from the attribute or use the default value
    const size = this.getAttribute('size') || '24px';
    button.style.width = size;
    button.style.height = size;

    // Attach event listener to toggle the icon
    button.addEventListener('click', () => {
      this.startingState = !this.startingState;
      if (this.startingState) {
        // button.innerHTML = `<iron-icon icon="${iconOn}"></iron-icon>`;
        button.innerHTML = `
                     <div class="button" role="button" title="${iconOnTooltip}">
                        <i  class="icon ${iconOn}"></i>
                    </div>
                `;
      } else {
        button.innerHTML = `
                     <div class="button" role="button" title="${iconOffTooltip}">
                        <i  class="icon ${iconOff}"></i>
                    </div>
                `;
      }
    });

    // Apply styling using the shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-flex;
        justify-self: center;
        align-items: center;
      }
      div {
        cursor: pointer;
        color: rgb(84, 91, 100);
       display: inline-flex;
       justify-self: center;
        align-items: center;
        font-size: 10px;
        /* Add more custom styles here */
      }
      .icon{
        font-size: ${size}
      }
      
      ${ICONOIR_CSS}
    `;

    // Append the button and style to the shadow root
    shadow.appendChild(style);
    shadow.appendChild(button);
  }
}

// Define the custom element
customElements.define('toggle-icon-button', ToggleIconButton);
