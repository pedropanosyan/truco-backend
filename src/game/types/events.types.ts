// ============================================================================
// CLIENT TO SERVER EVENTS
// ============================================================================

export enum ClientToServerEvents {
  PLAY_CARD = 'playCard',
  CALL_TRUCO = 'callTruco',
  CALL_ENVIDO = 'callEnvido',
  ACCEPT_CALL = 'acceptCall',
  REJECT_CALL = 'rejectCall',
  RAISE_TRUCO = 'raiseTruco',
  RAISE_ENVIDO = 'raiseEnvido',
}

// ============================================================================
// SERVER TO CLIENT EVENTS
// ============================================================================

export enum ServerToClientEvents {
  GAME_STARTED = 'gameStarted',
  CARD_PLAYED = 'cardPlayed',
  TRUCO_CALLED = 'trucoCalled',
  ENVIDO_CALLED = 'envidoCalled',
  CALL_RESOLVED = 'callResolved',
  ROUND_ENDED = 'roundEnded',
  GAME_OVER = 'gameOver',
  ERROR = 'error',
  TURN_CHANGED = 'turnChanged',
}
