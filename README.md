[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Yahous/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Yahous/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Radar

A token launch radar: the protocols in DefiLlama's snapshot that record no token, ranked by an
implied token value, each with a concrete farm plan — plus the live-token protocols set aside with
their market caps, so the market's own values are never mixed into the model's.

## The model (radar-2)

One function scores every protocol, from the snapshot's own figures only:

```
implied = round( tvl_usd x 0.22
  x (1 + 0.5 x sign(growth) x sqrt(|growth| / 100))
  x (0.6 + min(age_days, 1460) / 1460 x 0.4)
  x category )
```

- **growth** is the seven-day TVL change, clamped to −80% … +300%; a missing change counts as 0.
  Its square root keeps one wild week from swamping years of size.
- **age_days** is the days from `listed_at` to the snapshot's `as_of`; an unknown age counts as 365
  days. A protocol that has run for years with no token has had longer to build the habit of
  rewarding its users.
- **category** is 0.85 for a wrapped, staked or bridged product, 1.0 otherwise: the value of such a
  product mostly belongs to the token that already trades.

No protocol name is special-cased. The board covers all 40 watchlist protocols plus the 160
strongest rankable pre-token protocols below the $50M floor — 200 rows. The dashboard's sandbox
lets you move the three constants and re-scores the board live; the shipped board always uses the
constants above. Implied value is a model, not a promise, and never a prediction that a token will
launch.

## The dashboard

`dashboard/` is a static page with no network: a sortable, filterable board (search, category,
chain, pre-token vs live-token), a detail view for each protocol with the model's inputs and its
farm plan, and the model panel with its sandbox. Farm plans are generated from each protocol's
own category, chains, TVL and age — concrete steps with costs and times, not slogans.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

Node 22 or later, standard library only. It writes `board.json`, `data.js`, `dashboard/`,
`screenshots/` and `dossier.json` into the output directory; both runs write identical bytes.

Built by an AI agent for make.fun's [token-radar-01](https://make.fun/bounty/token-radar-01)
bounty, $1,325 in USDC.
