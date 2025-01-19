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
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers

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

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'rain-meter-card',
  name: 'Rain Gauge Card',
  description: 'A template custom card for you to create something awesome',
});

@customElement('rain-meter-card')
export class RainMeterCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('rain-meter-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {};
  }


  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: RainMeterCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: RainMeterCardConfig): void {
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: 'Rain Gauge',
      ...config,
    };
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    if (this.config.show_warning) {
      return this._showWarning(localize('common.show_warning'));
    }

    if (this.config.show_error) {
      return this._showError(localize('common.show_error'));
    }

    const entityId = this.config.entity;
    const entityState = entityId ? this.hass.states[entityId] : undefined;
    const stateValue: number = entityState ? parseFloat(entityState.state) : 0;
    let totalRainValue = stateValue;
    let maxLevelOverride: number = this.config.max_level ? this.config.max_level : 0;

    let maxLevel = 40

    let unitOfMeasurement = 'mm'
    if (this.config.is_imperial) {
      unitOfMeasurement = 'in'
      // const totalRainValueConverted = totalRainValue * 25.4
      // totalRainValue = Math.round((totalRainValueConverted + Number.EPSILON) * 100) / 100
      totalRainValue = this._inches2mm(totalRainValue);
      if (maxLevelOverride > 0) {
        maxLevelOverride = this._inches2mm(maxLevelOverride);
      }
    }

    if (maxLevelOverride) {
      maxLevel = maxLevelOverride
    }

    const rainDropBoxHeight = 32
    let rainLevel = rainDropBoxHeight
    if (totalRainValue > 0 && totalRainValue < maxLevel) {
      rainLevel = rainDropBoxHeight - Math.round(rainDropBoxHeight / maxLevel * totalRainValue)
    }
    if (totalRainValue >= maxLevel) {
      rainLevel = 0
    }

    let borderColour = '#000000'
    if (this.config.border_colour) {
      borderColour = this.config.border_colour
    }

    let fillDropColour = '#04ACFF'
    if (this.config.fill_drop_colour) {
      fillDropColour = this.config.fill_drop_colour
    }

    const hourlyRateEntityId = this.config.hourly_rate_entity;
    const hourlyRateEntityState = hourlyRateEntityId ? this.hass.states[hourlyRateEntityId] : undefined;
    const hourlyRateStateValue:number = hourlyRateEntityState ? parseFloat(hourlyRateEntityState.state) : 0;

    return html`
      <ha-card
        .header=${this.config.name}
        @action=${this._handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this.config.hold_action),
          hasDoubleClick: hasAction(this.config.double_tap_action),
        })}
        tabindex="0"
        .label=${`Rain Gauge: ${this.config.entity || 'No Entity Defined'}`}
      >
        <div style="display: flex;">
          <div style="width: 50%; padding-bottom: 20px;">
            <div id="banner">
              <div>
                <svg version="1.1" id="logo" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" viewBox="0 0 32 32">
                  <defs>
                    <clipPath id="drop">
                    <path d="M 16 32 C 9.935 32 5 27.065 5 21 C 5 19.158 5.466 17.333 6.348 15.723 L 14.238 1.053 L 14.376 0.857 C 14.749 0.324 15.354 0 16 0 C 16.65 0 17.258 0.328 17.631 0.867 L 17.762 1.053 L 25.655 15.727 C 26.534 17.337 27 19.16 27 21 C 27 27.065 22.065 32 16 32 Z"/>
                </clipPath>
                  </defs>
                
                                  <g clip-path="url(#drop)">
                    <g class="fill2">
                      <rect width="32" height="32" style="fill:${fillDropColour};" transform="translate(0, ${rainLevel})"/>
                    </g>
                  </g>
                                  <g>
                    <path d="M16 32c-6.065 0-11-4.935-11-11 0-1.842.466-3.667 1.348-5.277l7.89-14.67.138-.196c.373-.533.978-.857 1.624-.857.65 0 1.258.328 1.631.867l.131.186 7.893 14.674c.879 1.61 1.345 3.433 1.345 5.273 0 6.065-4.935 11-11 11zm-.008-29.985l-7.886 14.662c-.725 1.323-1.106 2.815-1.106 4.323 0 4.963 4.038 9 9 9 4.963 0 9-4.037 9-9 0-1.506-.381-2.999-1.102-4.316l-.004-.006-7.819-14.539-.083-.124zM16 28c-.552 0-1-.447-1-1s.448-1 1-1c2.757 0 5-2.243 5-5 0-.553.447-1 1-1s1 .447 1 1c0 3.859-3.141 7-7 7z" style="fill:${borderColour};"></path>
                  </g>
                </svg>
              </div>
            </div>
          </div>
          <div style="padding-left:10px">
            <div>
              <div style="
                color: var(--secondary-text-color);
                line-height: 40px;
                font-weight: 500;
                font-size: 16px;
                overflow: hidden;
                white-space: nowrap;
                text-overflow: ellipsis;
              ">
                ${localize('common.total', '', '', this.config.language)}
              </div>
              <span style="
                font-size: 28px;
                margin-right: 4px;
                margin-inline-end: 4px;
                margin-inline-start: initial;
              ">
                ${stateValue}
              </span>
              <span style="
                font-size: 18px;
                color: var(--secondary-text-color);
              ">
                 ${unitOfMeasurement}
              </span>
            </div>
            <div>
              ${this._showHourlyRate(hourlyRateEntityState, hourlyRateStateValue, unitOfMeasurement)}
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _showHourlyRate(hourlyRateEntityState: any | undefined, hourlyRateStateValue: number, unitOfMeasurement: string): TemplateResult | void {
    if (hourlyRateEntityState === undefined) return
    return html`<p>
      <div style="
          color: var(--secondary-text-color);
        line-height: 40px;
        font-weight: 500;
        font-size: 16px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        ">
            ${localize('common.rate', '', '', this.config.language)}
      </div>
      <span style="
        font-size: 28px;
        margin-right: 4px;
        margin-inline-end: 4px;
        margin-inline-start: initial;
        ">
        ${hourlyRateStateValue} 
      </span>
      <span style="
        font-size: 18px;
        color: var(--secondary-text-color);
      ">
        ${unitOfMeasurement}/h
      </span>
    </p>`
  }

  private _handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private _showWarning(warning: string): TemplateResult {
    return html` <hui-warning>${warning}</hui-warning> `;
  }

  private _showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html` ${errorCard} `;
  }

  private _inches2mm(value: number): number {
    const valueConverted = value * 25.4
    return Math.round((valueConverted + Number.EPSILON) * 100) / 100
  }

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    return css``;
  }
}
