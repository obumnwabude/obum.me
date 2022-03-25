import { NgModule } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import {
  provideAnalytics,
  getAnalytics,
  ScreenTrackingService,
  UserTrackingService
} from '@angular/fire/analytics';
import { connectAuthEmulator, provideAuth, getAuth } from '@angular/fire/auth';
import {
  connectFirestoreEmulator,
  provideFirestore,
  getFirestore
} from '@angular/fire/firestore';
import { ReactiveFormsModule } from '@angular/forms';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSidenavModule } from '@angular/material/sidenav';
import {
  MatSnackBarModule,
  MAT_SNACK_BAR_DEFAULT_OPTIONS
} from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { environment } from '../environments/environment';
import { AppComponent } from './app.component';
import { EditorComponent } from './editor/editor.component';

@NgModule({
  declarations: [AppComponent, EditorComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatBottomSheetModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSidenavModule,
    MatSnackBarModule,
    MatToolbarModule,
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    ...(environment.production ? [provideAnalytics(() => getAnalytics())] : []),
    provideAuth(() => {
      const auth = getAuth();
      if (!environment.production) connectAuthEmulator(auth, 'localhost:9099');
      return auth;
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      if (!environment.production) {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      }
      return firestore;
    }),
    ReactiveFormsModule
  ],
  providers: [
    ScreenTrackingService,
    UserTrackingService,
    {
      provide: MAT_SNACK_BAR_DEFAULT_OPTIONS,
      useValue: { duration: 5000, verticalPosition: 'top' }
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
