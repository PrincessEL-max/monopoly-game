// ============================================================
// useAI.js — Hook yang menjalankan giliran AI secara otomatis
//
// Catatan: sesi LELANG (auction) tidak ditangani di sini — penawaran
// AI dikemudikan oleh AuctionModal (lihat komponen modal), karena
// penawar bisa berbeda dari pemilik giliran.
// ============================================================

import { useEffect, useRef } from 'react';
import {
  aiDecideBuy, aiDecideBuild, aiDecideMortgage,
  aiDecideJail, aiEvaluateTrade,
} from '../logic/aiLogic';
import { ACTIONS } from './useGameState';
import { SQUARES, getKomplexSquares } from '../constants/squares';
import { RULES } from '../constants/config';

const AI_DELAY = {
  THINK:  900,   // ms sebelum AI "berpikir"
  ACTION: 600,   // ms antar aksi
};

/** Cari satu bangunan yang bisa dijual AI (hotel dulu, lalu rumah terbanyak) */
const findSellable = (player, gs) => {
  const { owners, houses, hotels, housesLeft } = gs;

  // Hotel dulu (butuh stok 4 rumah untuk dipecah)
  for (const sq of SQUARES) {
    if (owners[sq.id] !== player.id) continue;
    if ((hotels[sq.id] || 0) >= 1 && housesLeft >= RULES.MIN_HOUSES_FOR_HOTEL) {
      return { id: sq.id, type: 'hotel' };
    }
  }
  // Rumah — jual dari petak dengan rumah terbanyak dalam komplex (jual merata)
  for (const sq of SQUARES) {
    if (owners[sq.id] !== player.id) continue;
    const h = houses[sq.id] || 0;
    if (h <= 0) continue;
    const maxK = Math.max(...getKomplexSquares(sq.komplex).map((s) => houses[s.id] || 0));
    if (h === maxK) return { id: sq.id, type: 'house' };
  }
  return null;
};

/**
 * useAI — otomatis eksekusi giliran AI
 *
 * @param {Object} gameState   — dari useGameState
 * @param {Function} actions   — action dispatchers
 * @param {string} difficulty  — 'easy' | 'medium' | 'hard'
 */
export const useAI = (gameState, actions, difficulty = 'medium') => {
  const timerRef = useRef(null);

  const {
    phase, currentPlayer, waitingFor, canRoll, turnEnded,
    landResult, activeCard, pendingTrade, pendingDebt, auction,
  } = gameState;

  const {
    rollDice, buyProperty, declineBuy, payRent, payTax,
    drawCard, applyCard, payJailFine, useJailFreeCard,
    buyHouse, buyHotel, sellHouse, sellHotel, mortgage,
    settleDebt, endTurn, declareBankruptcy,
    acceptTrade, rejectTrade,
  } = actions;

  // Bersihkan timer saat unmount
  useEffect(() => () => clearTimeout(timerRef.current), []);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (!currentPlayer?.isAI) return;
    if (auction) return; // lelang ditangani AuctionModal

    const delay = (fn, ms) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fn, ms);
    };

    // Giliran sudah digeser reducer sendiri (go_to_jail, triple double, dll)
    // Tidak perlu aksi tambahan — clear timer pending dan return.
    if (turnEnded) {
      clearTimeout(timerRef.current);
      return;
    }

    // ── RESPONS TRADE MASUK ──────────────────────────────────
    if (waitingFor === 'TRADE_RESPONSE' && pendingTrade?.to === currentPlayer.id) {
      delay(() => {
        const accept = aiEvaluateTrade(currentPlayer, pendingTrade, gameState, difficulty);
        accept ? acceptTrade() : rejectTrade();
      }, AI_DELAY.THINK);
      return;
    }

    // ── KUMPULKAN DANA / RAISE FUNDS ─────────────────────────
    if (waitingFor === 'RAISE_FUNDS' && pendingDebt) {
      delay(() => {
        const canSettle = pendingDebt.alreadyApplied
          ? currentPlayer.money >= 0
          : currentPlayer.money >= pendingDebt.amount;
        if (canSettle) { settleDebt(); return; }

        const need = pendingDebt.alreadyApplied
          ? -currentPlayer.money
          : pendingDebt.amount - currentPlayer.money;

        // 1) Gadai properti tanpa bangunan
        const toMort = aiDecideMortgage(currentPlayer, need, gameState);
        if (toMort.length > 0) { mortgage(toMort[0]); return; }

        // 2) Jual bangunan
        const sellable = findSellable(currentPlayer, gameState);
        if (sellable) {
          sellable.type === 'hotel' ? sellHotel(sellable.id) : sellHouse(sellable.id);
          return;
        }

        // 3) Tak ada aset lagi → menyerah
        declareBankruptcy();
      }, AI_DELAY.ACTION);
      return;
    }

    // ── BAYAR SEWA ───────────────────────────────────────────
    if (waitingFor === 'PAY_RENT') {
      // Jika uang kurang, dispatch PAY_RENT akan otomatis masuk RAISE_FUNDS
      delay(() => payRent(), AI_DELAY.ACTION);
      return;
    }

    // ── BAYAR PAJAK ──────────────────────────────────────────
    if (waitingFor === 'PAY_TAX') {
      delay(() => payTax(), AI_DELAY.ACTION);
      return;
    }

    // ── BELI ATAU TIDAK (decline → lelang) ───────────────────
    if (waitingFor === 'BUY_DECISION' && landResult?.square) {
      delay(() => {
        const shouldBuy = aiDecideBuy(currentPlayer, landResult.square, gameState, difficulty);
        shouldBuy ? buyProperty(landResult.square.id) : declineBuy();
      }, AI_DELAY.THINK);
      return;
    }

    // ── TARIK KARTU ──────────────────────────────────────────
    if (waitingFor === 'DRAW_CARD') {
      delay(() => drawCard(), AI_DELAY.ACTION);
      return;
    }

    // ── TERAPKAN KARTU ───────────────────────────────────────
    if (waitingFor === 'APPLY_CARD' && activeCard) {
      delay(() => applyCard(), AI_DELAY.ACTION);
      return;
    }

    // ── GILIRAN ROLL ─────────────────────────────────────────
    if (canRoll && !waitingFor) {
      delay(() => {
        // Keluar penjara dulu
        if (currentPlayer.inJail) {
          const shouldPay = aiDecideJail(currentPlayer, gameState, difficulty);
          if (shouldPay) {
            if (currentPlayer.jailFreeCards.chance > 0) {
              useJailFreeCard('chance');
              return;
            }
            if (currentPlayer.jailFreeCards.community_chest > 0) {
              useJailFreeCard('community_chest');
              return;
            }
            if (currentPlayer.jailTurns < 2) {
              // Masih bisa tunggu double, langsung roll
            } else {
              payJailFine();
              return;
            }
          }
        }

        // Bangun rumah/hotel sebelum roll jika bisa
        const builds = aiDecideBuild(currentPlayer, gameState, difficulty);
        if (builds.length > 0) {
          const first = builds[0];
          if (first.type === 'house') {
            buyHouse?.(first.squareId);
          } else {
            buyHotel?.(first.squareId);
          }
          // Akan re-trigger effect, build berikutnya di iterasi selanjutnya
          return;
        }

        rollDice();
      }, AI_DELAY.THINK);
      return;
    }

    // ── END TURN setelah semua aksi selesai ──────────────────
    // landResult bertipe 'own'/'free'/'corner'/'mortgaged' tidak butuh
    // aksi user — AI langsung endTurn meski landResult masih ada.
    const passiveLand = landResult && ['own','free','corner','mortgaged'].includes(landResult.type);
    if (!waitingFor && !canRoll && !turnEnded && !activeCard && !auction) {
      if (!landResult || passiveLand) {
        delay(() => endTurn(), AI_DELAY.ACTION);
      }
    }

  }, [
    phase, currentPlayer, waitingFor, canRoll, turnEnded,
    landResult, activeCard, pendingTrade, pendingDebt, auction, difficulty,
  ]);
};