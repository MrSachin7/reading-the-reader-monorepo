import pandas as pd
import numpy as np
import math
import collections
import scipy.signal # Savitzky-Golay filter (RIPA smoothing)
import json
import re

SCREEN_WIDTH=2560   # TODO: replace with actual screen dimensions from metadata
SCREEN_HEIGHT=1440

SCREEN_SIZE = 27*25.4/(np.sqrt(SCREEN_WIDTH**2+SCREEN_HEIGHT**2))*SCREEN_WIDTH
FREQ = 90 # Hz, eye-tracker sampling frequency

IVT_THRESHOLD = 30 # deg/px; below = fixation, above = saccade   # TODO: check for our sampling rate

# 30
# Total number of fixations: 1653
# Total number of saccades: 2627
# Total number of blinks: 92
# Total number of noise samples: 132

# 35
# Total number of fixations: 1442
# Total number of saccades: 2234
# Total number of blinks: 92
# Total number of noise samples: 132

RIPA_BUFFER_SIZE = 1200
RIPA_INVALID_MARGINS_MS = 100 # ms margin removed around blinks
NUM_INVALID_SAMPLES = math.ceil(RIPA_INVALID_MARGINS_MS / 1000 * FREQ) # ≈ 9 samples at 90 Hz

# Savitzky-Golay filter parameters for VLF (very low frequency) and LF (low frequency) smoothing
RIPA_VLF_WINDOW = 147
RIPA_VLF_POLYNOMIAL = 2
RIPA_LF_WINDOW = 26 
RIPA_LF_POLYNOMIAL = 6

RIPA_MIN_VALUE = 0.0
RIPA_MAX_VALUE = 1.5
RIPA_DELTA = int(RIPA_VLF_WINDOW - RIPA_LF_WINDOW)

# The delay queue holds samples so we can retroactively mark pre-blink samples as invalid once a blink is detected
DELAY_QUEUE_SIZE = NUM_INVALID_SAMPLES + 1 # 10 samples
# How often to recalculate the blink detection threshold, in samples
RECALCULATE_EVERY = 90 * 10

FIXATION_THRESHOLD = 80 # ms; minimum duration to count as a fixation

class EyeTracker:
    def __init__(self, online_mode=True):
        self.online_mode = online_mode

        # Metadata
        self.set_recording_id = True
        self.recording_id = None
        self.start_time_ms = None

        # Word and sentence index dictionaries
        self.sentence_to_word_index = {}
        self.words_index = {}

        # Time
        self.prev_ts = -1   # updated using only valid samples
        self.first_incoming_valid_event = True

        # Delay queue
        self.delay_queue = collections.deque(maxlen=DELAY_QUEUE_SIZE)

        # Queue to collect valid samples to compute the blink threshold
        self.baseline_buffer = collections.deque(maxlen=180)
        print(f"RECALCULATE_EVERY: {RECALCULATE_EVERY}, baseline_buffer maxlen: {self.baseline_buffer.maxlen}")

        # Event queue for moving-median smoothing
        self.event_counter = 0
        self.event_queue_size = 21
        self.event_queue = collections.deque(maxlen=self.event_queue_size)
        self.event_queue_middle = math.floor(self.event_queue_size/2)

        # IVT
        self.ivt_prev_ts = -1
        self.ivt_prev_gaze_point = None
        self.ivt_prev_gaze_origin = None
        self.saccade_peak_velocity = 0
        
        self.gaze_point_collector = []
        self.gaze_point_timestamp_collector = []
        self.velocity_calculator_window_size = 3
        self.velocity_calculator_queue_window_size = 7

        # Saccades
        self.fixation_counter = 0
        self.prev_is_fixation = None
        self.saccade_counter = 0

        self.saccade_start_time = -1
        self.saccade_start_x = None
        self.saccade_start_y = None
        self.saccade_start_gaze_point = None
        self.saccade_start_gaze_origin = None

        self.saccade_start_word = None
        self.saccade_start_word_id = None
        self.saccade_end_word = None
        self.saccade_end_word_id = None 

        self.saccade_end_time = None
        self.saccade_end_x = None
        self.saccade_end_y = None
        self.saccade_end_gaze_point = None
        self.saccade_end_gaze_origin = None

        # Fixations
        self.word_per_fixation = {}
        self.term_span_collector = {}
        self.term_span_ordering = []
        self.term_time_collector = {}

        self.last_word_written = None
        self.last_index_written = None
        self.last_timestamp_written = None

        self.regression_mode = False
        self.regression_mode_word = None
        self.regression_mode_word_index = None
        self.highest_fixated_word_for_this_sentence = None

        self.merge_adjacent_fixations = True
        self.write_timestamps = True

        # Blinks
        self.blink_counter = 0
        self.blink_objects = {}
        self.base_threshold_calculated = False
        self.pupil_diameter_threshold = None
        self.is_blink = False
        self.prev_is_blink = False
        self.prev_ts_blinks = -1    # updated using invalid and valid samples
        self.blink_start_time = None
        self.blink_end_time = None
        self.first_incoming_event = True

        # Noise
        self.noise_counter = 0
        self.noise_objects = {}

        # RIPA2 (pupillary activity index)
        # Precomputing Savitzky-Golay coefficients for VLF and LF smoothing
        self.ripa_vlf_coeffs = scipy.signal.savgol_coeffs(
            (2 * RIPA_VLF_WINDOW + 1),
            RIPA_VLF_POLYNOMIAL,
            deriv = 0,
            delta = 1/FREQ,
            use = "dot"
        )
        self.ripa_lf_coeffs = scipy.signal.savgol_coeffs(
            (2 * RIPA_LF_WINDOW + 1),
            RIPA_LF_POLYNOMIAL,
            deriv = 0,
            delta = 1/FREQ,
            use = "dot"
        )
        
        self.ripa_pupil_buffer = collections.deque(maxlen=RIPA_BUFFER_SIZE)
        # Samples in the post blink margin that will be marked as invalid
        self.num_samples_to_be_affected = 0
        self.ripa2_scores_collector = {}

        self.text_saccades_collector = {}
        self.fixations = []

        # Transport-only: cross-word saccades collected for the host platform.
        # Not used by any algorithm in this file.
        self.cross_word_saccades = []

        if self.online_mode == False:   # TODO: make note of this in the report?/rename online mode?
            self.processed_samples = []     

    def json_to_csv(self, file):
        df = pd.json_normalize(file, sep='_')
        gaze_df = pd.json_normalize(file['gazeSamples'], sep='_')

        # subset dataframe to not include the text in all rows after joining with gaze samples
        df_subset = df[['experiment_sessionId', 'experiment_participant_name',
                        'experiment_screen_screenWidthPx', 'experiment_screen_screenHeightPx',
                        'experiment_screen_availableScreenWidthPx', 'experiment_screen_availableScreenHeightPx',
                        'experiment_screen_physicalScreenWidthPx', 'experiment_screen_physicalScreenHeightPx',
                        'experiment_screen_devicePixelRatio']]
        
        # cross join subset dataframe with gaze samples
        df_cross_joined = df_subset.merge(gaze_df, how='cross')

        # rename columns
        df_cross_joined.rename(columns={
            'experiment_sessionId': 'Recording',
            'experiment_participant_name': 'Filename',
            'experiment_screen_screenWidthPx': 'screen_width_px',
            'experiment_screen_screenHeightPx': 'screen_height_px',
            'experiment_screen_availableScreenWidthPx': 'available_screen_width_px',
            'experiment_screen_availableScreenHeightPx': 'available_screen_height_px',
            'experiment_screen_physicalScreenWidthPx': 'physical_screen_width_px',
            'experiment_screen_physicalScreenHeightPx': 'physical_screen_height_px',
            'experiment_screen_devicePixelRatio': 'device_pixel_ratio',

            'sequenceNumber': 'row_number',
            'capturedAtUnixMs': 'time_stamps',
            'deviceTimeStampUs': 'device_time_stamp',

            'left_gazePoint2D_x':'left_gaze_point_on_display_area_0',
            'left_gazePoint2D_y': 'left_gaze_point_on_display_area_1',
            'right_gazePoint2D_x': 'right_gaze_point_on_display_area_0',
            'right_gazePoint2D_y': 'right_gaze_point_on_display_area_1',
            'left_gazePoint2D_validity': 'left_gaze_point_validity',
            'right_gazePoint2D_validity': 'right_gaze_point_validity',

            'left_gazePoint3D_x': 'left_gaze_point_in_user_coordinate_system_0',
            'left_gazePoint3D_y': 'left_gaze_point_in_user_coordinate_system_1',
            'left_gazePoint3D_z': 'left_gaze_point_in_user_coordinate_system_2',
            'right_gazePoint3D_x': 'right_gaze_point_in_user_coordinate_system_0',
            'right_gazePoint3D_y': 'right_gaze_point_in_user_coordinate_system_1',
            'right_gazePoint3D_z': 'right_gaze_point_in_user_coordinate_system_2',

            'left_gazeOrigin3D_x': 'left_gaze_origin_in_user_coordinate_system_0',
            'left_gazeOrigin3D_y': 'left_gaze_origin_in_user_coordinate_system_1',
            'left_gazeOrigin3D_z': 'left_gaze_origin_in_user_coordinate_system_2',
            'right_gazeOrigin3D_x': 'right_gaze_origin_in_user_coordinate_system_0',
            'right_gazeOrigin3D_y': 'right_gaze_origin_in_user_coordinate_system_1',
            'right_gazeOrigin3D_z': 'right_gaze_origin_in_user_coordinate_system_2',
            'left_gazeOrigin3D_validity': 'left_gaze_origin_validity',
            'right_gazeOrigin3D_validity': 'right_gaze_origin_validity',

            'left_gazeOriginTrackBox_x': 'left_gaze_origin_in_trackbox_coordinate_system_0',
            'left_gazeOriginTrackBox_y': 'left_gaze_origin_in_trackbox_coordinate_system_1',
            'left_gazeOriginTrackBox_z': 'left_gaze_origin_in_trackbox_coordinate_system_2',
            'right_gazeOriginTrackBox_x': 'right_gaze_origin_in_trackbox_coordinate_system_0',
            'right_gazeOriginTrackBox_y': 'right_gaze_origin_in_trackbox_coordinate_system_1',
            'right_gazeOriginTrackBox_z': 'right_gaze_origin_in_trackbox_coordinate_system_2',

            'left_pupil_diameterMm': 'left_pupil_diameter',
            'right_pupil_diameterMm': 'right_pupil_diameter',

            'focus_activeTokenId': 'token_id',
            'focus_activeTokenText': 'word'
        }, inplace=True)

        return df_cross_joined

    def parse_text(self, session_id, materials):
        for material in materials:
            raw_blocks = re.split(r'(?:\r?\n){2,}', material["markdown"].strip())
            material_id = material["id"]

            for block_index, block_text in enumerate(raw_blocks):
                block_text = block_text.strip()
            
                if block_text.startswith('#'):
                    sentence_id = f"{session_id}:{material_id}:{block_index+1}:sentence:{1}"
                    sentence_text = re.sub(r'^#+\s*', '', block_text)
                    tokens = sentence_text.split()
                    words = []

                    for token in tokens:
                        word = re.sub(r'^[^\w]+|[^\w]+$', '', token)
                        if word:
                            words.append(word)

                    word_ids = []

                    for word_index, word in enumerate(words):
                        word_id = f"{session_id}:{material_id}:{block_index + 1}:sentence:{1}:word:{word_index + 1}"
                        word_ids.append(word_id)

                    self.sentence_to_word_index[sentence_id] = word_ids 


                else:
                    sentences = re.split(r'(?<=[.;!?][\'"\'"])\s+|(?<=[.;!?])\s+', block_text)

                    for sentence_index, sentence_text in enumerate(sentences):
                        sentence_text = sentence_text.strip()

                        sentence_id = f"{session_id}:{material_id}:{block_index + 1}:sentence:{sentence_index + 1}"

                        sentence_text = re.sub(r'^#+\s*', '', sentence_text)
                        tokens = sentence_text.split()
                        words = []
                        for token in tokens:
                            word = re.sub(r'^[^\w]+|[^\w]+$', '', token)
                            if word:
                                words.append(word)

                        word_ids = []

                        for word_index, word in enumerate(words):
                            word_id = f"{session_id}:{material_id}:{block_index + 1}:sentence:{sentence_index + 1}:word:{word_index + 1}"
                            word_ids.append(word_id)
                            self.words_index[word_id] = word

                        self.sentence_to_word_index[sentence_id] = word_ids

    def delay_event(self, idx, event):

        # Getting metadata from the first sample
        if self.set_recording_id:
            self.recording_id = event["Recording"]
            self.start_time_ms = event["time_stamps"]
            self.set_recording_id = False

        # Checking if data for both pupils is missing
        is_invalid = (event['left_pupil_validity'] == 'Invalid' and event['right_pupil_validity'] == 'Invalid')
        event["is_invalid"] = is_invalid

        # Checking if pupil diameter is below threshold (blink)
        event['pupil_diameter'] = self._average_pupil(event, event['left_pupil_validity'], event['right_pupil_validity'])
        self.is_blink = event['pupil_diameter'] < self.pupil_diameter_threshold if self.base_threshold_calculated else False

        # A sample is invalid if either of the above conditions are true
        is_invalid = is_invalid or self.is_blink

        # if is_invalid:
        #     # set the next 9 samples as invalid
        #     self.num_samples_to_be_affected = DELAY_QUEUE_SIZE

        # Flag pupil sample as invalid if the pupil data is missing or is within the affected margin
        if is_invalid or self.num_samples_to_be_affected > 0:
            event["pupil_affected"] = True
        else:
            event["pupil_affected"] = False

        # Add event to the delay queue (even if invalid)
        self.delay_queue.append(event)

        if is_invalid:
            # set existing samples in the delay queue to be invalid
            for sample in self.delay_queue:
                sample["pupil_affected"] = True

        # if sample is not noise/blink but it is affected, decrease count of affected samples
        if self.num_samples_to_be_affected > 0:
            self.num_samples_to_be_affected -= 1

        if not event["is_invalid"]:
            self.baseline_buffer.append(event)
            if len(self.baseline_buffer) == self.baseline_buffer.maxlen and idx % RECALCULATE_EVERY == 0 and not any(sample['is_invalid'] for sample in self.baseline_buffer):
                mean = np.mean([sample['pupil_diameter'] for sample in self.baseline_buffer])
                std = np.std([sample['pupil_diameter'] for sample in self.baseline_buffer])
                # Blink threshold calculated as 3 standard deviations below the mean
                self.pupil_diameter_threshold = mean - 3 * std
                self.base_threshold_calculated = True
                # print("Base threshold calculated:", self.pupil_diameter_threshold, " at index:", idx)

        # Process the oldest sample once the delay queue is full
        if len(self.delay_queue) >= DELAY_QUEUE_SIZE:
            poppedEvent = self.delay_queue.popleft()
            self._handle_event(poppedEvent)

    def _handle_event(self, event):

        is_invalid = (event['left_pupil_validity'] == 'Invalid' and event['right_pupil_validity'] == 'Invalid')
    
        if event["pupil_affected"]:
            # if the first event is invalid, set the prev_ts_blinks to its timestamp
            if self.first_incoming_event:
                self.prev_ts_blinks = event["time_stamps"]
                self.first_incoming_event = False
            
            self._build_blink_objects(event["time_stamps"])

        self.prev_ts_blinks = event["time_stamps"]

        if self.prev_is_blink and not event["pupil_affected"]:
            self.prev_is_blink = False
            self._calculate_blink_metrics(event["time_stamps"])
            self._separate_noise_from_blink(self.blink_objects[self.blink_counter])

        if not is_invalid:
            # add the new event to the end of the queue
            self.event_queue.append(event)

            if len(self.event_queue) == self.event_queue_size:
                pupil_diameter_data = pd.Series([self.event_queue[i]['pupil_diameter'] for i in range(self.event_queue_size)])
                self.event_queue[self.event_queue_size//2]['pupil_diameter'] = self._hampel_filter(pupil_diameter_data)

            # if event_queue has 4 elements, we can start working on the first 3 elements until middle element, i.e., 0, 1, 2
            if len(self.event_queue) == self.event_queue_middle + 1:
                for i in range(self.event_queue_middle):
                    self._process_event(self.event_queue[i], i) 
                    self.event_counter += 1

            # if event_queue has 7 elements, work on middle element aka element 4
            elif len(self.event_queue) == self.event_queue_size:
                middle_item = self.event_queue[self.event_queue_middle]
                self._process_event(middle_item, self.event_queue_middle)
                self.event_counter += 1

    def _process_event(self, event, queue_pointer):
        event = self._get_mean_coordinates_from_event(event)

        # Smoothing
        # for 2d
        raw_x = self._moving_median_queue(event["raw_x"], "x", 3, "2d", queue_pointer)
        raw_y = self._moving_median_queue(event["raw_y"], "y", 3, "2d", queue_pointer)

        # for 3d
        gaze_point={}
        gaze_point[0] = self._moving_median_queue(event["gaze_point"][0], "x", 3, "3d", queue_pointer)
        gaze_point[1] = self._moving_median_queue(event["gaze_point"][1], "y", 3, "3d", queue_pointer)
        gaze_point[2] = self._moving_median_queue(event["gaze_point"][2], "z", 3, "3d", queue_pointer)

        if self.first_incoming_valid_event:
            self.prev_ts = event["ts"]
            self.first_timestamp = event["ts"]
            self.prev_x = raw_x
            self.prev_y = raw_y
            self.prev_gaze_point = gaze_point
            self.prev_gaze_origin = event["gaze_origin"]
            self.first_incoming_valid_event = False

        # IVT
        is_fixation, angle_degree, velocity = self._ivt(event["ts"], gaze_point, event["gaze_origin"])

        self._build_saccade_object(is_fixation, event["ts"], raw_x, raw_y, gaze_point, event["gaze_origin"], event["word"],  event["token_id"])
        time_diff = event["ts"] - self.prev_ts
        self._build_fixation_object(is_fixation, event["gaze_point"], event["gaze_origin"], event["token_id"], event["word"], time_diff, event["ts"], event["sentence_id"])

        self.prev_is_fixation = is_fixation
        self.prev_ts = event["ts"]
        self.prev_x = raw_x
        self.prev_y = raw_y
        self.prev_gaze_point = gaze_point
        self.prev_gaze_origin = event["gaze_origin"]
        
        self._addToGazePointWindow(gaze_point, event["ts"], self.velocity_calculator_window_size)

        ripa2 = self._ripa(event["pupil_diameter"], event["pupil_affected"])
        
        if self.online_mode == False:
            self.processed_samples.append({
                "ts_ms": event["ts"],
                "raw_x": raw_x,
                "raw_y": raw_y,
                "gaze_point": gaze_point,
                "gaze_origin": event["gaze_origin"],
                "gaze_origin_z": event["gaze_origin"][2],
                "pupil_diameter": event["pupil_diameter"],
                "pupil_affected": event["pupil_affected"],
                "is_fixation": is_fixation,
                "angle_degree": angle_degree,
                "velocity": velocity,
                "ripa2": ripa2,
            })

        if ripa2:
            self.ripa2_scores_collector[event['ts']] = ripa2
    
    def _moving_median_queue(self, data, axis, window_size, data_type, queue_pointer):
        if len(self.event_queue) < window_size:
            return data  # not enough events yet, return raw value

        if len(self.event_queue) >= window_size:

            if queue_pointer == 0:
                return data

            # try to get events before and after the current event
            try:
                event_before = self.event_queue[queue_pointer-1]
                event_middle = self.event_queue[queue_pointer]
                event_after = self.event_queue[queue_pointer+1]

            except Exception as e:
                print("Not enough events in queue")
                return data
            
            # get exact coordinates if events are valid
            coordinates_before = self._get_mean_coordinates_from_event(event_before)
            coordinates_middle = self._get_mean_coordinates_from_event(event_middle)
            coordinates_after = self._get_mean_coordinates_from_event(event_after)

            # collect coordinates in a list
            coordinate_list= []

            if data_type == '2d':
                if axis == 'x':
                    coordinate_list.append(coordinates_before['raw_x'])
                    coordinate_list.append(coordinates_middle['raw_x'])
                    coordinate_list.append(coordinates_after['raw_x'])

                if axis == 'y':
                    coordinate_list.append(coordinates_before['raw_y'])
                    coordinate_list.append(coordinates_middle['raw_y'])
                    coordinate_list.append(coordinates_after['raw_y'])

            if data_type == '3d':
                if axis == 'x':
                    coordinate_list.append(coordinates_before['gaze_point'][0])
                    coordinate_list.append(coordinates_middle['gaze_point'][0])
                    coordinate_list.append(coordinates_after['gaze_point'][0])

                if axis == 'y':
                    coordinate_list.append(coordinates_before['gaze_point'][1])
                    coordinate_list.append(coordinates_middle['gaze_point'][1])
                    coordinate_list.append(coordinates_after['gaze_point'][1])

                if axis == 'z':
                    coordinate_list.append(coordinates_before['gaze_point'][2])
                    coordinate_list.append(coordinates_middle['gaze_point'][2])
                    coordinate_list.append(coordinates_after['gaze_point'][2])

            # calculate median
            if len(coordinate_list) < 2: 
                median = coordinate_list[0]

            median = np.median(coordinate_list)

        return median

    def _get_mean_coordinates_from_event(self, event):
        return_object = {}

        vl = event['left_gaze_point_validity'] # 1/0 int
        vr = event['right_gaze_point_validity'] # 1/0 int
        vlp = event['left_pupil_validity']
        vrp = event['right_pupil_validity']
        
        ts = event['time_stamps'] # float
        # time_diff = (ts -  self.prev_ts) if self.prev_ts >= 0 else 0
        # self.prev_ts = ts

        raw_x, raw_y = self._average_display_area(event, vl, vr) # display_area is 2D, where on the screen is the reader looking
        gaze_point = self._average_usc(event, vl, vr, "gaze_point")
        gaze_origin = self._average_usc(event, vl, vr, "gaze_origin")

        # eye_mean_relative_y-=browser_menu_height;
        # var eye_mean_absolute_x = eye_mean_relative_x + window.scrollX;
        # var eye_mean_absolute_y = eye_mean_relative_y + window.scrollY;

        return_object['ts'] = ts
        return_object['vl'] = vl
        return_object['vr'] = vr
        return_object['raw_x'] = raw_x
        return_object['raw_y'] = raw_y
        return_object['gaze_point'] = gaze_point
        return_object['gaze_origin'] = gaze_origin
        return_object['pupil_diameter'] = event["pupil_diameter"]
        return_object['pupil_affected'] = event['pupil_affected']
        return_object['token_id'] = event["token_id"]
        return_object['word'] = event["word"]
        return_object['sentence_id'] = event["focus_activeSentenceId"]

        return return_object

    def _ivt(self, ts, gaze_point_in_ucs, gaze_origin_in_ucs):

        # The initalization, setting up the values for the first sample
        if self.ivt_prev_ts == -1: 
            self.ivt_prev_ts = ts
            self.ivt_prev_gaze_point = gaze_point_in_ucs
            self.ivt_prev_gaze_origin = gaze_origin_in_ucs
            return [False, 0, 0]
        
        # For the rest of the samples we calculate the time difference in seconds and save the current and previous gaze points
        delta_t = (ts - self.ivt_prev_ts) / 1000 # ms to s

        if len(self.gaze_point_timestamp_collector) >= 2:
            first_ts = self.gaze_point_timestamp_collector[0]
            delta_t = (ts - first_ts)/1000 # ms to s

        gaze_point = [gaze_point_in_ucs[i] for i in range(3)]
        gaze_origin = [gaze_origin_in_ucs[i] for i in range(3)]
        prev_gaze_point = [self.ivt_prev_gaze_point[i] for i in range(3)]

        if len(self.gaze_point_timestamp_collector) >= 2:
            first_gaze_point = self.gaze_point_collector[0]
            prev_gaze_point = [first_gaze_point[i] for i in range(3)]

        # Calculating the vectors
        gv = [gaze_point[i] - gaze_origin[i] for i in range(3)]
        prev_gv = [prev_gaze_point[i] - gaze_origin[i] for i in range(3)]

        # Saving the new values
        self.ivt_prev_ts = ts
        self.ivt_prev_gaze_point = gaze_point_in_ucs
        self.ivt_prev_gaze_origin = gaze_origin_in_ucs

        if delta_t == 0 or gv == prev_gv:
            return [True, 0, 0]
        
        # Calculating angle and velocity
        numerator = sum(gv[i] * prev_gv[i] for i in range(3))
        denominator = math.sqrt(sum(v**2 for v in gv)) * math.sqrt(sum(v**2 for v in prev_gv))

        if denominator == 0:
            return [True, 0, 0]
        
        quotient = numerator / denominator

        angle_radians = math.acos(max(-1.0, min(1.0, quotient)))
        angle_degrees = angle_radians * 180 / math.pi

        velocity = angle_degrees / delta_t # degrees per sec

        # Returning a fixation if below the threshold
        if velocity <= IVT_THRESHOLD:
            return [True, angle_degrees, velocity]
        
        if velocity > self.saccade_peak_velocity:
            self.saccade_peak_velocity = velocity 

        return [False, angle_degrees, velocity]

    def _ivt_angle_to_fixation_before(self, timestamp_now, gaze_point_now, gaze_origin_now, last_timestamp, last_gaze_point, last_gaze_origin):

        delta_time = (timestamp_now-last_timestamp)

        # average eye position
        gaze_origin = [gaze_origin_now[i] for i in range(3)]
        prev_gaze_origin = [last_gaze_origin[i] for i in range(3)]

        # take the average
        gaze_origin_average = [gaze_origin[i] + prev_gaze_origin[i] / 2 for i in range(3)]

        # gaze points
        gaze_point = [gaze_point_now[i] for i in range(3)]
        prev_gaze_point = [last_gaze_point[i] for i in range(3)]

        # compute vectors
        gv = [gaze_point[i] - gaze_origin_average[i] for i in range(3)]
        prev_gv = [prev_gaze_point[i] - gaze_origin_average[i] for i in range(3)]

        if delta_time == 0 or gv == prev_gv:
            return 0

        # compute the angle between vectors
        numerator = sum(gv[i] * prev_gv[i] for i in range(3))
        denominator = math.sqrt(sum(v**2 for v in gv)) * math.sqrt(sum(v**2 for v in prev_gv))

        if denominator == 0:
            return 0

        quotient = numerator/denominator

        angle_radians = math.acos(max(-1.0, min(1.0, quotient)))
        angle_degrees = angle_radians * 180 / math.pi

        return angle_degrees
    
    def _addToGazePointWindow(self, gaze_point, timestamp, window_size):
        if len(self.gaze_point_collector) >= window_size:
            self.gaze_point_collector.pop(0)
        
        if len(self.gaze_point_timestamp_collector) >= window_size:
            self.gaze_point_timestamp_collector.pop(0)

        self.gaze_point_collector.append(gaze_point)
        self.gaze_point_timestamp_collector.append(timestamp)

# TODO: should be absolute raw x and y
    def _build_saccade_object(self, is_fixation, ts, raw_x, raw_y, gaze_point, gaze_origin, word, token_id):
        if is_fixation != self.prev_is_fixation:
            if is_fixation:
                self.fixation_counter += 1
                saccade_object = self._compute_saccade_metrics(self.saccade_start_time, self.saccade_start_x, self.saccade_start_y, self.saccade_start_gaze_point, self.saccade_start_gaze_origin,
                                                                self.saccade_end_time, self.saccade_end_x, self.saccade_end_y, self.saccade_end_gaze_point, self.saccade_end_gaze_origin,
                                                                self.saccade_start_word, self.saccade_start_word_id, self.saccade_end_word, self.saccade_end_word_id)
                
                self._map_saccade_to_aoi(saccade_object)
                self.saccade_peak_velocity = 0

            if not is_fixation:
                self.saccade_counter += 1
                self.saccade_start_time = self.prev_ts
                self.saccade_start_x = self.prev_x
                self.saccade_start_y = self.prev_y
                self.saccade_start_gaze_point = self.prev_gaze_point
                self.saccade_start_gaze_origin = self.prev_gaze_origin
                self.saccade_start_word = word
                self.saccade_start_word_id = token_id

        if not is_fixation:
            self.saccade_end_time = ts
            self.saccade_end_x = raw_x
            self.saccade_end_y = raw_y
            self.saccade_end_gaze_point = gaze_point
            self.saccade_end_gaze_origin = gaze_origin
            self.saccade_end_word = word
            self.saccade_end_word_id = token_id

    def _map_saccade_to_aoi(self, saccade_object):
        '''
        saccade_object = {'number', 'start_x', 'start_y', 'end_x', 'end_y', 'duration', 'start_time', 'end_time',
                        'length', 'amplitude', 'peak_velocity', 'direction',
                        'start_word', 'start_word_id', 'end_word', 'end_word_id'}
        '''
        if not saccade_object['start_word_id'] or not saccade_object['end_word_id']:
            return

        if saccade_object['start_word_id'] != saccade_object['end_word_id']:
            # Transport-only: keep word-to-word saccades for the host platform.
            self.cross_word_saccades.append(saccade_object)
            return

        hash = saccade_object['start_word_id']

        if not hash in self.text_saccades_collector:
            self.text_saccades_collector[hash] = {
                "word": saccade_object['start_word'],
                "saccades": [saccade_object]
            }
            
        else:
            self.text_saccades_collector[hash]["saccades"].append(saccade_object)

        # if self.online_mode == False:
        #     self.saccades.append(saccade_object)
            
    def _compute_saccade_metrics(self, saccade_start_time, saccade_start_x, saccade_start_y, saccade_start_gaze_point, saccade_start_gaze_origin, saccade_end_time, saccade_end_x, saccade_end_y, saccade_end_gaze_point, saccade_end_gaze_origin, saccade_start_word, saccade_start_word_id, saccade_end_word, saccade_end_word_id):
        
        return_object = {}

        if saccade_start_time != -1:
            return_object['number'] = self.saccade_counter
            return_object['start_x'] = saccade_start_x
            return_object['start_y'] = saccade_start_y
            return_object['end_x'] = saccade_end_x
            return_object['end_y'] = saccade_end_y
            return_object['duration'] = saccade_end_time - saccade_start_time
            return_object['start_time'] = saccade_start_time
            return_object['end_time'] = saccade_end_time
            return_object['start_word'] = saccade_start_word
            return_object['start_word_id'] = saccade_start_word_id
            return_object['end_word'] = saccade_end_word
            return_object['end_word_id'] = saccade_end_word_id

            delta_x = saccade_end_x - saccade_start_x
            delta_y = saccade_end_y - saccade_start_y
            length = math.sqrt(delta_x**2 + delta_y**2)
            return_object['length'] = length

            gv = [saccade_end_gaze_point[i] - saccade_end_gaze_origin[i] for i in range(3)]
            prev_gv = [saccade_start_gaze_point[i] - saccade_start_gaze_origin[i] for i in range(3)]

            numerator = gv[0] * prev_gv[0] + gv[1] * prev_gv[1] + gv[2] * prev_gv[2]
            denominator = math.sqrt(sum(v**2 for v in gv)) * math.sqrt(sum(v**2 for v in prev_gv))
            
            if denominator == 0:
                return_object['amplitude'] = 0
        
            quotient = numerator / denominator

            angle_radians = math.acos(max(-1.0, min(1.0, quotient)))
            angle_degrees = angle_radians * 180 / math.pi
            return_object['amplitude'] = angle_degrees
            return_object['peak_velocity'] = self.saccade_peak_velocity

            delta_x = saccade_end_x - saccade_start_x
            delta_y = saccade_end_y - saccade_start_y
            theta_radians = math.atan2(delta_y, delta_x)
            theta_degrees = theta_radians * 180 / math.pi

            if theta_degrees < 0:
                theta_degrees += 360

            return_object['direction'] = theta_degrees

        return return_object

    def _build_fixation_object(self, is_fixation, gaze_point, gaze_origin, token_id, word, time_diff, current_time, sentence_number):

        # if the fixation ID is not already in word_per_fixation then initialize it
        if not self.fixation_counter in self.word_per_fixation.keys():
            self.word_per_fixation[self.fixation_counter] = word

        # if not in a fixation and there is something in the term_span_collector (which skips the fist saccade at the start)
        if not is_fixation:
            if self.term_span_collector and len(self.term_span_collector) > 0:
                merge_fixations = False
                first_key_term_span = self.term_span_ordering[0]
                first_time_from_term_span = self.term_span_collector[first_key_term_span]["first_time"]

                # skips the first saccade sample
                if self.last_timestamp_written:
                    # checks if two fixations have to be merge by checking the time between two fixations and the IVT angle
                    if first_time_from_term_span - self.last_timestamp_written < 75:
                        ivt_angle_degrees_to_fixation_before = self._ivt_angle_to_fixation_before(first_time_from_term_span, gaze_point, gaze_origin, self.last_timestamp_written, self.last_gaze_point_written, self.last_gaze_origin_written)
                        if ivt_angle_degrees_to_fixation_before <= 0.5:
                            merge_fixations = True

                # For each entry in the collector, check if there is a word associated and compute the measures

                for key in self.term_span_ordering:
                    if key not in self.term_span_collector:
                        continue
                    current_term_span_collector = self.term_span_collector[key]

                    word_write = current_term_span_collector["word"]
                    index_write = current_term_span_collector["token_id"]
                    sentence_number = current_term_span_collector["sentence_number"]
                    words_indices_in_this_sentence = self.sentence_to_word_index[sentence_number]
                    first_fixation = False

                    if word_write:
                        # Check that the word position exists
                        if index_write not in self.term_time_collector.keys():
                            self.term_time_collector[index_write] = {}

                        # Check that the word exists
                        if word_write in self.term_time_collector[index_write]:
                            # Check if the tTERMc has the 'first_time' column meaning the word is already in tTERMc
                            bool_first_time = self._check_nested(self.term_time_collector, index_write, word_write, "first_time")

                            # Check that we don't have to merge and there isn't a 'first_time' column

                            if merge_fixations == False or bool_first_time == False:
                                self.term_time_collector[index_write][word_write]["fixation_duration"] += current_term_span_collector["fixation_duration"]
                                self.term_time_collector[index_write][word_write]["last_time"] = current_term_span_collector["last_time"]
                                self.term_time_collector[index_write][word_write]["fixation_count"] += 1

                                self.term_time_collector[index_write][word_write]["timestamps"].append(str(current_term_span_collector["first_time"]) + ' - ' + str(current_term_span_collector["last_time"]))

                                if not bool_first_time:
                                    self.term_time_collector[index_write][word_write]["first_time"] = current_term_span_collector["first_time"]
                                    self.term_time_collector[index_write][word_write]["time_to_first_fixation"] = current_term_span_collector["time_to_first_fixation"]
                                    self.term_time_collector[index_write][word_write]["first_fixation_duration"] = current_term_span_collector["fixation_duration"]

                                self.term_time_collector[index_write][word_write]["all_fixation_durations"].append(current_term_span_collector["fixation_duration"])
                                self.term_time_collector[index_write][word_write]["fixation_group_numbers"].append(current_term_span_collector["fixation_group_numbers"])

                            else:
                                self._merge_current_fixation_with_last_fixation(index_write, word_write, current_term_span_collector)

                            self._update_average_fixation_duration(index_write, word_write)

                        else:
                            first_fixation = True
                            
                            self.term_time_collector[index_write][word_write] = {}
                            self.term_time_collector[index_write][word_write]["word"] = current_term_span_collector["word"]
                            self.term_time_collector[index_write][word_write]["token_id"] = current_term_span_collector["token_id"]
                            self.term_time_collector[index_write][word_write]["fixation_duration"] = current_term_span_collector["fixation_duration"]
                            self.term_time_collector[index_write][word_write]["first_time"] = current_term_span_collector["first_time"]
                            self.term_time_collector[index_write][word_write]["last_time"] = current_term_span_collector["last_time"]
                            self.term_time_collector[index_write][word_write]["fixation_count"] = 1
                            self.term_time_collector[index_write][word_write]["sentence_number"] = current_term_span_collector["sentence_number"]
                            self.term_time_collector[index_write][word_write]["timestamps"] = [str(current_term_span_collector["first_time"]) + ' - ' + str(current_term_span_collector["last_time"])]

                            self.term_time_collector[index_write][word_write]["time_to_first_fixation"] = current_term_span_collector["time_to_first_fixation"]
                            self.term_time_collector[index_write][word_write]["first_fixation_duration"] = current_term_span_collector["fixation_duration"]
                            self.term_time_collector[index_write][word_write]["average_fixation_duration"] = current_term_span_collector["fixation_duration"]
                            self.term_time_collector[index_write][word_write]["all_fixation_durations"] = [current_term_span_collector["fixation_duration"]]
                            self.term_time_collector[index_write][word_write]["fixation_group_numbers"] = [current_term_span_collector["fixation_group_numbers"]]

                            self.term_time_collector[index_write][word_write]["first_pass_duration"] = current_term_span_collector["fixation_duration"]
                            self.term_time_collector[index_write][word_write]["first_pass_fixation_group_numbers"] = [current_term_span_collector["fixation_group_numbers"]]
                            self.term_time_collector[index_write][word_write]["first_pass_fixation_count"] = 1
                            self.term_time_collector[index_write][word_write]["progressive_fixation_sum"] = 0
                            self.term_time_collector[index_write][word_write]["progressive_fixation_count"] = 0
                            self.term_time_collector[index_write][word_write]["progressive_duration"] = 0
                            self.term_time_collector[index_write][word_write]["within_sentence_reread_sum"] = 0
                            self.term_time_collector[index_write][word_write]["within_sentence_reread_count"] = 0
                            self.term_time_collector[index_write][word_write]["rereading_duration"] = 0
                            self.term_time_collector[index_write][word_write]["lookback_sum"] = 0
                            self.term_time_collector[index_write][word_write]["lookback_count"] = 0
                            self.term_time_collector[index_write][word_write]["lookback_duration"] = 0
                            self.term_time_collector[index_write][word_write]["refixation_rate"] = 0

                        
                        ### FIRST-PASS DURATION
                        # Sum of all fixation durations in the first pass, the total duration of the fixations inside this area of interest during the first pass.
                        # If the word was skipped during the first-pass reading, then the value is "0", if reading never progressed up to this word, then the value is "(blank)".

                        current_fixation_number = current_term_span_collector["fixation_group_numbers"]
                        if self._check_nested(self.term_time_collector, index_write, word_write, 'first_pass_fixation_group_numbers'):
                            first_pass_fixation_group_numbers = self.term_time_collector[index_write][word_write]["first_pass_fixation_group_numbers"]
                            if first_pass_fixation_group_numbers:
                                last_entry = self.term_time_collector[index_write][word_write]["first_pass_fixation_group_numbers"][-1]
                                before_fixation_number = last_entry[0] if isinstance(last_entry, list) else last_entry

                                check_first_pass_fixation = all(
                                    self.word_per_fixation.get(i) is None or self.word_per_fixation.get(i) == word_write
                                    for i in range(before_fixation_number, current_fixation_number))
                                
                                if check_first_pass_fixation and self.last_word_written == word_write and merge_fixations == False:
                                    self.term_time_collector[index_write][word_write]["first_pass_duration"] += current_term_span_collector["fixation_duration"]
                                    self.term_time_collector[index_write][word_write]["first_pass_fixation_group_numbers"].append(current_term_span_collector["fixation_group_numbers"])

                        self._update_prior_words_with_measure("first_pass_duration", index_write, sentence_number, words_indices_in_this_sentence, 0)


                        ### READING STYLE FEATURES 
                        # Computed per word and later aggregated across words in submit_data_rading_style function

                        # PROGRESSIVE DURATION
                        # Mean fixation on this word duration during forward saccades only
                        # A forward saccade is one where the index of the current word is greater than the index of the previous word
                        # Same word refixations and regressions are excluded
                        # Corresponds to firstrun.dur in the reading styles R script
                        forward = self._check_if_word_forward(index_write, self.last_index_written) if self.last_index_written else None
                        
                        # forward = True: moved to a later word (progressive)
                        # forward = False: moved to an earlier word (regression)
                        # forward = None: same word refixation or cross text movement, treated as neither
                        if forward is None:
                            is_regressive = False
                        else:
                            is_regressive = not forward
                        self.term_time_collector[index_write][word_write]["is_regressive"] = is_regressive 

                        if forward:
                            self.term_time_collector[index_write][word_write]["progressive_fixation_sum"] += current_term_span_collector["fixation_duration"]
                            self.term_time_collector[index_write][word_write]["progressive_fixation_count"] += 1
                            prog_count = self.term_time_collector[index_write][word_write]["progressive_fixation_count"]
                            prog_sum = self.term_time_collector[index_write][word_write]["progressive_fixation_sum"]
                            self.term_time_collector[index_write][word_write]["progressive_duration"] = prog_sum / prog_count

                        # REREADING DURATION (within-sentence revisits)
                        # Mean fixation duration on this word when it is revisited within the same sentence
                        # A revisit is any fixation after the first one where the current sentence matches the word's home sentence
                        # Corresponds to reread_dur in the reading styles R script
                        word_home_sentence = self.term_time_collector[index_write][word_write].get("sentence_number")
                        is_within_sentence_revisit = (not first_fixation) and (sentence_number == word_home_sentence)
                        if is_within_sentence_revisit and current_term_span_collector["fixation_duration"] > 80: #HERE
                            self.term_time_collector[index_write][word_write]["within_sentence_reread_sum"] += current_term_span_collector["fixation_duration"]
                            self.term_time_collector[index_write][word_write]["within_sentence_reread_count"] += 1
                            reread_count = self.term_time_collector[index_write][word_write]["within_sentence_reread_count"]
                            reread_sum = self.term_time_collector[index_write][word_write]["within_sentence_reread_sum"]
                            self.term_time_collector[index_write][word_write]["rereading_duration"] = reread_sum / reread_count

                        # LOOKBACK DURATION (cross-sentence rereads)
                        # Mean fixation duration on this word when it is revisited from a later sentence
                        # Corresponds to lookback_dur in the reading styles R script
                        sentence_forward = self._check_if_sentence_forward(word_home_sentence, self.last_sentence_number_written) if (not first_fixation and self.last_sentence_number_written) else None
                        
                        # _check_if_sentence_forward returns True: moved forward to a new sentence
                        # _check_if_sentence_forward returns False: moved backwards
                        # _check_if_sentence_forward returns None: same sentence or cross text
                        if sentence_forward is None:
                            is_cross_sentence_revisit = False
                        else:
                            is_cross_sentence_revisit = not sentence_forward  # backward sentence movement = lookback

                        if is_cross_sentence_revisit:
                            self.term_time_collector[index_write][word_write]["lookback_sum"] += current_term_span_collector["fixation_duration"]
                            self.term_time_collector[index_write][word_write]["lookback_count"] += 1
                            lookback_count = self.term_time_collector[index_write][word_write]["lookback_count"]
                            lookback_sum = self.term_time_collector[index_write][word_write]["lookback_sum"]
                            self.term_time_collector[index_write][word_write]["lookback_duration"] = lookback_sum / lookback_count

                        # REFIXATION RATE
                        # Binary flah per word: 1 if this word was fixated more than once during first pass reading, 0 otherwise
                        # Averaged across all words in the submit_data_reading_style to produce a proportion an actual rate
                        # Corresponds to refix in the reading styles R script
                        current_fixation_number = current_term_span_collector["fixation_group_numbers"]
                        if self._check_nested(self.term_time_collector, index_write, word_write, 'first_pass_fixation_group_numbers'):
                            first_pass_fixation_group_numbers = self.term_time_collector[index_write][word_write]["first_pass_fixation_group_numbers"]
                            
                            if first_pass_fixation_group_numbers:
                                last_entry = self.term_time_collector[index_write][word_write]["first_pass_fixation_group_numbers"][-1]
                                before_fixation_number = last_entry[0] if isinstance(last_entry, list) else last_entry

                                check_first_pass_fixation = all(
                                    self.word_per_fixation.get(i) is None or self.word_per_fixation.get(i) == word_write
                                    for i in range(before_fixation_number, current_fixation_number))
                                
                                if check_first_pass_fixation and self.last_word_written == word_write and merge_fixations == False:
                                    self.term_time_collector[index_write][word_write]["first_pass_fixation_count"] += 1

                        is_refixated = self.term_time_collector[index_write][word_write]["first_pass_fixation_count"] > 1
                        self.term_time_collector[index_write][word_write]["refixation_rate"] = 1 if is_refixated else 0

                    self.last_word_written = word_write
                    self.last_index_written = index_write
                    self.last_timestamp_written = current_term_span_collector["last_time"]
                    self.last_sentence_number_written = sentence_number
                    self.last_words_indices_in_this_sentence_written = words_indices_in_this_sentence
                    self.last_gaze_point_written = current_term_span_collector["last_gaze_point"]
                    self.last_gaze_origin_written = current_term_span_collector["last_gaze_origin"]

                    self.fixations.append({
                        "fixid": self.term_time_collector[index_write][word_write]["fixation_group_numbers"][-1],
                        "word": self.term_time_collector[index_write][word_write]["word"],
                        "token_id": self.term_time_collector[index_write][word_write]["token_id"],
                        "duration": self.term_time_collector[index_write][word_write]["all_fixation_durations"][-1],
                        "start_time": self.term_time_collector[index_write][word_write]["timestamps"][-1].split(" - ")[0],
                        "end_time": self.term_time_collector[index_write][word_write]["last_time"],
                        "regression": is_regressive
                    })

                self.term_span_collector = {}
                self.term_span_ordering = []

        # if reader looking at word and fixating
        if word == word:
            # if the current word ID is in the term_span_collector already, add up the time and move the end_time point to current
            if is_fixation and token_id in self.term_span_collector.keys():
                self.term_span_collector[token_id]["fixation_duration"] += time_diff
                self.term_span_collector[token_id]["last_time"] = current_time
                self.term_span_collector[token_id]["last_gaze_point"] = gaze_point
                self.term_span_collector[token_id]["last_gaze_origin"] = gaze_origin

            else:
                # if a new word ID, initalize duraiton, start and end time, word (ID) and the fixation ID
                if is_fixation:
                    self.term_span_ordering.append(token_id)
                    self.term_span_collector[token_id] = {}
                    self.term_span_collector[token_id]["fixation_duration"] = time_diff
                    self.term_span_collector[token_id]["first_time"] = self.prev_ts
                    self.term_span_collector[token_id]["last_time"] = current_time
                    self.term_span_collector[token_id]["word"] = word
                    self.term_span_collector[token_id]["token_id"] = token_id
                    self.term_span_collector[token_id]["sentence_number"] = sentence_number
                    self.term_span_collector[token_id]["time_to_first_fixation"] = self.prev_ts - self.first_timestamp
                    self.term_span_collector[token_id]["fixation_group_numbers"] = self.fixation_counter
                    self.term_span_collector[token_id]["last_gaze_point"] = gaze_point
                    self.term_span_collector[token_id]["last_gaze_origin"] = gaze_origin

    def _check_nested(self, obj, *keys):
        for key in keys:
            if not isinstance(obj, dict) or key not in obj:
                return False
            obj = obj[key]
        return True
    
    def _check_if_word_forward(self, word, prev_word):
        _, text_id, block_id, _, sentence_id, _, word_id = word.split(":")
        _, text_id_prev, block_id_prev, _, sentence_id_prev, _, word_id_prev = prev_word.split(":")

        if text_id != text_id_prev:
            return None
        
        current = (int(block_id), int(sentence_id), int(word_id))
        previous = (int(block_id_prev), int(sentence_id_prev), int(word_id_prev))
        
        if current == previous:
            return None  # same word, not a regression
        
        return current > previous
 
    def _check_if_sentence_forward(self, sentence, prev_sentence):
        _, text_id, block_id, _, sentence_id = sentence.split(":")
        _, text_id_prev, block_id_prev, _, sentence_id_prev = prev_sentence.split(":")

        if text_id != text_id_prev:
            return None
        
        current = (int(block_id), int(sentence_id))
        previous = (int(block_id_prev), int(sentence_id_prev))

        if current == previous:
            return None  # same sentence, not a regression
        
        return current > previous

    def _merge_current_fixation_with_last_fixation(self, index_write, word_write, current_term_span_collector):

        current_term_time_collector = self.term_time_collector[index_write][word_write]

        # If the word was never actually fixated (initialized as skipped by _update_prior_words_with_measure),
        # there is nothing to merge into — treat this as a first fixation instead
        if not current_term_time_collector["fixation_group_numbers"]:
            self.term_time_collector[index_write][word_write]["fixation_duration"] = current_term_span_collector["fixation_duration"]
            self.term_time_collector[index_write][word_write]["first_time"] = current_term_span_collector["first_time"]
            self.term_time_collector[index_write][word_write]["last_time"] = current_term_span_collector["last_time"]
            self.term_time_collector[index_write][word_write]["fixation_count"] = 1
            self.term_time_collector[index_write][word_write]["timestamps"] = [str(current_term_span_collector["first_time"]) + ' - ' + str(current_term_span_collector["last_time"])]
            self.term_time_collector[index_write][word_write]["time_to_first_fixation"] = current_term_span_collector["time_to_first_fixation"]
            self.term_time_collector[index_write][word_write]["first_fixation_duration"] = current_term_span_collector["fixation_duration"]
            self.term_time_collector[index_write][word_write]["average_fixation_duration"] = current_term_span_collector["fixation_duration"]
            self.term_time_collector[index_write][word_write]["all_fixation_durations"] = [current_term_span_collector["fixation_duration"]]
            self.term_time_collector[index_write][word_write]["fixation_group_numbers"] = [current_term_span_collector["fixation_group_numbers"]]
            self.term_time_collector[index_write][word_write]["first_pass_duration"] = current_term_span_collector["fixation_duration"]
            self.term_time_collector[index_write][word_write]["first_pass_fixation_group_numbers"] = [current_term_span_collector["fixation_group_numbers"]]
            self.term_time_collector[index_write][word_write]["first_pass_fixation_count"] = 1
            return

        self.term_time_collector[index_write][word_write]["fixation_duration"] += current_term_span_collector["fixation_duration"]
        self.term_time_collector[index_write][word_write]["last_time"] = current_term_span_collector["last_time"]


        last_index = len(current_term_time_collector["timestamps"]) - 1
        fixation_timestamp_before = current_term_time_collector["timestamps"][last_index]
        first_time_before = fixation_timestamp_before.split(" - ")[0]
        update_timestamp = str(first_time_before) + ' - ' + str(current_term_span_collector["last_time"])

        self.term_time_collector[index_write][word_write]["timestamps"][last_index] = update_timestamp

        last_index = len(current_term_time_collector["all_fixation_durations"]) - 1
        fixation_duration_before = current_term_time_collector["all_fixation_durations"][last_index]
        update_fixation_duration = fixation_duration_before + current_term_span_collector["fixation_duration"]
        self.term_time_collector[index_write][word_write]["all_fixation_durations"][last_index] = update_fixation_duration

        if last_index == 0:
            self.term_time_collector[index_write][word_write]["first_fixation_duration"] = update_fixation_duration

        self._update_average_fixation_duration(index_write, word_write)

    def _update_average_fixation_duration(self, index_write, word_write):
        all_fixation_durations = self.term_time_collector[index_write][word_write]["all_fixation_durations"]
        if all_fixation_durations:
            sum = np.sum(all_fixation_durations)
        else:
            sum = 0
        if len(all_fixation_durations) != 0:
            avg = (sum / len(all_fixation_durations))
        else:
            avg = 0
        self.term_time_collector[index_write][word_write]["average_fixation_duration"] = avg

    def _update_prior_words_with_measure(self, measure_label, word_index, sentence_number, words_indices_in_this_sentence, measure_value):
        for word_index_in_sentence in words_indices_in_this_sentence:
            if word_index_in_sentence == word_index:
                break

            word_update = self.words_index.get(word_index_in_sentence) # find if index mapped to an actual word? but then doesnt the index assume it's global??
            if not word_update:
                continue
            
            if word_index_in_sentence not in self.term_time_collector.keys():
                self.term_time_collector[word_index_in_sentence] = {}

            if word_update not in self.term_time_collector[word_index_in_sentence]:
                self.term_time_collector[word_index_in_sentence][word_update] = {
                    "word": word_update,
                    "token_id": word_index_in_sentence,
                    "fixation_duration": 0,
                    "first_time": None,
                    "last_time": None,
                    "fixation_count": 0,
                    "sentence_number": sentence_number,
                    "timestamps": [],
                    "time_to_first_fixation": None,
                    "first_fixation_duration": None,
                    "average_fixation_duration": 0,
                    "all_fixation_durations": [],
                    "fixation_group_numbers": [],
                    "first_pass_duration": 0,
                    "first_pass_fixation_group_numbers": [],
                    "first_pass_fixation_count": 0,
                    "progressive_fixation_sum": 0,
                    "progressive_fixation_count": 0,
                    "progressive_duration": 0,
                    "within_sentence_reread_sum": 0,
                    "within_sentence_reread_count": 0,
                    "rereading_duration": 0,
                    "lookback_sum": 0,
                    "lookback_count": 0,
                    "lookback_duration": 0,
                    "refixation_rate": 0,
                }

            if measure_label not in self.term_time_collector[word_index_in_sentence][word_update]:
                self.term_time_collector[word_index_in_sentence][word_update][measure_label] = measure_value

    def _delete_fixations_under_threshold(self, object, time_now_ms, window_seconds, threshold=FIXATION_THRESHOLD):

        now_ms = time_now_ms
        window_start = now_ms - (window_seconds * 1000)

        term_time_collector_copy = {}

        for word_id in reversed(object):
            last_time = list(object[word_id].values())[0]['last_time']
            if last_time is not None and last_time >= window_start:
                term_time_collector_copy[word_id] = json.loads(json.dumps(object[word_id]))

        for word_index in term_time_collector_copy.keys():
            for word in term_time_collector_copy[word_index].keys():
                word_object = term_time_collector_copy[word_index][word]
                durations = word_object["all_fixation_durations"]
                
                if durations:
                    indices_to_remove = [k for k, d in enumerate(durations) if d < threshold]

                    for key in reversed(indices_to_remove):
                        fixation_duration = durations[key]
                        fixation_number = word_object["fixation_group_numbers"][key]
                        fixation_timespan = word_object["timestamps"][key]
                        first_time = fixation_timespan.split(" - ")[0]
                        last_time = fixation_timespan.split(" - ")[1]

                        fixation_first_pass_index = None
                        if word_object["first_pass_fixation_group_numbers"]:
                            fixation_first_pass_index = next(
                                (k for k, v in enumerate(word_object["first_pass_fixation_group_numbers"]) if v == fixation_number),
                                None
                            )

                        term_time_collector_copy[word_index][word]["fixation_duration"] -= fixation_duration
                        term_time_collector_copy[word_index][word]["fixation_count"] -= 1
                            
                        del term_time_collector_copy[word_index][word]["all_fixation_durations"][key]
                        del term_time_collector_copy[word_index][word]["fixation_group_numbers"][key]
                        del term_time_collector_copy[word_index][word]["timestamps"][key]

                        if key == 0:
                            term_time_collector_copy[word_index][word]["first_fixation_duration"] = 0
                            
                        if str(word_object["first_time"]) == first_time:
                            term_time_collector_copy[word_index][word]["first_time"] = None

                        if str(word_object["last_time"]) == last_time:
                            term_time_collector_copy[word_index][word]["last_time"] = None

                        if fixation_first_pass_index is not None:
                            term_time_collector_copy[word_index][word]["first_pass_duration"] -= fixation_duration
                            if term_time_collector_copy[word_index][word]["first_pass_fixation_group_numbers"]:
                                del term_time_collector_copy[word_index][word]["first_pass_fixation_group_numbers"][fixation_first_pass_index]
                            
                        if len(term_time_collector_copy[word_index][word]["all_fixation_durations"]) == 0:
                            term_time_collector_copy[word_index][word]["time_to_first_fixation"] = 0
                            term_time_collector_copy[word_index][word]["selective_regression_path_duration"] = 0
                            term_time_collector_copy[word_index][word]["regression_path_duration"] = 0
                            term_time_collector_copy[word_index][word]["re_reading_duration"] = 0
                            term_time_collector_copy[word_index][word]["first_pass_regression"] = 0

                        all_fixation_durations = term_time_collector_copy[word_index][word]["all_fixation_durations"]
                        arr = all_fixation_durations
                        total = sum(arr)
                        avg = (total / len(arr)) if len(arr) > 0 else 0
                        term_time_collector_copy[word_index][word]["average_fixation_duration"] = avg
                        self.fixation_counter -= 1

        return term_time_collector_copy

    def _ripa(self, pupil_diameter, pupil_affected):

        self.ripa_pupil_buffer.append(pupil_diameter)

        if len(self.ripa_pupil_buffer) < (2 * RIPA_VLF_WINDOW + 1):
            return None
        
        buffer_array = np.asarray(self.ripa_pupil_buffer)

        vlf_window = buffer_array[-(2 * RIPA_VLF_WINDOW + 1):]
        sg_vlf = np.dot(self.ripa_vlf_coeffs, vlf_window)

        lf_window = buffer_array[-(RIPA_DELTA + (2*RIPA_LF_WINDOW+1)) : - RIPA_DELTA]
        sg_lf = np.dot(self.ripa_lf_coeffs, lf_window)

        ripa2_score = np.clip(sg_lf**2 - sg_vlf**2, RIPA_MIN_VALUE, RIPA_MAX_VALUE)

        if pupil_affected:
            return

        return ripa2_score
    
    def _build_blink_objects(self, ts):

        # if we are not in a blink, we start a new blink object
        if not self.prev_is_blink:
            self.prev_is_blink = True
            self.blink_counter += 1
            
            # add start ts to current blink object
            self.blink_objects[self.blink_counter] = {}
            self.blink_objects[self.blink_counter]["Start time"] = self.prev_ts_blinks # set prev ts invalid to start time since end time is curr event (to have an accurate range of events?)

        # if we are in a blink, we update the end time of the current blink object
        self.blink_objects[self.blink_counter]["End time"] = ts

    def _calculate_blink_metrics(self, ts):

        # calculate blink duration
        self.blink_objects[self.blink_counter]["Duration"] = self.blink_objects[self.blink_counter]["End time"] - self.blink_objects[self.blink_counter]["Start time"]
        self.blink_objects[self.blink_counter]["Blink rate"] = self.blink_counter / (ts - self.first_timestamp) * 1000 * 60

    def _separate_noise_from_blink(self, blink_object):
        # if duration is outside the endogenous blink duration range, it is noise
        if blink_object["Duration"] < 150 or blink_object["Duration"] > 400:
            noise_object = self.blink_objects.pop(self.blink_counter)
            noise_object.pop("Blink rate", None)
            self.blink_counter -= 1
            self.noise_counter += 1
            self.noise_objects[self.noise_counter] = noise_object
            
        #     print("Noise number ", self.noise_counter, " detected! Duration:", noise_object["Duration"], "ms")

        # else:
        #     print("Blink number ", self.blink_counter, " detected! Duration:", blink_object["Duration"], "ms")

    def submit_data_cognitive_load(self, time_now_ms, window_seconds):
        words_fixations = self._delete_fixations_under_threshold(self.term_time_collector, time_now_ms, window_seconds=window_seconds)
        running_time_s = (time_now_ms - self.start_time_ms) / 1000 
        words_saccades = self._saccades_in_window(self.text_saccades_collector, time_now_ms, window_seconds=window_seconds)
        blinks = self._blinks_in_window(self.blink_objects, time_now_ms, window_seconds=window_seconds)
        fixations = self._fixations_in_window(self.fixations, time_now_ms, window_seconds=window_seconds)

        postData = {
            "recording": self.recording_id,
            "words": words_fixations,
            "fixations": fixations, 
            "running_time_s": running_time_s,
            "start_time_ms": self.start_time_ms,
            "current_time_ms": time_now_ms,
            "saccades": words_saccades,
            "blink_objects": blinks
        }

        return postData
    
    def submit_data_reading_style(self, time_now_ms, window_seconds):
        window_start = time_now_ms - (window_seconds * 1000)

        progressive_duration = []
        rereading_duration = []
        lookback_duration = []
        refixation_rate = []

        for word_index in self.term_time_collector:
            for word in self.term_time_collector[word_index]:
                w = self.term_time_collector[word_index][word]

                word_in_window = False

                # Check if any fixation on this word falls within the current window
                for _, timestamp in enumerate(w["timestamps"]):
                    end_time = float(timestamp.split(" - ")[1])
                    if end_time >= window_start:
                        word_in_window = True

                    if word_in_window:
                        # Only include words which have a fixation of the relevant type
                        if w["progressive_duration"] > 0:
                            progressive_duration.append(w["progressive_duration"])
                        if w["rereading_duration"] > 0:
                            rereading_duration.append(w["rereading_duration"])
                        if w["lookback_duration"] > 0:
                            lookback_duration.append(w["lookback_duration"])

                        # Include all words so that the mean gives the proportion of the words that were refixated
                        refixation_rate.append(w["refixation_rate"])

        postData = {
            "recording": self.recording_id,
            "progressive_duration": progressive_duration,
            "rereading_duration": rereading_duration,
            "lookback_duration": lookback_duration,
            "refixation_rate": refixation_rate
        }
    
        return postData

    def submit_data_ripa2_score(self, time_now_ms, window_seconds):
        return self._ripa_in_window(self.ripa2_scores_collector, time_now_ms, window_seconds=window_seconds)

    def _saccades_in_window(self, object, time_now_ms, window_seconds):
        window_start = time_now_ms - (window_seconds * 1000)

        saccades_collector_copy = {}

        for word_id in reversed(object):
            last_time = list(object[word_id].values())[1][0]["end_time"]
            if last_time is not None and last_time >= window_start:
                saccades_collector_copy[word_id] = json.loads(json.dumps(object[word_id]))

        return saccades_collector_copy
    
    def _blinks_in_window(self, object, time_now_ms, window_seconds):
        now_ms = time_now_ms
        window_start = now_ms - (window_seconds * 1000)

        blinks_collector_copy = {}

        for word_id in reversed(object):
            if "Duration" in object[word_id].keys():
                last_time = object[word_id]["End time"]
                if last_time is not None and last_time >= window_start:
                    blinks_collector_copy[word_id] = json.loads(json.dumps(object[word_id]))

        return blinks_collector_copy

    def _fixations_in_window(self, object, time_now_ms, window_seconds):
        now_ms = time_now_ms
        window_start = now_ms - (window_seconds * 1000)

        fixations_collector_copy = []

        for word_id in reversed(object):
            last_time = word_id["end_time"]
            if last_time is not None and last_time >= window_start:
                fixations_collector_copy.append(json.loads(json.dumps(word_id)))

        return fixations_collector_copy
    
    def _ripa_in_window(self, object, time_now_ms, window_seconds):
        now_ms = time_now_ms
        window_start = now_ms - (window_seconds * 1000)

        ripa2_collector_copy = []

        for time in reversed(object.keys()):
            if time >= window_start:
                ripa2_collector_copy.append(json.loads(json.dumps(object[time])))

        return ripa2_collector_copy

    @staticmethod
    def _hampel_filter (data, window_size=20, n_sigma=3.0) :
        data = np.array(data, dtype=np.float32)
        half_window = window_size // 2
        
        median = np.median(data)
        mad = np.median(np.abs(data - median))
        threshold = n_sigma * 1.4826 * mad

        if abs(data[half_window] - median) > threshold:
            data[half_window] = median
            return median

        return data[half_window]

    @staticmethod
    def _average_display_area(row, vl, vr):
        lx = SCREEN_WIDTH * row['left_gaze_point_on_display_area_0'] #float
        ly = SCREEN_HEIGHT * row['left_gaze_point_on_display_area_1']    
        rx = SCREEN_WIDTH * row['right_gaze_point_on_display_area_0']
        ry = SCREEN_HEIGHT * row['right_gaze_point_on_display_area_1']
        if vl == 'Valid' and vr == 'Invalid':
            return lx, ly
        if vl == 'Invalid' and vr == 'Valid':
            return rx, ry
        return (lx + rx) / 2, (ly + ry) / 2
    
    @staticmethod
    def _average_usc(row, vl, vr, kind):
        coordinates = []
        for axis in range(3):
            la = row[f'left_{kind}_in_user_coordinate_system_{axis}']
            ra = row[f'right_{kind}_in_user_coordinate_system_{axis}']
            if vl == 'Valid' and vr == 'Invalid':
                coordinates.append(la)
            elif vl == 'Invalid' and vr == 'Valid':
                coordinates.append(ra)
            else:
                coordinates.append((la + ra) / 2)
        return(coordinates)
    
    @staticmethod
    def _average_pupil(row, vl, vr):
        ld = row['left_pupil_diameter']
        rd = row['right_pupil_diameter']
        if vl == 'Valid' and vr == 'Invalid':
            return ld
        if vl == 'Invalid' and vr == 'Valid':
            return rd
        return (ld + rd) / 2
