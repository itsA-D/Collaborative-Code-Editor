declare module 'y-websocket/bin/utils' {
  import { WebSocket } from 'ws';
  import * as Y from 'yjs';

  export interface SetupWSConnectionOptions {
    docName: string;
    doc: Y.Doc;
    gc?: boolean;
  }

  export function setupWSConnection(conn: WebSocket, req: any, options: SetupWSConnectionOptions): void;
  export function getYDoc(docName: string): Y.Doc;
}
