import { Injectable } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Link } from './link';

@Injectable({
  providedIn: 'root'
})
export class EditorService {
  currentLink: Link | null = null;
  sidenav!: MatSidenav;
}
