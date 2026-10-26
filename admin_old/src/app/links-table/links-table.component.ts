import {
  ApplicationRef,
  Component,
  EventEmitter,
  OnInit,
  Output
} from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  collection,
  Firestore,
  onSnapshot,
  query
} from '@angular/fire/firestore';
import { MatSnackBar } from '@angular/material/snack-bar';
import { orderBy } from 'firebase/firestore';
import { firstValueFrom } from 'rxjs';
import { Link } from '../link';

@Component({
  selector: 'obum-links-table',
  templateUrl: './links-table.component.html',
  styleUrls: ['./links-table.component.scss']
})
export class LinksTableComponent implements OnInit {
  columns: string[] = [];
  @Output() edit = new EventEmitter<Link>();
  isSignedIn = false;
  isFetchingLinks = true;
  links: Link[] = [];

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private ref: ApplicationRef,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.auth.onAuthStateChanged((u) => {
      this.isSignedIn = !!u;
      this.ref.tick();
      this.columns = [
        ...(this.isSignedIn ? ['edit'] : []),
        'short',
        'long',
        'createdAt'
      ];
    });

    onSnapshot(
      query(
        collection(this.firestore, 'links').withConverter(Link.converter),
        orderBy('createdAt', 'desc')
      ),
      {
        next: (snap) => {
          this.links = [];
          snap.forEach((doc) => this.links.push(doc.data()));
          this.isFetchingLinks = false;
          this.ref.tick();
        },
        error: (error) => {
          firstValueFrom(
            this.snackBar
              .open(error.message, 'REFRESH PAGE', {
                panelClass: ['snackbar-error']
              })
              .onAction()
          ).then(() => window.location.reload());
        }
      }
    );
  }
}
