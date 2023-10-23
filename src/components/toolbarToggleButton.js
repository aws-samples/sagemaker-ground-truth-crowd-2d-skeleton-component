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

class ToolbarToggleButton extends HTMLElement {

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
    const fontSize = this.getAttribute('fontSize') || '20px;';
    const hotkey = this.getAttribute('hotkey');
    const hotkeyDiv = hotkey ? `<div class="label-hotkey">${hotkey}</div>` : '';

    // Set the initial state based on the 'starting-state' attribute
    this.state = this.getAttribute('state') === 'true' ||
            !(this.getAttribute('state') === 'false') || true;

    // Set the initial icon based on the initial state
    button.innerHTML = `
      <div class="button" role="button" title="${this.state ? iconOnTooltip : iconOffTooltip}">
        <i class="icon ${this.state ? iconOn : iconOff}"></i>
         ${hotkeyDiv}
      </div>
    `;

    button.addEventListener('click', () => {
      this.state = !this.state;
    });

    // Get the size from the attribute or use the default value
    const size = this.getAttribute('size') || '24px';
    button.style.width = size;
    button.style.height = size;

    // Apply styling using the shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      :root{
                display: block;
            }
            .label-hotkey {
                min-width: 12px;
                text-align: center;
                border-radius: 2px;
                border: 1px solid #d5dbdb;
                font-size: 14px;
                line-height: 13px;
                color: #879596;
                padding: 2px;
                margin-top: 5px;
            }
            .button{
                display: flex;
                flex-direction: column;
                justify-items: center;
                align-items: center;
                cursor: pointer;
                width: 45px;      
            }
            .icon{
                font-size: ${fontSize};
                padding: 5px;
                color: var(--icon-color, black);
                font-weight: var(--icon-font-weight, initial);
                border: var(--icon-border-style, solid) 1px var(--icon-color, grey);
                background: var(--icon-background, transparent);
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
            }
            ${ICONOIR_CSS}
    `;

    // Append the button and style to the shadow root
    shadow.appendChild(style);
    shadow.appendChild(button);
  }

  // Define a getter and setter for the 'state' attribute
  get state () {
    return this.getAttribute('state') === 'true';
  }

  set state (value) {
    if (value) {
      this.setAttribute('state', 'true');
    } else {
      this.setAttribute('state', 'false');
    }
  }

  // Watch for changes to the 'state' attribute and update the component
  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'state' && oldValue !== newValue) {
      this.toggleIcon(newValue === 'true');
    }
  }

  // Define a method to toggle the icon based on the state
  toggleIcon (newState) {
    const iconOn = this.getAttribute('icon-on') || 'iconoir-eye-empty';
    const iconOff = this.getAttribute('icon-off') || 'iconoir-eye-off';
    const iconOnTooltip = this.getAttribute('icon-on-tooltip') || null;
    const iconOffTooltip = this.getAttribute('icon-off-tooltip') || null;
    const hotkey = this.getAttribute('hotkey');
    const hotkeyDiv = hotkey ? `<div class="label-hotkey">${hotkey}</div>` : '';

    const button = this.shadowRoot.querySelector('.button');
    if (newState) {
      button.innerHTML = `
        <div class="button" role="button" title="${iconOnTooltip}">
          <i class="icon ${iconOn}"></i>
           ${hotkeyDiv}
        </div>
      `;
    } else {
      button.innerHTML = `
        <div class="button" role="button" title="${iconOffTooltip}">
          <i class="icon ${iconOff}"></i>
           ${hotkeyDiv}
        </div>
      `;
    }
  }

  // Define observed attributes
  static get observedAttributes () {
    return ['state'];
  }
}

// Define the custom element
customElements.define('toolbar-toggle-button', ToolbarToggleButton);
