import {
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp
} from '@angular/fire/firestore';

export class Link {
  constructor(
    public id: string,
    public short: string,
    public long: string,
    public createdAt: Date
  ) {}

  static fromJSON(json: any): Link {
    return new Link(
      json['id'],
      json['short'],
      json['long'],
      json['createdAt'].toDate()
    );
  }

  static toJSON(link: Link) {
    const { id, short, long, createdAt } = link;
    return {
      id,
      short,
      long,
      createdAt: Timestamp.fromDate(createdAt)
    };
  }

  static converter = {
    toFirestore: this.toJSON,
    fromFirestore: (
      snapshot: QueryDocumentSnapshot,
      options: SnapshotOptions
    ): Link => this.fromJSON(snapshot.data(options))
  };
}
