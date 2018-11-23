import { Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable, Subject } from 'rxjs';

import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON';

interface FeatureItem {
  feature: Feature,
  start: Date,
  end: Date
};


@Injectable({
  providedIn: 'root'
})
export class FeatureService {

  /**
   * Stores all features (to be filtered by date)
   */
  featureItems: FeatureItem[] = [];

  /**
   * A list of all date cuts, inferred from the dataset
   */
  dateCuts: Date[] = [];

  origGeoJSON: any;

  /**
   * Triggered after initial reading of geojson file
   */
  private _readySource = new Subject<boolean>();
  public ready$ = this._readySource.asObservable();

  /**
   * Triggered on each update of the valid timestamps
   */
  private _timestampChangeSource = new Subject<Date[]>();
  public timestampChange$ = this._timestampChangeSource.asObservable();

  /**
   * Mode (COW or GW)
   */
  mode = 'COW';

  modeCache = {
    'COW': {},
    'GW': {}
  };

  constructor(
    private http: HttpClient
  ) {
    this.http.get('./assets/cshapes.geojson')
      .subscribe((cshapes: any) => {
        this.origGeoJSON = cshapes;
        this.dateCuts = this._collectDateCuts(cshapes['features']);
        this.featureItems = this._collectFeatureItems(cshapes);
        this._readySource.next(true);
        this._timestampChangeSource.next(this.dateCuts);
      });
  }

  private _getDate(properties: any, _type: string): Date {
    // non applicable (not in the mode are marked with -1)
    if (properties[this.mode + _type + 'YEAR'] > -1) {
      return new Date(
        properties[this.mode + _type + 'YEAR'],
        properties[this.mode + _type + 'MONTH'] + 1,
        properties[this.mode + _type + 'DAY']
      );
    } else {
      return undefined;
    }
  }

  private _collectFeatureItems(geojson): FeatureItem[] {
    if (this.modeCache[this.mode]['featureItems'] !== undefined) {
      return this.modeCache[this.mode]['featureItems'];
    }
    let startDate: Date;
    let endDate: Date;
    const featureItems: FeatureItem[] = [];
    let features: Feature[] = (new GeoJSON()).readFeatures(geojson, {
      featureProjection: 'EPSG:3857'
    });
    features.forEach((feature: Feature) => {
      startDate = this._getDate(feature.getProperties(), 'S');
      endDate = this._getDate(feature.getProperties(), 'E');
      if (startDate !== undefined && endDate !== undefined) {
        featureItems.push({
          start: startDate,
          end: endDate,
          feature: feature
        });
      }
      feature.set('start_date', startDate);
      feature.set('end_date', endDate);
    });
    features = features.filter((feature: Feature) => {
      return feature.get('start_date') !== undefined;
    });
    this.modeCache[this.mode]['featureItems'] = featureItems;
    return featureItems;
  }

  private _collectDateCuts(features: any[]) {
    if (this.modeCache[this.mode]['dateCuts'] !== undefined) {
      return this.modeCache[this.mode]['dateCuts'];
    }
    const dateStrings: string[] = [];
    const dateCuts: Date[] = [];
    let currStartDate: Date;
    let currEndDate: Date;
    features.forEach((feature: any) => {
      currStartDate = this._getDate(feature['properties'], 'S');
      currEndDate = this._getDate(feature['properties'], 'E');
      if (currStartDate !== undefined && currEndDate !== undefined) {
        // Check if already present and append
        if (dateStrings.indexOf(currStartDate.toISOString()) === -1) {
          dateStrings.push(currStartDate.toISOString());
          dateCuts.push(currStartDate);
        }
        if (dateStrings.indexOf(currEndDate.toISOString()) === -1) {
          dateStrings.push(currEndDate.toISOString());
          dateCuts.push(currEndDate);
        }
      }
    });
    dateCuts.sort((a, b) => a > b ? 1 : a < b ? -1 : 0);
    return this.modeCache[this.mode]['dateCuts'] = dateCuts;
    // return dateCuts;
  }

  public setMode(mode: string) {
    this.mode = mode;
    this.dateCuts = this._collectDateCuts(this.origGeoJSON['features']);
    this.featureItems = this._collectFeatureItems(this.origGeoJSON);
    this._timestampChangeSource.next(this.dateCuts);
  }

  public getMode(): string {
    return this.mode;
  }

  public getFeaturesForDate(targetDate: Date): Feature[] {
    const outFeatures = this.featureItems.filter((featureItem: FeatureItem) => {
      return featureItem['start'] <= targetDate && featureItem['end'] >= targetDate;
    });
    const features = outFeatures.map((featureItem: FeatureItem) => {
      return featureItem['feature'];
    });
    return features;

  }



}
