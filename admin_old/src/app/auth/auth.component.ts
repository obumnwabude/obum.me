import { Component, OnInit } from '@angular/core';
import {
  Auth,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithRedirect
} from '@angular/fire/auth';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {
  hasLoadedPage = false;
  isSigningIn = false;
  isSignedIn = false;

  constructor(
    public auth: Auth,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    this.auth.onAuthStateChanged((u) => (this.isSignedIn = !!u));
    try {
      const redirectRes = await getRedirectResult(this.auth);
      this.hasLoadedPage = true;
      if (redirectRes) {
        const idTokenResult = await redirectRes.user.getIdTokenResult();
        if (idTokenResult.claims['admin']) {
          this.snackBar.open('Welcome Boss Obum 🙇‍♂️', '', {
            panelClass: ['snackbar-success']
          });
        } else {
          this.snackBar.open(
            `${redirectRes.user.email} is not Obum's email 🙄😑.`,
            '',
            {
              panelClass: ['snackbar-error']
            }
          );
          await redirectRes.user.delete();
          await this.auth.signOut();
        }
        this.router.navigateByUrl('/');
      }
    } catch (error: any) {
      this.snackBar.open(error.message, '', {
        panelClass: ['snackbar-error']
      });
    }
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.isSigningIn) {
      try {
        this.isSigningIn = true;
        await signInWithRedirect(this.auth, new GoogleAuthProvider());
      } catch (error: any) {
        this.snackBar.open(error.message);
        this.isSigningIn = false;
      }
    }
  }
}
