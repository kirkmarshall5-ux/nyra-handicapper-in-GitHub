import unittest,json,gzip,pathlib
from audit_drf_sources import parse_call_tokens,history_date,norm,decode_margin

class SourceAuditTests(unittest.TestCase):
 def test_lead_margin_is_not_beaten_margin(self):
  x=parse_call_tokens(['2','1¦','1ô','2§','3ö'],8)
  self.assertEqual(x['first_call']['position'],1)
  self.assertEqual(x['first_call']['margin_kind'],'LEAD_MARGIN')
  self.assertEqual(x['finish']['margin_kind'],'BEATEN_MARGIN')
  self.assertEqual(x['finish']['numeric_margin'],.75)
 def test_nonstandard_rows_abstain(self):
  for words in [['2','3','4','5'],['2','3','4','5','6','7'],['2','3','4','5','DNF'],['2','3','4','5','1011'],['2','3','4','5','1Smith']]:
   self.assertIsNone(parse_call_tokens(words,12))
 def test_position_bounds(self):
  self.assertIsNone(parse_call_tokens(['1','2','3','4','9'],8))
  self.assertIsNone(parse_call_tokens(['0','2','3','4','5'],8))
 def test_source_dates(self):
  self.assertEqual(history_date('11Þ26=8BAQ'),'2026-06-11')
  self.assertIsNone(history_date('31á26=2Aqu'))
  self.assertIsNone(history_date('11X26=8BAQ'))
 def test_country_suffix_keeps_identity(self):
  self.assertEqual(norm('End of Romance (Ire)'),norm('End of Romance'))
  self.assertNotEqual(norm('Moe Eighty Eight'),norm('Moe Eighty'))
 def test_margin_glyphs_preserve_whole_and_fraction(self):
  self.assertEqual(decode_margin('¦¤ô')['numeric_margin'],18.5)
  self.assertEqual(decode_margin('¦¥')['numeric_margin'],10)
  self.assertEqual(decode_margin('¬õ')['numeric_margin'],7.25)
 def test_small_margins_are_labels_not_arbitrary_lengths(self):
  self.assertEqual(decode_margin('Ç')['margin_label'],'HEAD')
  self.assertEqual(decode_margin('É')['margin_label'],'NECK')
  self.assertIsNone(decode_margin('ó')['numeric_margin'])
  self.assertEqual(decode_margin('Z')['margin_status'],'UNRESOLVED')
 def test_saved_source_evidence_retains_bounds_and_unknown_styles(self):
  x=json.loads(gzip.decompress((pathlib.Path(__file__).parent/'source-evidence.json.gz').read_bytes()))
  self.assertEqual(x['holdout_files_used'],0);self.assertEqual(len(x['cards']),25)
  count=reviewed=horses=0
  for c in x['cards']:
   for h in c['horses']:
    horses+=1;self.assertIsNone(h['verified_running_style']);self.assertFalse(h['style_usable_for_pressure'])
    for l in h['source']['historical_lines']:
     self.assertLess(l['date'],c['date'])
     if l['call_tokens']:
      self.assertIsNotNone(parse_call_tokens(l['call_tokens'],l['field_size']));count+=1
     reviewed+=l['positions_reviewed_against_original']
  self.assertEqual(horses,1036);self.assertEqual(count,8268);self.assertEqual(reviewed,25)

if __name__=='__main__':unittest.main()
