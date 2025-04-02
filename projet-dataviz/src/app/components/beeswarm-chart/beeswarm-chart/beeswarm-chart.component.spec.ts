import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BeeswarmChartComponent } from './beeswarm-chart.component';

describe('BeeswarmChartComponent', () => {
  let component: BeeswarmChartComponent;
  let fixture: ComponentFixture<BeeswarmChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BeeswarmChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BeeswarmChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
