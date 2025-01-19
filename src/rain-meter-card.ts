/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, PropertyValues, CSSResultGroup } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
} from 'custom-card-helpers';

import type { RainMeterCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { CARD_VERSION } from './const';
import { localize } from './localize/localize';

/* eslint no-console: 0 */
console.info(
    `%c  rain-meter-CARD \n%c  ${localize('common.version')} ${CARD_VERSION}    `,
    'color: orange; font-weight: bold; background: black',
    'color: white; font-weight: bold; background: dimgray',
);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'rain-meter-card',
  name: 'Rain Meter Card',
  description: 'A custom Home Assistant card that displays daily rainfall and hourly precipitation rate with a clear visual gauge.',
});

@customElement('rain-meter-card')
export class RainMeterCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private config!: RainMeterCardConfig;

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('rain-meter-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }

  public setConfig(config: RainMeterCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = { name: 'Rain Meter', ...config };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return !!this.config && hasConfigOrEntityChanged(this, changedProps, false);
  }

  protected render(): TemplateResult | void {
    if (this.config.show_warning) {
      return this._showWarning(localize('common.show_warning'));
    }

    if (this.config.show_error) {
      return this._showError(localize('common.show_error'));
    }

    const { entity, max_level, is_imperial, border_colour, fill_drop_colour, hourly_rate_entity } = this.config;
    const entityState = entity ? this.hass.states[entity] : undefined;
    const stateValue = entityState ? parseFloat(entityState.state) : 0;

    let maxLevel = max_level || 40;
    let unitOfMeasurement = 'mm';
    let totalRainValue = stateValue;

    if (is_imperial) {
      unitOfMeasurement = 'in';
      totalRainValue = this._inches2mm(totalRainValue);
      if (max_level) maxLevel = this._inches2mm(max_level);
    }

    const rainLevel = this._calculateRainLevel(totalRainValue, maxLevel);
    const hourlyRateEntityState = hourly_rate_entity ? this.hass.states[hourly_rate_entity] : undefined;
    const hourlyRateStateValue = hourlyRateEntityState ? parseFloat(hourlyRateEntityState.state) : 0;

    return html`
      <ha-card
        .header=${this.config.name}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this.config.hold_action),
          hasDoubleClick: hasAction(this.config.double_tap_action),
        })}
        tabindex="0"
        .label=${`Rain Meter: ${entity || 'No Entity Defined'}`}
      >
        <div style="display: flex;">
          ${this._renderRainDrop(rainLevel, border_colour || '#000000', fill_drop_colour)}
          ${this._renderInfo(stateValue, unitOfMeasurement, hourlyRateEntityState, hourlyRateStateValue)}
        </div>
      </ha-card>
    `;
  }

  private _renderRainDrop(rainLevel: number, borderColour: string, fillDropColour: string | undefined): TemplateResult {
    return html`
      <div style="width: 50%; padding-bottom: 20px;">
        <div id="banner">
          <svg
            version="1.1"
            id="logo"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            xml:space="preserve"
            viewBox="0 0 32 32"
          >
            <defs>
              <!-- Clip path para limitar el contenido dentro de la forma -->
              <clipPath id="drop">
                <path
                  d="M 16 32 C 9.935 32 5 27.065 5 21 C 5 19.158 5.466 17.333 6.348 15.723 L 14.238 1.053 L 14.376 0.857 C 14.749 0.324 15.354 0 16 0 C 16.65 0 17.258 0.328 17.631 0.867 L 17.762 1.053 L 25.655 15.727 C 26.534 17.337 27 19.16 27 21 C 27 27.065 22.065 32 16 32 Z"
                />
              </clipPath>
            </defs>
            <!-- Grupo contenido dentro del clip-path -->
            <g clip-path="url(#drop)">
              <!-- Olas estáticas -->
              <path 
                fill="${fillDropColour ? fillDropColour : 'var(--accent-color)'}"
                transform="translate(0, ${rainLevel})"
                d="M 0 1 Q 0.67 1 1.33 0.5 Q 2.67 -0.5 4 0.5 Q 4.67 1 5.33 1 Q 6 1 6.67 0.5 Q 8 -0.5 9.33 0.5 Q 10 1 10.67 1 Q 11.33 1 12 0.5 Q 13.33 -0.5 14.67 0.5 Q 15.33 1 16 1 Q 16.67 1 17.33 0.5 Q 18.67 -0.5 20 0.5 Q 20.67 1 21.33 1 Q 22 1 22.67 0.5 Q 24 -0.5 25.33 0.5 Q 26 1 26.67 1 Q 27.33 1 28 0.5 Q 29.33 -0.5 30.67 0.5 Q 31.33 1 32 1 L 32 200 L 0 200 Z"
              ></path>
            </g>
            <g>
              <path
                d="M16 32c-6.065 0-11-4.935-11-11 0-1.842.466-3.667 1.348-5.277l7.89-14.67.138-.196c.373-.533.978-.857 1.624-.857.65 0 1.258.328 1.631.867l.131.186 7.893 14.674c.879 1.61 1.345 3.433 1.345 5.273 0 6.065-4.935 11-11 11zm-.008-29.985l-7.886 14.662c-.725 1.323-1.106 2.815-1.106 4.323 0 4.963 4.038 9 9 9 4.963 0 9-4.037 9-9 0-1.506-.381-2.999-1.102-4.316l-.004-.006-7.819-14.539-.083-.124zM16 28c-.552 0-1-.447-1-1s.448-1 1-1c2.757 0 5-2.243 5-5 0-.553.447-1 1-1s1 .447 1 1c0 3.859-3.141 7-7 7z"
                fill="${borderColour ? borderColour : 'var(--secondary-text-color)'}"
              ></path>
            </g>
          </svg>
        </div>
      </div>
    `;
  }

  private _renderInfo(
    stateValue: number,
    unitOfMeasurement: string,
    hourlyRateEntityState: any | undefined,
    hourlyRateStateValue: number,
  ): TemplateResult {
    return html`
      <div class="text-container">
        <div class="info-text">${localize('common.total', '', '', this.config.language)}</div>
        <div class="value-text">${stateValue} <span class="unit-text">${unitOfMeasurement}</span></div>
        ${this._showHourlyRate(hourlyRateEntityState, hourlyRateStateValue, unitOfMeasurement)}
      </div>
    `;
  }

  private _showHourlyRate(
    hourlyRateEntityState: any | undefined,
    hourlyRateStateValue: number,
    unitOfMeasurement: string,
  ): TemplateResult | void {
    if (!hourlyRateEntityState) return;
    return html`
      <div class="info-text">${localize('common.rate', '', '', this.config.language)}</div>
      <div class="value-text">${hourlyRateStateValue} <span class="unit-text">${unitOfMeasurement}/h</span></div>
    `;
  }

  private _calculateRainLevel(totalRainValue: number, maxLevel: number): number {
    const rainDropBoxHeight = 30;
    if (totalRainValue > 0 && totalRainValue < maxLevel) {
      return rainDropBoxHeight - Math.round((rainDropBoxHeight / maxLevel) * totalRainValue);
    }
    return totalRainValue >= maxLevel ? 0 : rainDropBoxHeight;
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html`<hui-warning>${warning}</hui-warning>`;
  }

  private _showError(error: string): TemplateResult {
    return html`<hui-error-card .config=${{ type: 'error', error, origConfig: this.config }}></hui-error-card>`;
  }

  private _inches2mm(value: number): number {
    return Math.round((value * 25.4 + Number.EPSILON) * 100) / 100;
  }

  static get styles(): CSSResultGroup {
    return css`
      .info-text {
        color: var(--secondary-text-color);
        font-weight: 500;
        font-size: 18px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        padding-bottom: 10px;
      }
      .value-text {
        font-size: 28px;
        margin-right: 4px;
        padding-bottom: 16px;
      }
      .unit-text {
        font-size: 16px;
        color: var(--secondary-text-color);
      }
      .text-container {
        padding-bottom: 20px;
        padding-left: 12px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
    `;
  }
}
