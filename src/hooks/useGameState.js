// ============================================================
// useGameState.js - React hook exposing the shared game reducer.
// ============================================================

import { useReducer, useCallback } from 'react';
import { ACTIONS, INITIAL_GAME_STATE, reducer } from '../logic/gameReducer.js';

export const useGameState = () => {
  const [state, dispatch] = useReducer(reducer, INITIAL_GAME_STATE);

  // ── ACTION DISPATCHERS ──────────────────────────────────────
  const startGame    = useCallback((playerSetups) => dispatch({ type: ACTIONS.START_GAME, playerSetups }), []);
  const loadGame     = useCallback((snapshot) => dispatch({ type: ACTIONS.LOAD_GAME, snapshot }), []);
  const syncState    = useCallback((snapshot) => dispatch({ type: ACTIONS.SYNC_STATE, snapshot }), []);
  const dispatchAction = useCallback((action) => dispatch(action), []);
  const rollDiceAct  = useCallback(() => dispatch({ type: ACTIONS.ROLL_DICE }), []);
  const buyProp      = useCallback((squareId) => dispatch({ type: ACTIONS.BUY_PROPERTY, squareId }), []);
  const declineBuy   = useCallback(() => dispatch({ type: ACTIONS.DECLINE_BUY }), []);
  const payRent      = useCallback(() => dispatch({ type: ACTIONS.PAY_RENT }), []);
  const payTax       = useCallback(() => dispatch({ type: ACTIONS.PAY_TAX }), []);
  const drawCard     = useCallback(() => dispatch({ type: ACTIONS.DRAW_CARD }), []);
  const applyCardAct = useCallback(() => dispatch({ type: ACTIONS.APPLY_CARD }), []);
  const payJailFineAct     = useCallback(() => dispatch({ type: ACTIONS.PAY_JAIL_FINE }), []);
  const useJailCardAct     = useCallback((source) => dispatch({ type: ACTIONS.USE_JAIL_FREE_CARD, source }), []);
  const buyHouseAct  = useCallback((squareId) => dispatch({ type: ACTIONS.BUY_HOUSE, squareId }), []);
  const buyHotelAct  = useCallback((squareId) => dispatch({ type: ACTIONS.BUY_HOTEL, squareId }), []);
  const sellHouseAct = useCallback((squareId) => dispatch({ type: ACTIONS.SELL_HOUSE, squareId }), []);
  const sellHotelAct = useCallback((squareId) => dispatch({ type: ACTIONS.SELL_HOTEL, squareId }), []);
  const mortgageAct  = useCallback((squareId) => dispatch({ type: ACTIONS.MORTGAGE, squareId }), []);
  const unmortgageAct= useCallback((squareId) => dispatch({ type: ACTIONS.UNMORTGAGE, squareId }), []);
  const auctionBidAct  = useCallback((amount) => dispatch({ type: ACTIONS.AUCTION_BID, amount }), []);
  const auctionPassAct = useCallback(() => dispatch({ type: ACTIONS.AUCTION_PASS }), []);
  const settleDebtAct  = useCallback(() => dispatch({ type: ACTIONS.SETTLE_DEBT }), []);
  const proposeTrade = useCallback((offer)    => dispatch({ type: ACTIONS.PROPOSE_TRADE, offer }), []);
  const acceptTrade  = useCallback(() => dispatch({ type: ACTIONS.ACCEPT_TRADE }), []);
  const rejectTrade  = useCallback(() => dispatch({ type: ACTIONS.REJECT_TRADE }), []);
  const declareBankruptcy = useCallback(() => dispatch({ type: ACTIONS.DECLARE_BANKRUPTCY }), []);
  const endTurn      = useCallback(() => dispatch({ type: ACTIONS.END_TURN }), []);
  const dismissModal = useCallback(() => dispatch({ type: ACTIONS.DISMISS_MODAL }), []);

  // ── DERIVED STATE ───────────────────────────────────────────
  const currentPlayer = state.players[state.currentPlayerIndex] ?? null;
  const activePlayers = state.players.filter((p) => !p.bankrupt);
  const isGameOver    = state.phase === 'ended';

  return {
    // state
    ...state,
    currentPlayer,
    activePlayers,
    isGameOver,

    // actions
    startGame,
    loadGame,
    syncState,
    dispatchAction,
    rollDice: rollDiceAct,
    buyProperty: buyProp,
    declineBuy,
    payRent,
    payTax,
    drawCard,
    applyCard: applyCardAct,
    payJailFine: payJailFineAct,
    useJailFreeCard: useJailCardAct,
    buyHouse: buyHouseAct,
    buyHotel: buyHotelAct,
    sellHouse: sellHouseAct,
    sellHotel: sellHotelAct,
    mortgage: mortgageAct,
    unmortgage: unmortgageAct,
    auctionBid: auctionBidAct,
    auctionPass: auctionPassAct,
    settleDebt: settleDebtAct,
    proposeTrade,
    acceptTrade,
    rejectTrade,
    declareBankruptcy,
    endTurn,
    dismissModal,
  };
};