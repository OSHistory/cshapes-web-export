import { Component, OnInit } from '@angular/core';

import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import Map from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import * as proj from 'ol/proj';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';

import { InfoDialogComponent } from './dialogs/info-dialog/info-dialog.component';

import { FeatureService } from './services/feature.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'cshapes-web-export';
  map: Map;
  geoSource: VectorLayer;
  dateList: Date[] = [];
  currDate: Date;
  mode = 'cow';
  loading = true;
  geoData: SafeUrl;
  dataName: string;
  countryName: string;

  constructor(
    private dialog: MatDialog,
    public snackbar: MatSnackBar,
    private featureService: FeatureService,
    private sanitizer: DomSanitizer
  ) {
    this.featureService.ready$
      .subscribe((ready: boolean) => {
        console.log(ready);
      });

    this.featureService.timestampChange$
      .subscribe((dateList: Date[]) => {
        this.dateList = dateList;
        this.currDate = this.dateList[0];
        this.onDateChange({ value: this.dateList[0] });
        this.updateURI();
      });
  }

  ngOnInit() {
    this.geoSource = new VectorSource({
      features: []
    });

    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM()
        }),
        new VectorLayer({
          source: this.geoSource
        })
      ],
      view: new View({
        center: [0, 0],
        zoom: 2
      })
    });

    this.map.on('pointermove', (evt: any) => {
      if (evt.dragging) {
        return false;
      }
      const pixel = this.map.getEventPixel(evt.originalEvent);
      const hasFeature = this.map.hasFeatureAtPixel(pixel);
      if (hasFeature) {
        this.map.forEachFeatureAtPixel(pixel, (feature: Feature, layerObj: any) => {
          this.countryName = feature.get('CNTRY_NAME');
        });
      } else {
        this.countryName = '';
      }

    });
  }

  public updateURI() {
    const geoWriter = new GeoJSON({
      defaultDataProjection: 'EPSG:4326'
    });
    const result = geoWriter.writeFeatures(this.geoSource.getFeatures(), {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326'
    });
    const blob = new Blob([result], { type: 'text/json' });
    const url = window.URL.createObjectURL(blob);
    this.geoData = this.sanitizer.bypassSecurityTrustUrl(url);
    const dateString = this.currDate.toDateString().replace(/ /g, '_').toLowerCase();

    this.dataName = `${this.mode}_${dateString}.geojson`;
  }

  public onDateChange(event: any) {
    const prevFeatureCnt = this.geoSource.getFeatures().length;
    const features = this.featureService.getFeaturesForDate(event.value);
    this.geoSource.clear();
    this.geoSource.addFeatures(features);
    this.snackbar.open(
      `Map has ${features.length} features (${features.length - prevFeatureCnt}).`, '', {
        duration: 1200
    });
    this.updateURI();
    this.loading = false;
  }

  public onModeChange(event: any) {
    this.featureService.setMode(event.value.toUpperCase());
  }

  public onInfoClick() {
    this.dialog.open(InfoDialogComponent, {
      width: '600px'
    });
  }
}
