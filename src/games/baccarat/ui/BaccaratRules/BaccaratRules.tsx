export function BaccaratRules() {
  return (
    <>
      <h3>Betting</h3>
      <ul>
        <li>Bet on Player, Banker or Tie, or any mix, then deal. There are no decisions after the deal.</li>
      </ul>
      <h3>Counting</h3>
      <ul>
        <li>Aces count 1, 2 to 9 count their value, and 10s and face cards count 0.</li>
        <li>Only the last digit counts: 7 + 8 = 15 counts as 5. Closer to 9 wins.</li>
      </ul>
      <h3>Drawing</h3>
      <ul>
        <li>Each side gets two cards. If either has 8 or 9, a natural, both stand.</li>
        <li>Player draws on 0 to 5 and stands on 6 or 7.</li>
        <li>If Player stood, Banker draws on 0 to 5.</li>
        <li>
          If Player drew, Banker draws on 0 to 2; on 3 unless Player&apos;s third card is worth 8; on 4 if it&apos;s
          worth 2 to 7; on 5 if it&apos;s worth 4 to 7; on 6 if it&apos;s worth 6 or 7. Banker stands on 7.
        </li>
      </ul>
      <h3>Payouts</h3>
      <ul>
        <li>Player pays 1 to 1.</li>
        <li>Banker pays 0.95 to 1, a 5% commission.</li>
        <li>Tie pays 8 to 1, and a tie pushes Player and Banker bets.</li>
        <li>Eight decks, reshuffled when the shoe runs low.</li>
      </ul>
    </>
  );
}
