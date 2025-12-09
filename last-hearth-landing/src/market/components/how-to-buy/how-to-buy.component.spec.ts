/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { HowToBuyComponent } from './how-to-buy.component';

describe('HowToBuyComponent', () => {
  let component: HowToBuyComponent;
  let fixture: ComponentFixture<HowToBuyComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ HowToBuyComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(HowToBuyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
