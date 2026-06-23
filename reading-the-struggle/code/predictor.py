"""
Train multiple components to create a modular structure, 
e.g., one model predicts reading style/pattern based on gaze data, 
one model predicts cognitive load based on pupil data, etc.

Components:
  1. ReadingStylePredictor -- whatever reading style is
  2. CognitiveLoadPredictor -- blink rate, fixation/saccade features
  3. RIPAPredictor -- pupil diameter
  4. EyeTrackingSomething -- that combines all components
"""

import numpy as np
import pandas as pd
import pickle

class ReadingStylePredictor:
    """
    Predicts reading style from idk what.
    """
    # uses saccade features, fixation features => MECO

    def __init__(self, scaling_params_path="data/models/scaling_params.csv", kmeans_centers_path="data/models/kmeans_centers.csv"):
        # Scaling parameter computed from MECO training data
        self.scaling_params = pd.read_csv(scaling_params_path)
        # Cluster centers from the trained K-means model
        self.kmeans_centers = pd.read_csv(kmeans_centers_path)

        self.uniform_id = None

        # Running sums and counts for each feature accumulated across windows so that each predictin reflection the full session so far
        self.prog_sum = 0
        self.prog_count = 0
        self.reread_sum = 0
        self.reread_count = 0
        self.lookback_sum = 0
        self.lookback_count = 0
        self.refixation_sum = 0
        self.refixation_count = 0
        
    def safe_scale(self, x, mean, sd):
        # Z-score a single value using precomputed mean and sd from training data
        if sd == 0 or np.isnan(sd):
            return 0
        return (x - mean) / sd
    
    def scale_features(self, data):
        self.uniform_id = data["recording"]

        # Accumulate sums and counts across windows
        self.prog_sum += sum(data["progressive_duration"])
        self.prog_count += len(data["progressive_duration"])
        self.reread_sum += sum(data["rereading_duration"])
        self.reread_count += len(data["rereading_duration"])
        self.lookback_sum += sum(data["lookback_duration"])
        self.lookback_count += len(data["lookback_duration"])
        self.refixation_sum += sum(data["refixation_rate"])
        self.refixation_count += len(data["refixation_rate"])

        # Compute participant-level means across all windows seen so far
        prog = self.prog_sum / self.prog_count if self.prog_count > 0 else 0
        reread = self.reread_sum / self.reread_count if self.reread_count > 0 else 0
        lookback = self.lookback_sum / self.lookback_count if self.lookback_count > 0 else 0
        refixation = self.refixation_sum / self.refixation_count if self.refixation_count > 0 else 0

        # print("Unscaled:", np.array([prog, reread, lookback, refixation]))

        # Z-score duration features using MECO training data parameters
        # refixation rate is a proportion (0-1) and is not z-scored
        prog_z = self.safe_scale(prog, self.scaling_params["prog_dur_mean"][0], self.scaling_params["prog_dur_sd"][0])
        reread_z = self.safe_scale(reread, self.scaling_params["reread_dur_mean"][0], self.scaling_params["reread_dur_sd"][0])
        lookback_z = self.safe_scale(lookback, self.scaling_params["lookback_dur_mean"][0], self.scaling_params["lookback_dur_sd"][0])

        # print("Scaled:", np.array([prog_z, reread_z, lookback_z, refixation]))
        return np.array([prog_z, reread_z, lookback_z, refixation])
    
    def predict(self, feature_vector): 
        feature_array = np.array(feature_vector).flatten()

        # Assigns the reader to the nearest cluster center using Euclidean distance
        distances = []
        for _, center in self.kmeans_centers.iterrows():
            distance = np.sqrt(np.sum((feature_array - center.values) ** 2))
            distances.append(distance)
        
        # Maps the cluster index to a reading style label
        score = np.argmin(distances)

        # TODO: right?
        if score == 0: return "Careful"     # long progressive duration, frequent rereading and lookbacks
        elif score == 1: return "Risky"     # moderate durations, some rereading
        else: return "Fast"                 # short duration, little reareading or lookback

class CognitiveLoadPredictor:
    """
    Predicts cognitive load from fixation data.
    """

    def __init__(self, model_path="data/models/kmeans_cognitive_load.pkl"):
        self.kmeans_model = pickle.load(open(model_path, 'rb'))
        self.window_size = 2000 #TODO: input feature

        self.fix_window_count = 0
        self.fixation_duration_cum = 0
        self.fixation_rate_cum = 0
        self.frequency_of_regression_cum = 0

        centers = self.kmeans_model['kmeans'].cluster_centers_
        self.high_load_cluster = int(np.argmax(centers[:, 0]))

    def prepare_features(self, data):
        fixation_data = data["fixations"]

        if len(fixation_data) > 0:
            self.fix_window_count += 1
            self.fixation_duration_cum += np.mean([f["duration"] for f in fixation_data])
            self.fixation_rate_cum += len(fixation_data) / self.window_size * 1000 * 60
            self.frequency_of_regression_cum += np.mean([f["regression"] for f in fixation_data])

        mean_fixation_duration = self.fixation_duration_cum / self.fix_window_count
        mean_fixation_rate = self.fixation_rate_cum / self.fix_window_count
        mean_frequency_of_regression = self.frequency_of_regression_cum / self.fix_window_count

        return np.array([mean_fixation_duration, mean_fixation_rate]).reshape(1, -1)

    def predict(self, features):
        if np.nan in features:
            return None
        
        if self.fix_window_count <= 5:
            return "unknown"
        
        X_scaled = self.kmeans_model['scaler'].transform(features)
        cluster = self.kmeans_model['kmeans'].predict(X_scaled)[0]

        return "High" if cluster == self.high_load_cluster else "Low"


class RIPAPredictor:
    """
    Predicts cognitive load from pupil data.
    """
    # uses pupil features => reading the reader prior experiments
    # 0.0-0.5 low, 0.5-1.0 medium, 1.0-1.5 high

    # def __init__(self):
    #     self.scores_queue = []  # to store the last 90 scores for smoothing

    def predict(self, score):
        if score != None:  # Check for NaN
            try:
                if 0.0 <= score < 0.5:
                    return "Low"
                elif 0.5 <= score < 1.0:
                    return "Medium"
                else:
                    return "High"
            except Exception as e:
                print(f"Error in RIPAPredictor: {e}")
                return "unknown"
        else:
            return "unknown"

    def _smooth_scores(self, scores):
        return np.mean(scores) if scores else None

class StrugglePredictor:
    """
    Combining all components.
    Each components is trained independently.
    """

    def __init__(self):
        self.reading_style_model = ReadingStylePredictor()
        self.cognitive_load_model = CognitiveLoadPredictor()
        self.RIPA_model = RIPAPredictor()

    # make predictions using TRAINED models
    def predict(self, reading_style_features, cognitive_load_data, ripa2_scores):
        """All modeles return a single prediction??"""

        reading_style_scaled_features = self.reading_style_model.scale_features(reading_style_features)
        reading_style_prediction = self.reading_style_model.predict(reading_style_scaled_features)

        cognitive_load_features = self.cognitive_load_model.prepare_features(cognitive_load_data)
        cognitive_load_prediction = self.cognitive_load_model.predict(cognitive_load_features)

        ripa_score_smoothed = self.RIPA_model._smooth_scores(ripa2_scores)
        ripa2_prediction = self.RIPA_model.predict(ripa_score_smoothed)

        # combine predictions using some inference rules
        return reading_style_prediction, cognitive_load_prediction, ripa2_prediction

        
