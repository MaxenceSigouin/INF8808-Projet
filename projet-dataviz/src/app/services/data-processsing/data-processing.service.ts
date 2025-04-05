import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http'
import * as d3 from 'd3';

@Injectable({
  providedIn: 'root'
})
export class DataProcessingService {

  constructor(private http: HttpClient) {
    this.http.get('assets/nhldraft.csv', {responseType: 'text'}).subscribe(data => console.log(data)); // Erreur 404 pcq il cherche dans localhost:4200/assets/nhldraft.csv
    d3.csv('assets/nhldraft.csv').then(data => console.log(data)); // Erreur 404 pcq il cherche dans localhost:4200/assets/nhldraft.csv
  }
}
