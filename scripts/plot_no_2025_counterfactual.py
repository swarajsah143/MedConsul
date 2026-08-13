#!/usr/bin/env python3
"""
Counterfactual: what would the predictor have told a 2026 candidate WITHOUT 2025 in the picture?

    python3 scripts/plot_no_2025_counterfactual.py    # -> dist-db/plots/cf_*.png

Three curve choices, one candidate:
  correct        — the 2026 curve, what we serve now
  the bug        — the 2025 curve, what we served until 13 Aug
  counterfactual — the 2024 curve, what loadBands() would have picked had 2025 never been loaded
                   (it takes the newest available year)

The point of the exercise: 2025 was the anomaly that caused the bug, so it is tempting to conclude
that leaving it out would have been safer. It would not. Removing it does not remove the error, it
flips its SIGN — and flips it to a larger magnitude.
"""
import json
import os
import subprocess

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
import pandas as pd
import seaborn as sns

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, 'dist-db', 'plots')
C = {2024: '#eb6834', 2025: '#1baf7a', 2026: '#eda100'}
BAD, GOOD = '#e34948', '#4d565e'


def load_bands():
    uri = next(l for l in open(os.path.join(REPO, '.env')) if l.startswith('MONGODB_URI=')).split('=', 1)[1].strip()
    out = subprocess.run(['mongosh', uri, '--quiet', '--eval',
        'print(JSON.stringify(db.rankBands.find({},{_id:0,year:1,marksMin:1,marksMax:1,rankMin:1,rankMax:1}).toArray()))'],
        capture_output=True, text=True, check=True).stdout
    return pd.DataFrame(json.loads(out))


def air(by, m):
    for b in by.itertuples():
        if b.marksMin <= m <= b.marksMax:
            sp = b.marksMax - b.marksMin
            return b.rankMin if sp == 0 else b.rankMin + (b.marksMax - m) / sp * (b.rankMax - b.rankMin)
    return np.nan


def fmt(x, _):
    return f'{x/1e5:.0f}L' if x >= 1e5 else (f'{x/1e3:.0f}k' if x >= 1e3 else f'{x:.0f}')


def main():
    os.makedirs(OUT, exist_ok=True)
    sns.set_theme(style='whitegrid', context='notebook')
    plt.rcParams.update({'figure.dpi': 130, 'savefig.dpi': 130, 'axes.titleweight': 'semibold',
                         'axes.titlesize': 12, 'axes.labelsize': 10, 'grid.alpha': .35,
                         'axes.edgecolor': '#c8ccd0', 'font.family': 'sans-serif'})

    bands = load_bands()
    marks = np.arange(300, 716, 2)
    df = pd.DataFrame({'marks': marks})
    for y in (2024, 2025, 2026):
        by = bands[bands.year == y]
        df[y] = [air(by, m) for m in marks]
    df = df.dropna()

    # ── the three curves ──────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(9, 5.4))
    labels = {2026: 'correct — 2026 curve (served now)',
              2025: 'the bug — 2025 curve (served until 13 Aug)',
              2024: 'counterfactual — 2024 curve (if 2025 never existed)'}
    for y in (2026, 2025, 2024):
        ax.plot(df.marks, df[y], lw=2.2, color=C[y], label=labels[y])
    ax.set(xscale='linear', yscale='log')
    ax.invert_yaxis()
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(fmt))
    ax.set_xlabel('NEET score')
    ax.set_ylabel('All India Rank shown to the student (log, better is up)')
    ax.set_title('One 2026 candidate, three curve choices')
    ax.legend(frameon=False, fontsize=9, loc='upper left')
    fig.tight_layout()
    fig.savefig(f'{OUT}/cf_1_three_curves.png')
    plt.close(fig)

    # ── the error, signed ─────────────────────────────────────────────
    err = pd.DataFrame({'marks': df.marks,
                        'the bug (2025 curve)': df[2025] / df[2026],
                        'counterfactual (2024 curve)': df[2024] / df[2026]})
    fig, ax = plt.subplots(figsize=(9, 5))
    ax.plot(err.marks, err['the bug (2025 curve)'], lw=2.4, color=C[2025], label='the bug — 2025 curve')
    ax.plot(err.marks, err['counterfactual (2024 curve)'], lw=2.4, color=C[2024],
            label='counterfactual — 2024 curve')
    ax.axhline(1, color=GOOD, lw=1.4)
    ax.set_yscale('log')
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f'{v:g}x'))
    ax.set_xlabel('NEET score')
    ax.set_ylabel('rank shown ÷ true 2026 rank')

    # Shade by HARM, not by direction. Optimistic is the dangerous half — a student who over-reaches
    # can finish counselling with no seat, where one who under-reaches merely leaves a better college
    # unclaimed. Tinting optimistic green because "below the line looks fine" inverts the meaning.
    top = err.max(numeric_only=True).max() * 1.6
    bot = err[['the bug (2025 curve)', 'counterfactual (2024 curve)']].min().min() * .6
    ax.axhspan(1, top, color='#eda100', alpha=.06)
    ax.axhspan(bot, 1, color=BAD, alpha=.07)
    ax.annotate('TOO PESSIMISTIC — student under-reaches,\nleaves a better college on the table',
                xy=(303, 60), fontsize=8.5, color='#9a6b00')
    ax.annotate('TOO OPTIMISTIC — student over-reaches,\nand can finish with no seat at all',
                xy=(303, .004), fontsize=8.5, color=BAD)
    ax.set_title('Dropping 2025 does not remove the error — it flips its sign, and enlarges it')
    # Lower right is the only region neither curve crosses.
    ax.legend(frameon=False, fontsize=9, loc='lower right')
    fig.tight_layout()
    fig.savefig(f'{OUT}/cf_2_signed_error.png')
    plt.close(fig)

    # ── the table ─────────────────────────────────────────────────────
    key = [680, 650, 600, 550, 500, 450, 400]
    t = df[df.marks.isin(key)].copy()
    t['bug x'] = (t[2025] / t[2026]).round(2)
    t['counterfactual x'] = (t[2024] / t[2026]).round(2)
    print('  What a 2026 candidate would be told\n')
    # Round the RANKS to integers without touching the ratio columns — a blanket .round(0) here
    # collapsed every ratio to 1.0 / 0.0 and hid the whole finding.
    show = t.rename(columns={2026: 'correct', 2025: 'bug (2025)', 2024: 'counterfactual (2024)'})
    for c in ('correct', 'bug (2025)', 'counterfactual (2024)'):
        show[c] = show[c].round().astype(int).map('{:,}'.format)
    for c in ('bug x', 'counterfactual x'):
        show[c] = show[c].map('{:.2f}x'.format)
    print(show[['marks', 'correct', 'bug (2025)', 'bug x',
                'counterfactual (2024)', 'counterfactual x']].to_string(index=False))
    print(f'\n  wrote 2 plots -> {OUT}')


if __name__ == '__main__':
    main()
