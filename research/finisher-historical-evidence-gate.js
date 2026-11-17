// Research-only evidence audit for the historical Finisher comparison.
// Summary from Finisher_incremental_value_common_26_races_recovered_2026-11-11.json.
// These 26 results are NOT valid for the new Quirin ROI study: all PASS,
// official outcomes inherited and not independently reverified, and no
// matched per-runner style/Quirin/Finisher score input is supplied.
export const HISTORICAL_FINISHER_EVIDENCE_20261111=Object.freeze({
 source:'Finisher_incremental_value_common_26_races_recovered_2026-11-11.json',
 races:26,tracks:['Finger Lakes','Churchill Downs','Belmont Park'],
 rr:{wins:7,runnerUpInTopTwo:10,exactaBoxes:5},
 finisher:{wins:8,runnerUpInTopTwo:5,exactaBoxes:2},
 allRacesPASS:true,officialOutcomesIndependentlyVerified:false,
 matchedPreRaceStyleQuirinAndScores:false,exactaPayoutsVerified:false
});
export function assessHistoricalFinisherEvidence(e=HISTORICAL_FINISHER_EVIDENCE_20261111){
 const missing=[];
 if(e.allRacesPASS)missing.push('ALL_RACES_PASS');
 if(!e.officialOutcomesIndependentlyVerified)missing.push('RESULTS_NOT_INDEPENDENTLY_VERIFIED');
 if(!e.matchedPreRaceStyleQuirinAndScores)missing.push('NO_MATCHED_PACE_INPUTS');
 if(!e.exactaPayoutsVerified)missing.push('NO_VERIFIED_EXACTA_PAYOUTS');
 return {racesReviewed:e.races,baselineRR:e.rr,baselineFinisher:e.finisher,
  secondPlaceTopTwoDifference:e.finisher.runnerUpInTopTwo-e.rr.runnerUpInTopTwo,
  eligibleForQuirinOutcomeBacktest:missing.length===0,missing,
  quirinSecondPlaceLift:null,quirinExactaROILift:null,researchOnly:true};
}
