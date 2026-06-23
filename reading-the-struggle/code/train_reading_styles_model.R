
# 1 - Setup
rm(list = ls())
library(tidyverse)
library(cluster)

# 2 - Configuration
FIXATION_THRESHOLD <- 200     # Minimum number of fixations per participant

# 3 - Load and Filter Eye Tracking Data (MECO L2)
load("data/raw/joint_data_l2_trimmed_version2.0.rda")
# remove all English speakers
joint.data <- joint.data %>% filter(lang != "en")

# 4 - Trim Outliers (Fixation duration and count)
# keep 80ms or longer fixations or those with NA duration
joint.data <- joint.data %>% filter(dur > 80 | is.na(dur))

# Per-participant 99th percentile cap for duration
# create crit data frame with uniformID and dur.crit columns, where dur.crit is the 99th percentile of dur for each uniform_id
crit <- joint.data %>% group_by(uniform_id) %>% summarise(dur.crit = quantile(dur, 0.99, na.rm = TRUE), .groups = "drop")

# merge crit back to joint.data
# keep skipped or dur less than dur.crit
# keep skipped or nfix less than or equal to 99th percentile of nfix for each uniform_id
joint.data <- left_join(joint.data, crit, by = "uniform_id") %>% filter(skip == 1 | dur < dur.crit) %>% filter(skip == 1 | nfix <= quantile(nfix, 0.99, na.rm = TRUE))
# create nfix.inc column where NA values in nfix are replaced with 0
joint.data$nfix.inc <- ifelse(is.na(joint.data$nfix), 0, joint.data$nfix)

# 5 - Gaze Features 
# fixation check has the total number of fixations for each participant 
fixation_check <- joint.data %>% group_by(uniform_id) %>% summarise(nfix_total = sum(nfix.inc, na.rm = TRUE), .groups = "drop")

# refix: same-word refixation rate
# by.sub has one row per participant with columns uniform_id, lang, refix (mean) and nfix_total
by.sub <- joint.data %>% group_by(uniform_id) %>% summarise(lang = unique(lang), refix = mean(refix, na.rm = TRUE), .groups = "drop")
# merge fixation check with by.sub
by.sub <- by.sub %>% left_join(fixation_check, by = "uniform_id")

# 8 - Apply Participant-Level Filters
# removing all participants with fewer than FIXATION_THRESHOLD total fixations
by.sub <- by.sub %>% filter(nfix_total > FIXATION_THRESHOLD)

# 9 - Z-Scoring 
# function that takes vector x and returns a z-scored vector
# if all values in x are NA, returns a vector of NA of the same length as x
# same if the standard deviation of x is 0
safe_scale <- function(x) {
  if (all(is.na(x))) return(rep(NA, length(x)))
  if (sd(x, na.rm = TRUE) == 0) return(rep(0, length(x)))
  as.numeric(scale(x))
}
# creates a new z-scored column for refix
by.sub <- by.sub %>% mutate(refix_z = safe_scale(refix))

# 10 - Lookback Features
load("data/raw/joint_data_l2_trimmed_version2.0.rda")
# lookback variable that is 1 if regression and 0 if progression
# compares sentence and word numbers of the current fixation with the previous fixation
joint.data <- joint.data %>% filter(!is.na(wordnum), !is.na(sentnum)) %>% group_by(uniform_id, trialnum) %>% mutate(fixation_order = row_number()) %>% arrange(uniform_id, trialnum, fixation_order) %>% mutate( prev_sent = lag(sentnum), prev_word = lag(wordnum), lookback = case_when(!is.na(prev_sent) & sentnum < prev_sent ~ 1, !is.na(prev_sent) & sentnum == prev_sent & !is.na(prev_word) & wordnum < prev_word ~ 1, TRUE ~ 0)) %>% ungroup()

# lookback features per participant - mean duration of progression fixations, mean duration of regression fixations, mean duration of lookback fixations, count of regression fixations, count of lookback fixations
# z-score feature of prog, reread and lookback durations are calculated using the safe_scale function
hyona_features <- joint.data %>% group_by(uniform_id) %>% summarise(prog_dur = mean(firstrun.dur, na.rm = TRUE), reread_dur = mean(dur[reread == 1 & !is.na(dur)], na.rm = TRUE), lookback_dur = mean(dur[lookback == 1 & !is.na(dur)], na.rm = TRUE), reread_count = sum(reread == 1, na.rm = TRUE), lookback_count = sum(lookback == 1, na.rm = TRUE), .groups = "drop") %>% mutate(prog_z = safe_scale(prog_dur), reread_z = safe_scale(reread_dur), lookback_z = safe_scale(lookback_dur))
# merge lookback features with by.sub
by.sub <- by.sub %>% left_join(hyona_features, by = "uniform_id")

# 11 - Select Final Features 
selected_features <- by.sub %>% select(
  uniform_id,
  prog_dur, reread_dur, lookback_dur,
  prog_z, reread_z, lookback_z,
  refix
)

# 12 - K-means Model
features <- selected_features %>% select(prog_z, reread_z, lookback_z, refix)

# removes rows with NA or inificite values
clean_idx <- which(rowSums(is.na(features) | !is.finite(as.matrix(features))) == 0)
# a new dataframe of clean selecte features
features_clean <- features[clean_idx, ]

# random seed
set.seed(42)
# 3 clusters and 25 random starts
k3_model <- kmeans(features_clean, centers = 3, nstart = 25)

# 13 - Save Model and Parameters
dir.create("data/models", recursive = TRUE, showWarnings = FALSE)
# save(k3_model, file = "data/models/kmeans_k3_model.rda")
write.csv(k3_model$centers, "data/models/kmeans_centers.csv", row.names = FALSE)

scaling_params <- selected_features %>% summarise(prog_dur_mean = mean(prog_dur, na.rm = TRUE), prog_dur_sd = sd(prog_dur, na.rm = TRUE), reread_dur_mean = mean(reread_dur, na.rm = TRUE), reread_dur_sd = sd(reread_dur, na.rm = TRUE), lookback_dur_mean = mean(lookback_dur, na.rm = TRUE), lookback_dur_sd = sd(lookback_dur, na.rm = TRUE), refix_mean = mean(refix, na.rm = TRUE), refix_sd = sd(refix, na.rm = TRUE))
# save(scaling_params, file = "data/models/scaling_params.rda")
write.csv(scaling_params, "data/models/scaling_params.csv", row.names = FALSE)
