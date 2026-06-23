from preprocessor import EyeTracker
from predictor import StrugglePredictor

import pandas as pd
import json

online_mode = False # Set to True for real-time processing, False for batch processing
save_files = True # Set to True to make predictions using the trained models
file_path = "data/raw/experiment-processed-keerthi.json" # Path to the raw data file

PREDICTION_INTERVAL_SAMPLES = 180
PREDUCTION_INTERVAL_SECONDS = PREDICTION_INTERVAL_SAMPLES / 90

def main():
    tracker = EyeTracker(online_mode=online_mode)
    predictor = StrugglePredictor()

    events = []
    num_samples = 0
    prev_ripa2_pred = None
    prev_cognitive_load_pred = None
    prev_reading_style_pred = None
    start_time = None

    if online_mode == False:
        file = json.load(open(file_path))
        tracker.parse_text(file["experiment"]["run"]["sourceExperimentSetupId"], file["experiment"]["run"]["materials"])
        gaze_data = tracker.json_to_csv(file)

    # if online_mode == True:
        # load data from sdk
        # convert json to csv

    for _, row in gaze_data.iterrows():

        tracker.delay_event(_, row.to_dict())

        num_samples += 1

        if start_time == None:
            start_time = row['time_stamps']

        if online_mode == False and num_samples == PREDICTION_INTERVAL_SAMPLES:
            cognitive_load_data = tracker.submit_data_cognitive_load(row["time_stamps"], window_seconds=PREDUCTION_INTERVAL_SECONDS)
            ripa_score_data = tracker.submit_data_ripa2_score(row["time_stamps"], window_seconds=PREDUCTION_INTERVAL_SECONDS)
            reading_style_data = tracker.submit_data_reading_style(row["time_stamps"], window_seconds=PREDUCTION_INTERVAL_SECONDS)

            prediction = predictor.predict(reading_style_data, cognitive_load_data, ripa_score_data)

            time_now_min = int((row["time_stamps"] - start_time) / 1000 / 60)

            if prediction[0] != prev_reading_style_pred:
                print(f"Reading style prediction at {time_now_min:} min : {prediction[0]}")
                prev_reading_style_pred = prediction[0]

            if prediction[1] is not None and prediction[1] != 'unknown':
                if prediction[1] != prev_cognitive_load_pred:
                    print(f"Cognitive load prediction at {time_now_min:} min : {prediction[1]}")
                    prev_cognitive_load_pred = prediction[1]

            if prediction[2] != 'unknown':
                if prediction[2] != prev_ripa2_pred:
                    print(f"RIPA2 prediction at {time_now_min:} min : {prediction[2]}")
                    prev_ripa2_pred = prediction[2]

            num_samples = 0
            # events = []
        
    if online_mode == False:
        # processed_data = pd.DataFrame(tracker.processed_samples)
        # saccades = pd.DataFrame(tracker.saccades)
        # blinks = pd.DataFrame(tracker.blink_objects) 
        # fixations = pd.DataFrame(tracker.term_time_collector)

        # Make predictions
        if save_files == True: 
            # processed_data.to_csv("data/processed/processed_samples.csv")
            # saccades.to_csv("data/processed/saccades.csv")
            # blinks.to_csv("data/processed/blinks.csv")
            # fixations.to_csv("data/processed/fixations.csv")

            print("Total number of fixations:", tracker.fixation_counter)
            print("Total number of saccades:", tracker.saccade_counter)
            print("Total number of blinks:", tracker.blink_counter)
            print("Total number of noise samples:", tracker.noise_counter)

if __name__ == "__main__":
    main()