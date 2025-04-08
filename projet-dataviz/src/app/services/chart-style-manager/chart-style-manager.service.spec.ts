import { TestBed } from '@angular/core/testing';

import { ChartStyleManagerService } from './chart-style-manager.service';

describe('ChartStyleManagerService', () => {
  let service: ChartStyleManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChartStyleManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
