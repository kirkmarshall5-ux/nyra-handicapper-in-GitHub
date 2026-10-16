import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');

test('replacing an analyzed card cannot silently load a previously selected PDF',async()=>{
  const binding=html.match(/replaceCard\.onclick=async\(\)=>\{[^\n]+\};/)?.[0];
  assert.ok(binding,'Replace Active Card handler must exist');
  assert.match(html,/pendingCard=candidate;pendingFile=f;/,'analysis binds the candidate to its selected file');
  const oldFile={name:'old.pdf'},newFile={name:'new.pdf'},oldCard={id:'old'};
  let activated=[],loaded=0;
  const context={
    replaceCard:{},
    ppFile:{files:[newFile]},
    ppStatus:{textContent:''},
    pendingCard:oldCard,
    pendingFile:oldFile,
    activateCandidate:c=>activated.push(c),
    loadCandidate:async()=>{loaded++}
  };
  vm.runInNewContext(binding,context);
  await context.replaceCard.onclick();
  assert.equal(activated.length,0,'must not activate stale candidate');
  assert.equal(loaded,0,'must not bypass analysis on mismatched file');
  assert.equal(context.pendingCard,null);
  assert.equal(context.pendingFile,null);
  assert.match(context.ppStatus.textContent,/Analyze the selected file/);
  context.pendingCard=oldCard;
  context.pendingFile=oldFile;
  context.ppFile.files=[oldFile];
  await context.replaceCard.onclick();
  assert.deepEqual(activated,[oldCard],'unchanged file may be activated');
  context.pendingCard=null;
  await context.replaceCard.onclick();
  assert.equal(loaded,1,'without a candidate the selected file must be parsed');
});

test('reset and clear cannot leave stale pending PDF candidates',()=>{
  assert.match(html,/resetSample\.onclick=\(\)=>\{pendingCard=null;pendingFile=null;/);
  assert.match(html,/clearPP\.onclick=\(\)=>\{pendingCard=null;pendingFile=null;/);
  assert.match(html,/catch\(e\)\{console\.error\(e\);pendingCard=null;pendingFile=null;/);
});
