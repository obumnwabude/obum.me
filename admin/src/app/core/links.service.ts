import { Injectable, signal } from '@angular/core';
import {
  type DocumentData,
  FieldPath,
  Timestamp,
  collection,
  deleteField,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import { db } from './firebase';

export interface Link {
  id: string;
  short: string;
  long: string;
  createdAt: Date;
  updatedAt: Date | null;
  clicks: number;
  lastClickedAt: Date | null;
  tags: string[];
  /** One early document stored its slug under a field named "short " (with a space). */
  legacyShortField: boolean;
}

export interface LinkInput {
  short: string;
  long: string;
  tags: string[];
}

const asDate = (value: unknown): Date | null => (value instanceof Timestamp ? value.toDate() : null);

function toLink(id: string, data: DocumentData): Link {
  const legacy = typeof data['short '] === 'string' && typeof data['short'] !== 'string';
  return {
    id,
    short: (legacy ? data['short '] : data['short']) ?? '',
    long: data['long'] ?? '',
    createdAt: asDate(data['createdAt']) ?? new Date(0),
    updatedAt: asDate(data['updatedAt']),
    clicks: typeof data['clicks'] === 'number' ? data['clicks'] : 0,
    lastClickedAt: asDate(data['lastClickedAt']),
    tags: Array.isArray(data['tags']) ? data['tags'].filter((tag: unknown) => typeof tag === 'string') : [],
    legacyShortField: legacy,
  };
}

const linksCounter = () => doc(db, 'counters', 'links');

@Injectable({ providedIn: 'root' })
export class LinksService {
  readonly links = signal<Link[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    onSnapshot(
      query(collection(db, 'links'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        this.links.set(snapshot.docs.map((d) => toLink(d.id, d.data({ serverTimestamps: 'estimate' }))));
        this.loading.set(false);
        this.error.set(null);
      },
      (error) => {
        this.error.set(error.message);
        this.loading.set(false);
      },
    );
  }

  byId(id: string | null | undefined): Link | undefined {
    return id ? this.links().find((link) => link.id === id) : undefined;
  }

  /** Another link already using this short name, if any. */
  conflict(short: string, exceptId?: string): Link | undefined {
    return this.links().find((link) => link.short === short && link.id !== exceptId);
  }

  async create(input: LinkInput): Promise<string> {
    const ref = doc(collection(db, 'links'));
    const batch = writeBatch(db);
    batch.set(ref, {
      id: ref.id,
      short: input.short,
      long: input.long,
      tags: input.tags,
      clicks: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(linksCounter(), { count: increment(1) }, { merge: true });
    await batch.commit();
    return ref.id;
  }

  async update(link: Link, input: LinkInput): Promise<void> {
    const ref = doc(db, 'links', link.id);
    if (link.legacyShortField) {
      await updateDoc(
        ref,
        new FieldPath('short '),
        deleteField(),
        'short',
        input.short,
        'long',
        input.long,
        'tags',
        input.tags,
        'updatedAt',
        serverTimestamp(),
      );
      return;
    }
    await updateDoc(ref, { short: input.short, long: input.long, tags: input.tags, updatedAt: serverTimestamp() });
  }

  /** Deletes the link and returns a function that restores it exactly as it was. */
  async remove(link: Link): Promise<() => Promise<void>> {
    const ref = doc(db, 'links', link.id);
    const original = (await getDoc(ref)).data();
    const batch = writeBatch(db);
    batch.delete(ref);
    batch.set(linksCounter(), { count: increment(-1) }, { merge: true });
    await batch.commit();

    return async () => {
      if (!original) return;
      const restore = writeBatch(db);
      restore.set(ref, original);
      restore.set(linksCounter(), { count: increment(1) }, { merge: true });
      await restore.commit();
    };
  }
}
