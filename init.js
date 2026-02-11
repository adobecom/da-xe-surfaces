import { LitElement, html } from 'lit';

export default class XeSites extends LitElement {
  static properties = { name: { type: String } };

  constructor() {
    super();
    this.name = 'Xe Sites';
  }

  render() {
    return html`<p>Hello, ${this.name}!</p>`;
  }
}
customElements.define('xe-sites', XeSites);
