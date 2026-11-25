// Frozen Contender V2 coefficients; display-only research comparison.
export const MODEL = {
  "model_id": "CONTEXT-COMPARISON-V2-MATCHED-TREND",
  "features": [
    "latest_beyer",
    "weighted_recent_five",
    "best_three",
    "same_surface_average",
    "same_surface_distance_average",
    "same_surface_peak_90_days",
    "early_pace",
    "late_pace",
    "pressure_late_fit",
    "surface_win_record",
    "distance_win_record",
    "placing_record",
    "reliable_jockey_rate",
    "reliable_trainer_rate",
    "days_since_verified_latest_start",
    "workout_count_30_days",
    "workout_best_rank_30_days",
    "verified_latest_trip_flag",
    "prior_opposition_proxy"
  ],
  "contender": {
    "coefficients": [
      -0.054290191329057366,
      0.33553361450030394,
      0.29846911551451283,
      0.13087880782999933,
      0.06480736205565067,
      0.05995898014825807,
      0.1786942846201373,
      0.14536183174709905,
      -0.021270138118751808,
      0.19223380550204763,
      -0.007866825861662307,
      0.20048106807181615,
      -0.0071386399388025,
      0.047248768631190534,
      -0.02486759003106791,
      0.14245239386216357,
      0.1808912158087164,
      -0.11396999957418898,
      -0.04543319331753506
    ]
  },
  "contender_overlay": {
    "feature": "surface_distance_matched_beyer_trend",
    "coefficient": 0.1,
    "min_comparable_starts": 3,
    "actual_start_window": 5,
    "surface": "exact current surface",
    "distance_tolerance_furlongs": 0.5,
    "max_age_days": 365,
    "unknown": "neutral zero",
    "scaling": "within-race midrank percentile [-1,1]",
    "scope": "contender head only; original win head unchanged",
    "status": "user-approved future paper research; unvalidated live probability/value"
  }
};
