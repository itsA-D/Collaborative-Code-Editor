import { useEffect } from 'react';

interface CursorData {
  userId: string;
  position: { lineNumber: number; column: number };
}

export function useFollowUser(
  editor: any,
  followId: string | null,
  remoteCursors: Record<string, CursorData>,
  isReady: boolean
) {
  useEffect(() => {
    if (!editor || !isReady || !followId) return;
    
    const followedCursor = remoteCursors[followId];
    if (followedCursor) {
      editor.revealPositionInCenter({
        lineNumber: followedCursor.position.lineNumber,
        column: followedCursor.position.column
      });
    }
  }, [remoteCursors, followId, isReady, editor]);
}
