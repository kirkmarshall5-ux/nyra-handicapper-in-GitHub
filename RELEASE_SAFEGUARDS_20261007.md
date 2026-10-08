# Shared condition parsing and verified figure safeguards

The existing zero-preserving, uncapped source-verified scorer is retained. This release adds one condition parser shared by the release/research PP path and legacy parser. Mile-and-70-yard races remain eligible; quarter-horse, hurdle and steeplechase races remain excluded. Scheduled surface comes from the primary distance line, with alternate Tapeta wording recorded separately. Unreadable conditions block full ranking.

Previously saved PP cards keep their identity and runners and require re-upload to verify their conditions under the new parser. Import asset versions, parser ID and release ID are updated. Synthetic figure context uses the same surface label as scheduled conditions. Race par is not a horse figure or scoring input.

Validation: 114 regression tests passed. Fifteen complete source-PDF roundtrips covered 138 races and 1,345 runners, with 95 rateable races and 43 passes; no identity, morning-line, figure or ranking mismatches against the corrected control. All 102 additional stored race headers matched corrected eligibility/surface metadata. The actual Knightsbridge 122 figure remained accepted. No connection weights or minimum-sample policy, probability model, context bonuses or betting permissions changed.

Historical frozen datasets remain unchanged. Best Value and automated betting remain disabled pending probability validation.
