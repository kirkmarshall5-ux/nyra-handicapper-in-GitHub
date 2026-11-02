// DRF-only research gate: reject cross-provider evidence before any model comparison.
// No scoring or production behavior changes.
import { detectPPFormat } from '../pp-format-router.js';

export function requireDrfPages(pages) {
  const format=detectPPFormat(pages);
  if(format!=='DRF') throw Error('DRF-only research: '+format+' card rejected; Brisnet testing is deferred.');
  return format;
}

export function requireDrfCard(card) {
  if(!card || card.source_format!=='DRF') throw Error('DRF-only research requires a DRF source_format card.');
  if(!card.races || !Object.keys(card.races).length) throw Error('DRF-only research requires parsed races.');
  return card;
}
