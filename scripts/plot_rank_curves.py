#!/usr/bin/env python3
"""
Look at the marks-to-rank curves the way you'd look at any dataset before trusting it.

    python3 scripts/plot_rank_curves.py            # -> dist-db/plots/*.png

Reads `rankBands` straight from the DB (the rows the predictor actually uses), reconstructs each
year's curve with the SAME linear-interpolation-within-band the server does, and draws four views:

  1_curves_overlay      all years, log rank — the headline
  2_facet_by_year       one panel per year, shared scales, so shapes are comparable
  3_divergence          each year as a multiple of 2026 — how wrong the wrong curve is
  4_band_structure      the raw bands as spans, showing where each curve is anchored vs interpolated

The log axis is not decoration: rank spans 1 to 2,000,000, so on a linear axis every curve's top
— the part that decides which college a strong candidate gets — collapses onto the baseline.
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

# Same hues as the web view, so the two tell one story.
PALETTE = {2023: '#2a78d6', 2024: '#eb6834', 2025: '#1baf7a', 2026: '#eda100'}


def load_bands():
    """rankBands straight from Mongo — the rows the predictor reads, not a stale export."""
    uri = next(l for l in open(os.path.join(REPO, '.env')) if l.startswith('MONGODB_URI=')).split('=', 1)[1].strip()
    out = subprocess.run(
        ['mongosh', uri, '--quiet', '--eval',
         'print(JSON.stringify(db.rankBands.find({},{_id:0,year:1,marksMin:1,marksMax:1,rankMin:1,rankMax:1}).toArray()))'],
        capture_output=True, text=True, check=True).stdout
    return pd.DataFrame(json.loads(out))


def air(bands_for_year, marks):
    """The server's interpolation: rankMin sits at marksMax, rankMax at marksMin."""
    for b in bands_for_year.itertuples():
        if b.marksMin <= marks <= b.marksMax:
            span = b.marksMax - b.marksMin
            if span == 0:
                return b.rankMin
            frac = (b.marksMax - marks) / span
            return b.rankMin + frac * (b.rankMax - b.rankMin)
    return np.nan


def curve_frame(bands, lo=200, hi=720, step=2):
    rows = []
    for year in sorted(bands.year.unique()):
        by = bands[bands.year == year]
        for m in range(lo, hi + 1, step):
            r = air(by, m)
            if not np.isnan(r):
                rows.append({'year': year, 'marks': m, 'rank': r})
    return pd.DataFrame(rows)


def style():
    sns.set_theme(style='whitegrid', context='notebook')
    plt.rcParams.update({
        'figure.dpi': 130,
        'savefig.dpi': 130,
        'font.family': 'sans-serif',
        'axes.titlesize': 12,
        'axes.titleweight': 'semibold',
        'axes.labelsize': 10,
        'grid.alpha': 0.35,
        'axes.edgecolor': '#c8ccd0',
    })


def lakh(x, _):
    if x >= 1e5:
        return f'{x/1e5:.0f}L'
    if x >= 1e3:
        return f'{x/1e3:.0f}k'
    return f'{x:.0f}'


def plot_overlay(df):
    fig, ax = plt.subplots(figsize=(9, 5.4))
    for year, g in df.groupby('year'):
        ax.plot(g.marks, g['rank'], lw=2.2, color=PALETTE[year], label=str(year))
    ax.set_yscale('log')
    ax.invert_yaxis()                       # rank 1 at the top: better is up
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lakh))
    ax.set_xlabel('NEET score (out of 720)')
    ax.set_ylabel('All India Rank  (log scale, better is up)')
    ax.set_title('The same score maps to a wildly different rank each year')

    ax.axvline(650, color='#79838c', ls='--', lw=1, alpha=.7)
    for year, g in df.groupby('year'):
        hit = g[g.marks == 650]
        if len(hit):
            r = hit['rank'].iloc[0]
            ax.scatter([650], [r], s=42, color=PALETTE[year], zorder=5,
                       edgecolor='white', linewidth=1.4)
            ax.annotate(f'{int(r):,}', (650, r), textcoords='offset points', xytext=(9, 0),
                        fontsize=8.5, color=PALETTE[year], fontweight='bold', va='center')
    ax.annotate('650 marks', (650, ax.get_ylim()[0]), textcoords='offset points',
                xytext=(6, 14), fontsize=8.5, color='#79838c')
    # Upper left is the only empty quadrant: every curve sweeps from bottom-left to top-right,
    # so a lower-left legend sits on top of the 2023/2026 lines.
    ax.legend(title='Exam year', frameon=False, loc='upper left')
    fig.tight_layout()
    fig.savefig(f'{OUT}/1_curves_overlay.png')
    return fig


def plot_facets(df):
    g = sns.FacetGrid(df, col='year', col_wrap=2, height=2.9, aspect=1.5, sharey=True, sharex=True)
    g.map_dataframe(lambda data, **kw: plt.plot(data.marks, data['rank'], lw=2.1,
                                                color=PALETTE[data.year.iloc[0]]))
    for ax, year in zip(g.axes.flat, sorted(df.year.unique())):
        ax.set_yscale('log')
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lakh))
        ax.axvline(650, color='#adb5bb', ls='--', lw=.9)
        sub = df[(df.year == year) & (df.marks == 650)]
        if len(sub):
            ax.scatter([650], [sub['rank'].iloc[0]], s=34, color=PALETTE[year],
                       zorder=5, edgecolor='white', linewidth=1.2)
    # Invert ONCE. The axes are shared, so a per-axis invert_yaxis() in the loop above fires four
    # times on the same shared axis — an even number, which cancels out and silently leaves the
    # facets running opposite to the overlay chart.
    g.axes.flat[0].invert_yaxis()
    g.set_axis_labels('NEET score', 'All India Rank (log, better is up)')
    g.set_titles('{col_name}')
    g.figure.suptitle('Shared axes — the shapes are directly comparable', y=1.02, fontsize=12,
                      fontweight='semibold')
    g.figure.savefig(f'{OUT}/2_facet_by_year.png', bbox_inches='tight')
    return g.figure


def plot_divergence(df):
    """Each year as a multiple of 2026 — i.e. the error you'd make using that year's curve."""
    wide = df.pivot(index='marks', columns='year', values='rank').dropna()
    if 2026 not in wide.columns:
        return None
    ratio = wide.div(wide[2026], axis=0).drop(columns=[2026])

    fig, ax = plt.subplots(figsize=(9, 4.6))
    for year in ratio.columns:
        ax.plot(ratio.index, ratio[year], lw=2.2, color=PALETTE[year], label=str(year))
    ax.axhline(1, color='#4d565e', lw=1.2)
    ax.set_yscale('log')
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda v, _: f'{v:g}x'))
    ax.set_xlabel('NEET score')
    ax.set_ylabel("rank ÷ the 2026 rank  (log)")
    ax.set_title('How wrong the wrong curve is, for a 2026 candidate')
    ax.annotate('below the line = flatters the student\n(tells them they rank better than they do)',
                xy=(210, 0.05), fontsize=8.5, color='#79838c')
    ax.legend(title='curve used', frameon=False)
    fig.tight_layout()
    fig.savefig(f'{OUT}/3_divergence.png')
    return fig


def plot_band_structure(bands):
    """Where each curve is genuinely anchored: every band edge is a real published data point."""
    fig, ax = plt.subplots(figsize=(9, 4.2))
    years = sorted(bands.year.unique())
    for i, year in enumerate(years):
        by = bands[bands.year == year].sort_values('marksMin')
        for b in by.itertuples():
            ax.plot([b.marksMin, b.marksMax], [i, i], lw=7, solid_capstyle='butt',
                    color=PALETTE[year], alpha=.85)
            ax.plot([b.marksMin, b.marksMax], [i, i], lw=7, solid_capstyle='butt',
                    color='white', alpha=0, zorder=3)
        edges = sorted(set(by.marksMin) | set(by.marksMax))
        ax.scatter(edges, [i] * len(edges), s=14, color='white',
                   edgecolor=PALETTE[year], linewidth=1.3, zorder=4)
        ax.text(724, i, f'{len(by)} bands', va='center', fontsize=8.5, color='#4d565e')
    ax.set_yticks(range(len(years)))
    ax.set_yticklabels(years)
    ax.set_xlabel('NEET score')
    ax.set_title('Band structure — each dot is an anchor; between them the curve is interpolated')
    ax.grid(axis='y', visible=False)
    ax.set_xlim(195, 760)
    fig.tight_layout()
    fig.savefig(f'{OUT}/4_band_structure.png')
    return fig


def write_pdf(figs, path):
    """One multi-page PDF, vector throughout — it stays sharp at any zoom, unlike stitched PNGs."""
    from matplotlib.backends.backend_pdf import PdfPages
    with PdfPages(path) as pdf:
        for fig in figs:
            pdf.savefig(fig, bbox_inches='tight')
        meta = pdf.infodict()
        meta['Title'] = 'NEET marks-to-rank curves, 2023-2026'
        meta['Subject'] = ('Why the predictor was 20x too optimistic for 2026 candidates: '
                           'each exam year maps the same score to a very different rank.')
        meta['Author'] = 'MedCounsel'


def main():
    os.makedirs(OUT, exist_ok=True)
    style()
    bands = load_bands()
    df = curve_frame(bands)

    print(f'  bands: {len(bands)} rows, years {sorted(bands.year.unique())}')
    print(f'  curve points: {len(df)}')
    print('\n  AIR at selected scores')
    piv = df[df.marks.isin([680, 650, 600, 550, 500, 450, 400])] \
        .pivot(index='marks', columns='year', values='rank').round().astype('Int64')
    print(piv.to_string())

    figs = [plot_overlay(df), plot_facets(df), plot_divergence(df), plot_band_structure(bands)]
    figs = [f for f in figs if f is not None]

    pdf_path = f'{OUT}/neet-rank-curves.pdf'
    write_pdf(figs, pdf_path)
    for f in figs:
        plt.close(f)

    print(f'\n  wrote {len(figs)} plots -> {OUT}')
    print(f'  wrote PDF ({len(figs)} pages) -> {pdf_path}')


if __name__ == '__main__':
    main()
