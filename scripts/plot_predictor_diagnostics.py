#!/usr/bin/env python3
"""
Evaluate the cutoff data the way you'd evaluate any model: predicted vs actual, residuals,
error distribution, prediction bounds, and calibration of the Safe/Good/Reach/Tough call.

    python3 scripts/plot_predictor_diagnostics.py     # -> dist-db/plots/diag_*.png + a PDF

PREDICTED = the closing rank we serve for a (college, year, round, course, category, quota).
ACTUAL    = the worst All India Rank actually allotted in that same group, from the 222k real
            MCC allotment rows. If our cutoff is right, the last person admitted should sit at it.

ONE THING TO READ CAREFULLY. Rows whose `source` starts with "derived: " were themselves computed
as max(allIndiaRank) over these very allotments, so they are equal to ACTUAL *by construction* and
carry no evidence at all. They are drawn separately and excluded from every error statistic —
mixing them in would manufacture a near-perfect R² that means nothing. Only the PUBLISHED rows
constitute a genuine test.
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
from matplotlib.backends.backend_pdf import PdfPages

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, 'dist-db', 'plots')

PUB, DER = '#2a78d6', '#eda100'          # published (the real test) vs derived (circular)
GOOD, WARN, BAD = '#1baf7a', '#eda100', '#e34948'

MONGO_JS = r'''
const QMAP={Government:"All India Quota (AIQ)",Deemed:"Deemed Quota"};
const actual = db.allotments.aggregate([
  {$match:{collegeId:{$nin:[null,""]}, category:{$in:["General","OBC","SC","ST","EWS"]},
           seatType:{$in:["Government","Deemed"]}, allIndiaRank:{$gt:0}}},
  {$group:{_id:{c:"$collegeId", y:{$toInt:{$substr:["$counselling",7,4]}}, r:"$round",
                co:"$course", cat:"$category", st:"$seatType"},
           actual:{$max:"$allIndiaRank"}, n:{$sum:1}}}
],{allowDiskUse:true}).toArray();
const pred={};
db.closingRanks.find({},{collegeId:1,year:1,round:1,course:1,category:1,quota:1,closingRank:1,source:1}).forEach(r=>{
  pred[[r.collegeId,r.year,r.round,r.course,r.category,r.quota].join("|")]={v:r.closingRank,s:r.source||""};
});
const out=[];
actual.forEach(a=>{
  const k=[a._id.c,a._id.y,a._id.r,a._id.co,a._id.cat,QMAP[a._id.st]].join("|");
  const p=pred[k];
  if(p) out.push({predicted:p.v, actual:a.actual, n:a.n, year:a._id.y, round:a._id.r,
                  course:a._id.co, category:a._id.cat, seatType:a._id.st,
                  derived: p.s.indexOf("derived")===0});
});
print(JSON.stringify(out));
'''


def load():
    uri = next(l for l in open(os.path.join(REPO, '.env')) if l.startswith('MONGODB_URI=')).split('=', 1)[1].strip()
    out = subprocess.run(['mongosh', uri, '--quiet', '--eval', MONGO_JS],
                         capture_output=True, text=True, check=True).stdout
    df = pd.DataFrame(json.loads(out))
    # Work in log space: ranks span five orders of magnitude, so an absolute residual is dominated
    # entirely by the big numbers and says nothing about the top of the table.
    df['log_err'] = np.log10(df.actual) - np.log10(df.predicted)
    df['ratio'] = df.actual / df.predicted
    return df


def style():
    sns.set_theme(style='whitegrid', context='notebook')
    plt.rcParams.update({'figure.dpi': 130, 'savefig.dpi': 130, 'axes.titleweight': 'semibold',
                         'axes.titlesize': 12, 'axes.labelsize': 10, 'grid.alpha': .35,
                         'axes.edgecolor': '#c8ccd0', 'font.family': 'sans-serif'})


def fmt(x, _):
    return f'{x/1e5:.0f}L' if x >= 1e5 else (f'{x/1e3:.0f}k' if x >= 1e3 else f'{x:.0f}')


def p_pred_vs_actual(df):
    """The core diagnostic. Perfect prediction lies on y=x; the 2x band is the tolerance."""
    fig, ax = plt.subplots(figsize=(7.6, 6.6))
    lim = (1, max(df.predicted.max(), df.actual.max()) * 1.4)
    xs = np.array(lim)
    ax.plot(xs, xs, color='#4d565e', lw=1.4, zorder=1, label='perfect (y = x)')
    ax.fill_between(xs, xs * 0.5, xs * 2, color='#4d565e', alpha=.08, zorder=0,
                    label='within 2x')

    d = df[df.derived]
    p = df[~df.derived]
    ax.scatter(d.predicted, d.actual, s=9, alpha=.35, color=DER, linewidth=0,
               label=f'derived (circular, n={len(d):,})')
    ax.scatter(p.predicted, p.actual, s=11, alpha=.55, color=PUB, linewidth=0,
               label=f'published (the real test, n={len(p):,})')

    ax.set(xscale='log', yscale='log', xlim=lim, ylim=lim)
    ax.xaxis.set_major_formatter(mticker.FuncFormatter(fmt))
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(fmt))
    ax.set_xlabel('PREDICTED closing rank (what we serve)')
    ax.set_ylabel('ACTUAL worst rank allotted (from 222k MCC rows)')
    ax.set_title('Predicted vs actual cutoff')
    within = (p.ratio.between(0.5, 2)).mean() * 100
    ax.annotate(f'{within:.0f}% of published rows fall inside the 2x band',
                xy=(.03, .96), xycoords='axes fraction', fontsize=9, color='#4d565e', va='top')
    ax.legend(frameon=False, loc='lower right', fontsize=8.5)
    fig.tight_layout()
    fig.savefig(f'{OUT}/diag_1_pred_vs_actual.png')
    return fig


def p_residuals(df):
    p = df[~df.derived]
    fig, ax = plt.subplots(figsize=(9, 4.8))
    sc = ax.scatter(p.predicted, p.log_err, s=11, alpha=.5, c=p.year, cmap='viridis', linewidth=0)
    ax.axhline(0, color='#4d565e', lw=1.3)
    for mult, ls in [(2, '--'), (0.5, '--')]:
        ax.axhline(np.log10(mult), color='#adb5bb', lw=1, ls=ls)
    ax.set_xscale('log')
    ax.xaxis.set_major_formatter(mticker.FuncFormatter(fmt))
    ax.set_yticks([-2, -1, np.log10(.5), 0, np.log10(2), 1, 2])
    ax.set_yticklabels(['0.01x', '0.1x', '0.5x', '1x', '2x', '10x', '100x'])
    ax.set_xlabel('PREDICTED closing rank')
    ax.set_ylabel('actual ÷ predicted')
    ax.set_title('Residuals — is the error structured, or just noise?')
    ax.annotate('above 1x = the real cutoff was WORSE than we say\n(we are flattering the student)',
                xy=(.02, .93), xycoords='axes fraction', fontsize=8.5, color='#79838c', va='top')
    fig.colorbar(sc, ax=ax, label='exam year', pad=.01)
    fig.tight_layout()
    fig.savefig(f'{OUT}/diag_2_residuals.png')
    return fig


def p_error_dist(df):
    p = df[~df.derived]
    fig, (a1, a2) = plt.subplots(1, 2, figsize=(10.5, 4.3))

    sns.histplot(p.log_err, bins=60, ax=a1, color=PUB, edgecolor='none', stat='percent')
    a1.axvline(0, color='#4d565e', lw=1.3)
    a1.axvline(p.log_err.median(), color=BAD, lw=1.4, ls='--',
               label=f'median {10**p.log_err.median():.2f}x')
    a1.set_xticks([-2, -1, 0, 1, 2])
    a1.set_xticklabels(['0.01x', '0.1x', '1x', '10x', '100x'])
    a1.set_xlabel('actual ÷ predicted')
    a1.set_ylabel('% of observations')
    a1.set_title('Error distribution')
    a1.legend(frameon=False, fontsize=9)

    order = ['General', 'OBC', 'EWS', 'SC', 'ST']
    sns.boxplot(data=p, x='category', y='log_err', order=order, ax=a2, color=PUB,
                fliersize=1.5, linewidth=1, width=.6)
    a2.axhline(0, color='#4d565e', lw=1.2)
    a2.set_yticks([-1, 0, 1])
    a2.set_yticklabels(['0.1x', '1x', '10x'])
    a2.set_xlabel('')
    a2.set_ylabel('actual ÷ predicted')
    a2.set_title('Does the error depend on category?')
    fig.tight_layout()
    fig.savefig(f'{OUT}/diag_3_error_distribution.png')
    return fig


def p_bounds(df):
    """The upper-bound view: given a predicted cutoff, how bad can the real one plausibly be?"""
    p = df[~df.derived].copy()
    p['bin'] = pd.cut(np.log10(p.predicted), bins=14)
    g = p.groupby('bin', observed=True).agg(
        x=('predicted', 'median'),
        lo=('actual', lambda s: s.quantile(.10)),
        mid=('actual', 'median'),
        hi=('actual', lambda s: s.quantile(.90)),
        n=('actual', 'size')).dropna()
    g = g[g.n >= 15]

    fig, ax = plt.subplots(figsize=(9, 5.4))
    ax.scatter(p.predicted, p.actual, s=8, alpha=.25, color='#9fb4c9', linewidth=0,
               label='observations')
    ax.fill_between(g.x, g.lo, g.hi, color=PUB, alpha=.18, label='p10–p90 of actual')
    ax.plot(g.x, g.hi, color=BAD, lw=2, label='p90 — the realistic upper bound')
    ax.plot(g.x, g.mid, color=PUB, lw=2, label='median actual')
    xs = np.array([p.predicted.min(), p.predicted.max()])
    ax.plot(xs, xs, color='#4d565e', lw=1.2, ls='--', label='y = x')
    ax.set(xscale='log', yscale='log')
    ax.xaxis.set_major_formatter(mticker.FuncFormatter(fmt))
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(fmt))
    ax.set_xlabel('PREDICTED closing rank')
    ax.set_ylabel('ACTUAL worst rank allotted')
    ax.set_title('Prediction bounds — plan against the p90, not the median')
    ax.legend(frameon=False, fontsize=8.5, loc='upper left')
    fig.tight_layout()
    fig.savefig(f'{OUT}/diag_4_bounds.png')
    return fig


def p_calibration(df):
    """Does a 'Safe' call actually come true? chanceOf() thresholds, checked against reality."""
    p = df[~df.derived].copy()

    def band(ratio):                      # mirrors chanceOf() in services/predictor.ts
        if ratio >= 2:   return 'Safe'
        if ratio >= 1.2: return 'Good'
        if ratio >= .95: return 'Reach'
        return 'Tough'

    # Treat the PREDICTED cutoff as the student's rank proxy: a college is "Safe" for someone
    # sitting exactly at the predicted cutoff if the ACTUAL cutoff turned out to be ≥2x worse.
    p['band'] = p.ratio.apply(band)
    order = ['Safe', 'Good', 'Reach', 'Tough']
    counts = p.band.value_counts().reindex(order).fillna(0)
    share = counts / counts.sum() * 100

    fig, (a1, a2) = plt.subplots(1, 2, figsize=(10.5, 4.3),
                                 gridspec_kw={'width_ratios': [1, 1.25]})
    cols = [GOOD, '#7cc6a5', WARN, BAD]
    a1.bar(order, share.values, color=cols, width=.62)
    for i, v in enumerate(share.values):
        a1.text(i, v + 1, f'{v:.0f}%', ha='center', fontsize=9, color='#4d565e')
    a1.set_ylabel('% of published observations')
    a1.set_title('Where the real cutoff landed\nrelative to ours')
    a1.set_ylim(0, max(share.values) * 1.22)

    piv = (p.pivot_table(index='year', columns='band', values='ratio', aggfunc='size')
             .reindex(columns=order).fillna(0))
    piv = piv.div(piv.sum(axis=1), axis=0) * 100
    piv.plot(kind='barh', stacked=True, ax=a2, color=cols, width=.72, legend=True)
    a2.set_xlabel('% of observations')
    a2.set_ylabel('')
    a2.set_title('Calibration drift by exam year')
    a2.legend(frameon=False, fontsize=8.5, ncols=4, loc='lower center',
              bbox_to_anchor=(.5, -.32))
    fig.tight_layout()
    fig.savefig(f'{OUT}/diag_5_calibration.png')
    return fig


def main():
    os.makedirs(OUT, exist_ok=True)
    style()
    df = load()
    p = df[~df.derived]

    print(f'  paired observations : {len(df):,}   published {len(p):,} / derived {len(df)-len(p):,}')
    print(f'  median actual/pred  : {p.ratio.median():.2f}x')
    print(f'  within 2x           : {p.ratio.between(.5,2).mean()*100:.1f}%')
    print(f'  within 10x          : {p.ratio.between(.1,10).mean()*100:.1f}%')
    print(f'  we UNDERSTATE (actual worse) : {(p.ratio>1).mean()*100:.1f}%')
    print(f'  Spearman rho (log)  : {p.predicted.corr(p.actual, method="spearman"):.3f}')

    figs = [p_pred_vs_actual(df), p_residuals(df), p_error_dist(df), p_bounds(df), p_calibration(df)]
    pdf_path = f'{OUT}/predictor-diagnostics.pdf'
    with PdfPages(pdf_path) as pdf:
        for f in figs:
            pdf.savefig(f, bbox_inches='tight')
        pdf.infodict()['Title'] = 'MedCounsel — cutoff data diagnostics'
    for f in figs:
        plt.close(f)
    print(f'\n  wrote {len(figs)} plots + {pdf_path}')


if __name__ == '__main__':
    main()
