# Context-preservation displacement — summary

Generated 2026-06-29T12:18:42.191Z · viewport 1440x900 · 66 trials across 6 pages · baseline line box 32.4 px

## Overall
- Uncompensated displacement (no preservation): median 32.4 px (1 lines), p95 91 px, max 153.2 px
- Residual error (with preservation): median 31.39 px, p95 79.16 px, max 93.73 px
- Outcome: 61 preserved / 5 degraded / 0 failed (92% preserved)
- Reading position retained on screen after restore: 66/66 (100%)

## Per intervention
| Intervention | n | Disp. median (px) | Disp. p95 (px) | Disp. median (lines) | Residual median (px) | Residual p95 (px) | Preserved |
|---|--:|--:|--:|--:|--:|--:|--:|
| Font size +2px (18->20) | 6 | 13.3 | 49.7 | 0.41 | 9.73 | 13.34 | 6/6 |
| Font size +6px (18->24) | 6 | 88.4 | 145.1 | 2.73 | 0.22 | 1.85 | 6/6 |
| Font size -2px (18->16) | 6 | 79.2 | 81.9 | 2.44 | 79.16 | 81.85 | 2/6 |
| Line height +0.3 (1.8->2.1) | 6 | 2.7 | 35.3 | 0.08 | 2.36 | 26.65 | 6/6 |
| Line height -0.3 (1.8->1.5) | 6 | 61.3 | 87 | 1.89 | 61.34 | 86.98 | 5/6 |
| Line width -120px (680->560) | 6 | 16.2 | 32.4 | 0.5 | 0.2 | 32.39 | 6/6 |
| Line width +80px (680->760) | 6 | 64.8 | 64.8 | 2 | 64.78 | 64.78 | 6/6 |
| Letter spacing +0.06em | 6 | 32.4 | 32.4 | 1 | 32.39 | 32.39 | 6/6 |
| Letter spacing +0.12em | 6 | 32.4 | 56.7 | 1 | 0.39 | 32.39 | 6/6 |
| Font family -> Inter | 6 | 31.4 | 55.7 | 0.97 | 31.39 | 55.68 | 6/6 |
| Font family -> Space Grotesk | 6 | 32.4 | 56.7 | 1 | 32.39 | 56.68 | 6/6 |
