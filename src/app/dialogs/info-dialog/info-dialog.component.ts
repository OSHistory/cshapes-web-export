import { Component, OnInit } from '@angular/core';

import { C_SHAPES_VERSION, REPO } from '../../vars/settings';

@Component({
  selector: 'app-info-dialog',
  templateUrl: './info-dialog.component.html',
  styleUrls: ['./info-dialog.component.scss']
})
export class InfoDialogComponent implements OnInit {

  cShapesVersion = C_SHAPES_VERSION;
  repoLink = REPO;

  constructor() { }

  ngOnInit() {
  }

}
