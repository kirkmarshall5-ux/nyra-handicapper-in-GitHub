import csv,gzip,hashlib,json,pathlib
root=pathlib.Path(__file__).parent;x=json.loads(gzip.decompress((root/'results.json.gz').read_bytes()))
with (root/'summary.csv').open('w') as f:
 rows=[dict(r,slot_hits=json.dumps(r['slot_hits'])) for r in x['summary']];w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
fields=['key','cohort','surface','setup','arm','predicted_order','actual_top4','win','winner4','top4_coverage','exacta','trifecta','superfecta','slot_hits','top4_pairs_correct','underneath_pairs_correct','top4_rank_error']
with (root/'race-comparison.csv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=fields);w.writeheader()
 for r in x['rows']:
  for arm in r['orders']:w.writerow({'key':r['key'],'cohort':r['cohort'],'surface':r['surface'],'setup':r['setup']['type'],'arm':arm,'predicted_order':'-'.join(r['orders'][arm]),'actual_top4':'-'.join(r['actual']),**{k:json.dumps(r['grades'][arm][k]) for k in fields[7:]}})
changed=[r for r in x['rows'] if r['orders']['NO_CONTEXT']!=r['orders']['BOUNDED_REPLACEMENT']]
(root/'changed-races.json').write_text(json.dumps(changed,indent=2)+'\n')
files=['protocol.json','experiment.py','test_experiment.py','prediction-freeze.json.gz','results.json.gz','SUMMARY.json']
(root/'HASHES.json').write_text(json.dumps({f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in files},indent=2)+'\n')
print('saved',len(changed),'changed races')
