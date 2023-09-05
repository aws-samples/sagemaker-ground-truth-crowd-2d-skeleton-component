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
class CollapsibleElement extends HTMLElement {
  constructor () {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
          <style>
            .collapsible {
              border: 1px solid #ddd;
              border-radius: 4px;
              margin-bottom: 1em;
            }

            .collapsible-header {
              background-color: #f5f5f5;
              padding: 0.5em;
              cursor: pointer;
              display: flex;
            }

            .collapsible-content {
              padding: 0.5em;
              display: none;
            }
          </style>
          <div class="collapsible">
            <div class="collapsible-header">
              <iron-icon icon="icons:chevron-right" class="collapsible-button"></iron-icon>
              <slot name="header"></slot>
            </div>
            <div class="collapsible-content">
              <slot name="content"></slot>
            </div>
          </div>
        `;

    this.headerElement = this.shadowRoot.querySelector('.collapsible-button');
    this.contentElement = this.shadowRoot.querySelector('.collapsible-content');
    this.headerElement.addEventListener('click', this.toggleContent.bind(this));
  }

  connectedCallback () {
    const initialState = this.getAttribute('initial-state');
    if (initialState === 'expanded') {
      this.contentElement.style.display = 'block';
      const icon = this.shadowRoot.querySelector('iron-icon');
      icon.icon = 'icons:expand-more';
    }
  }

  toggleContent () {
    this.contentElement.style.display = this.contentElement.style.display === 'none' ? 'block' : 'none';
    const icon = this.shadowRoot.querySelector('iron-icon');
    icon.icon = this.contentElement.style.display === 'none' ? 'icons:chevron-right' : 'icons:expand-more';
  }
}

customElements.define('collapsible-element', CollapsibleElement);
