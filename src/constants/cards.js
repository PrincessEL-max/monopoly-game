// Card effects are normalized from the supplied ZIP data for the game reducer.
import cardData from './millionaire-cards.json';

const ACTION_TYPES = {
  receive: 'collect',
  pay: 'pay',
  receive_from_each_player: 'collect_players',
  pay_each_player: 'pay_players',
  move_to: 'move_to',
  move_back: 'move_by',
  move_forward: 'move_by',
  move_to_nearest: 'move_nearest',
  move_to_any_unowned_property: 'move_any_unowned',
  go_to_jail: 'jail',
  get_out_of_jail_card: 'jail_free',
  repair: 'repairs',
};

const normalizeCard = (card) => ({
  ...card,
  type: card.power_up ? 'power_up' : ACTION_TYPES[card.action],
  target: card.target === 'go'
    ? 0
    : card.target === 'last_tile_before_go'
      ? 39
      : card.target,
  nearestType: card.target === 'airport' || card.target === 'station_or_port'
    ? 'airport'
    : card.target === 'utility'
      ? 'utility'
      : undefined,
  steps: card.action === 'move_back' ? -card.steps : card.steps,
  collectGo: card.pass_go_bonus,
  perHouse: card.per_house,
  perHotel: card.per_hotel,
  rentMultiplier: card.rent_multiplier,
});

export const CHANCE_CARDS = cardData.chance.map(normalizeCard);
export const COMMUNITY_CHEST_CARDS = cardData.community_chest.map(normalizeCard);

export const shuffleDeck = (deck) =>
  [...deck].sort(() => Math.random() - 0.5);
