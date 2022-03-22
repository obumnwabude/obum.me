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
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { environment } from '../environments/environment';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
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
    })
  ],
  providers: [ScreenTrackingService, UserTrackingService],
  bootstrap: [AppComponent]
})
export class AppModule {}
