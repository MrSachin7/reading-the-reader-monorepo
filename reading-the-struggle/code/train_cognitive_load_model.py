import rdata
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import pickle

# Load the MECO L2 fixation dataset (wave 2.0)
fixations_data = rdata.read_rda('data/raw/joint_l2_fixation_trimmed_report_2.0.rda')['joint.fix.l2']

# Keep only non-English trials (L2 reading data)
fixations_data = fixations_data[fixations_data['lang'] != 'en']

# Remove very short fixations (< 80ms) which are likely noise, keeping NaNs for now
fixations_data = fixations_data[(fixations_data['dur'] > 80) | (fixations_data['dur'].isna())]

# Assign fixations to 2-second windows
window_size = 2000
fixations_data['window_start'] = ((fixations_data['start'] - 1) // window_size) * window_size + 1
fixations_data['window_end'] = fixations_data['window_start'] + window_size - 1

# Aggregate fixation features per window
fixations_df = (fixations_data.groupby(['subid', 'trialnum', 'window_start', 'window_end']).agg(
    fixation_duration=('dur', 'mean'),                                      # mean fixation duration in this window (ms)
    num_fixations=('dur', 'count'),                                         # number of fixations in this window
    frequency_of_regression=('word.reg.out', 'mean'),                       # proportion of fixations with outgoing regression
    ).reset_index()).sort_values(['subid', 'trialnum', 'window_start'])

# Compute per-window fixation rate (fixations per minute) before taking cumulative mean
fixations_df['fixation_rate'] = fixations_df['num_fixations'] / window_size * 1000 * 60

# Compute cumulative means across windows
for col in ['fixation_duration', 'frequency_of_regression', 'fixation_rate']:
    fixations_df[col] = (
        fixations_df.groupby(['subid', 'trialnum'])[col]
        .expanding()
        .mean()
        .reset_index(level=[0, 1], drop=True)
    )

# Drop early windows until the cumulative mean stabilizes (5 windows = 10 seconds)
fixations_df = fixations_df.groupby(['subid', 'trialnum']).apply(
    lambda x: x.iloc[5:]
).reset_index(drop=True)

# Fill feature NaNs with 0
features = fixations_df[['fixation_duration', 'fixation_rate', 'frequency_of_regression']].fillna(0)

# KMeans clustering model
X = features.values
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# 2 clusters: low cognitive load vs high cognitive load
# High load: longer fixations, lower fixation rate, more regressions
# Low load:  shorter fixations, higher fixation rate, fewer regressions
kmeans = KMeans(n_clusters=2, random_state=42)
kmeans.fit(X_scaled)

features['cluster'] = kmeans.labels_
print(features.groupby('cluster').mean())

# Save model in a pickle file
with open('data/models/kmeans_cognitive_load.pkl', 'wb') as f:
    pickle.dump({'kmeans': kmeans, 'scaler': scaler}, f)
