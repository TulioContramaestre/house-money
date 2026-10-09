export function BlackjackRules() {
  return (
    <>
      <h3>Goal</h3>
      <ul>
        <li>Get closer to 21 than the dealer without going over.</li>
        <li>Number cards count their value, J, Q and K count 10, and an ace counts 1 or 11.</li>
      </ul>
      <h3>Your turn</h3>
      <ul>
        <li>Hit to take a card, stand to keep your total.</li>
        <li>Double on your first two cards: double the bet and take exactly one more card.</li>
        <li>Split two cards of the same value into two hands, each with its own bet, up to 4 hands.</li>
        <li>Split aces get one card each and can&apos;t be split again or doubled.</li>
        <li>21 on a split hand is 21, not blackjack.</li>
      </ul>
      <h3>Dealer</h3>
      <ul>
        <li>Checks for blackjack when showing an ace or a ten-value card. A dealer blackjack ends the hand straight away.</li>
        <li>Draws to 16 and stands on all 17s, soft 17 included.</li>
      </ul>
      <h3>Payouts</h3>
      <ul>
        <li>Blackjack, an ace and a ten-value card as your first two cards, pays 3 to 2.</li>
        <li>Other wins pay 1 to 1. Ties push and your bet comes back.</li>
        <li>No insurance or surrender. Six decks, reshuffled when the shoe runs low.</li>
      </ul>
    </>
  );
}
