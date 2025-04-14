import { Injectable } from '@angular/core';
import { DataProcessingService } from '../data-processsing/data-processing.service';
import * as d3 from 'd3';
@Injectable({
  providedIn: 'root',
})
export class ChartStyleManagerService {
  public customColors = {
    US: '#50a1df', // Blue
    SK: '#f09029', // Orange
    FI: '#807bbf', // Purple
    RU: '#de594d', // Red
    CA: '#67dec6', // Cyan
    SE: '#fbe43a', // Brown
    CZ: '#ed75c9', // Pink
    Others: '#696868', // gray
  };
  color = d3
    .scaleOrdinal()
    .domain(Object.keys(this.customColors)) // Set the domain to the keys of customColors
    .range(Object.values(this.customColors));
  constructor(private dataSrv: DataProcessingService) {
    this.colorDomain();
  }
  /**
   * Sets the domain of the color scale.
   */
  async colorDomain() {
    const data = await this.dataSrv.getData();
    const nationalities = data?.map((d) => d['nationality']) || [];
    const nationalityCounts = nationalities.reduce((acc, nationality) => {
      acc[nationality] = (acc[nationality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedNationalities = Object.entries(nationalityCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([nationality]) => nationality);

    const topNationalities = sortedNationalities.slice(0, 7);

    // Update the data to group non-top nationalities into 'Others'
    (data ?? []).forEach((d) => {
      if (!topNationalities.includes(d['nationality'])) {
        d['nationality'] = 'Others';
      }
    });

    const uniqueNationalities = [
      ...new Set((data ?? []).map((d) => d['nationality'])),
    ];

    // Sort unique nationalities based on counts, with 'Others' at the end
    uniqueNationalities.sort((a, b) => {
      if (a === 'Others') return 1;
      if (b === 'Others') return -1;
      return (nationalityCounts[b] || 0) - (nationalityCounts[a] || 0);
    });

    this.color.domain(uniqueNationalities);
  }
}
