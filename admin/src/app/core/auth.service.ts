import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  GoogleAuthProvider,
  type User,
  getRedirectResult,
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth';

import { auth } from './firebase';

const errorCode = (error: unknown) => (error as { code?: string })?.code ?? '';
const errorMessage = (error: unknown) => (error as { message?: string })?.message ?? 'Sign-in failed. Try again.';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly snackBar = inject(MatSnackBar);

  readonly user = signal<User | null>(null);
  /** True only when the signed-in account carries the `admin` custom claim. */
  readonly isAdmin = signal(false);
  readonly ready = signal(false);
  readonly busy = signal(false);

  constructor() {
    onIdTokenChanged(auth, async (user) => {
      this.user.set(user);
      if (!user) {
        this.isAdmin.set(false);
      } else {
        const token = await user.getIdTokenResult();
        this.isAdmin.set(token.claims['admin'] === true);
      }
      this.ready.set(true);
    });

    getRedirectResult(auth)
      .then((result) => (result ? this.afterSignIn(result.user) : undefined))
      .catch((error) => this.snackBar.open(errorMessage(error), 'Dismiss'));
  }

  async signIn(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await this.afterSignIn(result.user);
    } catch (error) {
      const code = errorCode(error);
      if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
        await signInWithRedirect(auth, provider);
        return;
      }
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        this.snackBar.open(errorMessage(error), 'Dismiss');
      }
    } finally {
      this.busy.set(false);
    }
  }

  async signOut(): Promise<void> {
    await signOut(auth);
    this.snackBar.open('Signed out');
  }

  /** A fresh Firebase ID token for calling the Worker API, or null when signed out. */
  async idToken(): Promise<string | null> {
    return auth.currentUser ? auth.currentUser.getIdToken() : null;
  }

  private async afterSignIn(user: User): Promise<void> {
    const token = await user.getIdTokenResult(true);
    if (token.claims['admin'] === true) {
      this.isAdmin.set(true);
      this.snackBar.open('Welcome Boss Obum 🙇‍♂️');
      return;
    }
    const email = user.email ?? 'That account';
    await user.delete().catch(() => undefined);
    await signOut(auth);
    this.snackBar.open(`${email} is not Obum's email 🙄😑. Signed out.`, 'Dismiss');
  }
}
