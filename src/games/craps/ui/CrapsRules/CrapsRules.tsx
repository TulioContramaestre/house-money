export function CrapsRules() {
  return (
    <>
      <h3>Come-out roll</h3>
      <ul>
        <li>Bet the pass line or don&apos;t pass, then roll.</li>
        <li>Pass wins on 7 or 11 and loses on 2, 3 or 12.</li>
        <li>Don&apos;t pass wins on 2 or 3, pushes on 12 and loses on 7 or 11.</li>
        <li>Any other number (4, 5, 6, 8, 9, 10) becomes the point.</li>
      </ul>
      <h3>The point</h3>
      <ul>
        <li>Pass wins if the point comes again before a 7. Don&apos;t pass wins if a 7 comes first.</li>
        <li>
          Line bets only go down on the come-out roll. Once a point is set they stay up until it&apos;s decided, and you
          can&apos;t switch tables until then.
        </li>
      </ul>
      <h3>Odds</h3>
      <ul>
        <li>Once a point is set, back your pass line with odds: up to 3× on 4 or 10, 4× on 5 or 9 and 5× on 6 or 8.</li>
        <li>Odds pay true odds: 2 to 1 on 4 or 10, 3 to 2 on 5 or 9 and 6 to 5 on 6 or 8.</li>
        <li>They lose on a 7 and can come down between rolls.</li>
      </ul>
      <h3>One-roll bets</h3>
      <ul>
        <li>Field wins on 2, 3, 4, 9, 10, 11 or 12 and pays 1 to 1, with 2 paying double and 12 triple.</li>
        <li>Any 7 pays 4 to 1.</li>
        <li>Any craps (2, 3 or 12) pays 7 to 1.</li>
      </ul>
    </>
  );
}
