/**
 * Loop detector for deterministic War game states.
 * Uses a hash of all player queues to detect visited states.
 */

export class LoopDetector {
  private visitedStates = new Set<string>();

  /**
   * Hash the current game state (all player hands as ordered arrays of rank strings).
   */
  hashState(playerHands: string[][]): string {
    return playerHands.map((hand) => hand.join(",")).join("|");
  }

  /**
   * Check if a state has been visited before. If not, record it.
   * Returns true if this is a LOOP (already visited).
   */
  checkAndRecord(playerHands: string[][]): boolean {
    const hash = this.hashState(playerHands);
    if (this.visitedStates.has(hash)) {
      return true;
    }
    this.visitedStates.add(hash);
    return false;
  }

  reset(): void {
    this.visitedStates.clear();
  }

  get stateCount(): number {
    return this.visitedStates.size;
  }
}
