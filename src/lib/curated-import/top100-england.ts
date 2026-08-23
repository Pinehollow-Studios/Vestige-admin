/**
 * "Vestige's Top 100 England" - a blended consensus, not a copy of any one
 * publisher's list.
 *
 * The order is no longer written down here. It is *computed*, on load, by
 * `ranking-import/blend.ts` from the published source rankings in that folder;
 * this file supplies only the presentation layer - which name and county we
 * show for each club - because the sources publish neither. Facts derived,
 * presentation curated.
 *
 * Until 2026-08-23 the order was a hand-committed constant. It could not be
 * reproduced or re-run, and two errors had gone unnoticed inside it for exactly
 * that reason: the method described in this docstring (length-normalised
 * Borda) was not the method the numbers actually reflected, and the stated
 * corroboration figures were wrong - it claimed four single-source entries and
 * named Northamptonshire County as one, when in truth ten rested on a single
 * source and Northamptonshire County was in both. `blend.ts` carries the full
 * account. The lesson worth keeping: a ranking nobody can re-run is a ranking
 * nobody can check.
 *
 * **Copyright.** Reproducing a single publisher's exact compiled order or
 * selection risks their asserted copyright and UK database right over that
 * compilation (checked: top100golfcourses.com's terms explicitly prohibit
 * reproduction without written permission, with no attribution exemption).
 * Averaging facts - rank positions - from independent sources into an original
 * derived order is a materially different, and standard, practice, and it rests
 * on three genuine sources again. For a period the "Top100GolfCourses" vote was
 * this very file being fed back into `score.ts` as though it were an
 * independent capture, because the real capture had been deleted from the tree;
 * it is restored at `ranking-import/top100golfcourses.ts`, which explains why
 * holding the input is consistent with this reasoning rather than against it.
 *
 * **One entry per CLUB, not per individual course** - Old/New/Red/Blue/East/
 * West siblings (Sunningdale, Walton Heath, Wentworth, Saunton, The Berkshire,
 * Woburn) collapse to a single ranked slot, since most of these clubs exist as
 * one row in the course catalogue and the app has no per-course disambiguation
 * at play-tracking time yet.
 *
 * **Corroboration.** 86 of the 100 appear in all three sources, 7 in two, and 7
 * in one. Those last are not silently demoted by hand as they were before - an
 * absence is imputed and weighted, see `MISSING_SOURCE_WEIGHT` in `blend.ts`,
 * which is the single dial governing where they land.
 *
 * **Known limitation.** Two of the three sources stop at 100 clubs (93 each
 * after sibling collapse), so from roughly rank 95 downwards this list is
 * Today's Golfer alone - the last four entries rest on it single-handed. No
 * weighting fixes that; only a fourth source reaching past 100 would.
 *
 * Used by `BulkImportPanel` as the one-click seed for a curated list; the panel
 * also accepts pasted CSV/plain-text for any future top-N list.
 *
 * `top100_england_golf_courses.{csv,json}` at the repo root are exports of this
 * list, generated for sharing and deliberately not committed - this module is
 * the source of truth, and they go stale the moment the blend is re-run.
 */

import type { ImportInputRow } from "./match";
import { blendClubs } from "@/lib/ranking-import/blend";

type ClubPresentation = { name: string; location: string };

/**
 * Display name and county per club, keyed by `blend.ts`'s `clubKey`. Covers
 * comfortably more than 100 clubs so that a change to the blend's weighting
 * promotes a club with a proper name rather than a raw source string.
 */
const CLUB_DIRECTORY: Record<string, ClubPresentation> = {
  "royal st georges": { name: "Royal St George's Golf Club", location: "Kent, United Kingdom" },
  sunningdale: { name: "Sunningdale Golf Club", location: "Berkshire, United Kingdom" },
  "swinley forest": { name: "Swinley Forest Golf Club", location: "Berkshire, United Kingdom" },
  "royal birkdale": { name: "Royal Birkdale Golf Club", location: "Merseyside, United Kingdom" },
  "royal lytham st annes": { name: "Royal Lytham & St Annes Golf Club", location: "Lancashire, United Kingdom" },
  "royal cinque ports": { name: "Royal Cinque Ports Golf Club", location: "Kent, United Kingdom" },
  "st georges hill": { name: "St George's Hill Golf Club (Red & Blue)", location: "Surrey, United Kingdom" },
  "woodhall spa": { name: "Woodhall Spa Golf Club (Hotchkin)", location: "Lincolnshire, United Kingdom" },
  ganton: { name: "Ganton Golf Club", location: "Yorkshire, United Kingdom" },
  "st enodoc": { name: "St Enodoc Golf Club (Church)", location: "Cornwall, United Kingdom" },
  "royal liverpool": { name: "Royal Liverpool Golf Club", location: "Merseyside, United Kingdom" },
  "walton heath": { name: "Walton Heath Golf Club", location: "Surrey, United Kingdom" },
  rye: { name: "Rye Golf Club (Old)", location: "Sussex, United Kingdom" },
  alwoodley: { name: "Alwoodley Golf Club", location: "Yorkshire, United Kingdom" },
  "west sussex": { name: "West Sussex Golf Club", location: "Sussex, United Kingdom" },
  "royal west norfolk": { name: "Royal West Norfolk Golf Club (Brancaster)", location: "Norfolk, United Kingdom" },
  formby: { name: "Formby Golf Club", location: "Merseyside, United Kingdom" },
  "silloth solway": { name: "Silloth on Solway Golf Club", location: "Cumbria, United Kingdom" },
  notts: { name: "Hollinwell (Notts Golf Club)", location: "Nottinghamshire, United Kingdom" },
  saunton: { name: "Saunton Golf Club", location: "Devon, United Kingdom" },
  berkshire: { name: "The Berkshire Golf Club", location: "Berkshire, United Kingdom" },
  woking: { name: "Woking Golf Club", location: "Surrey, United Kingdom" },
  "hankley common": { name: "Hankley Common Golf Club", location: "Surrey, United Kingdom" },
  hillside: { name: "Hillside Golf Club", location: "Merseyside, United Kingdom" },
  "burnham berrow": { name: "Burnham & Berrow Golf Club (Championship)", location: "Somerset, United Kingdom" },
  wentworth: { name: "Wentworth Club", location: "Surrey, United Kingdom" },
  hunstanton: { name: "Hunstanton Golf Club", location: "Norfolk, United Kingdom" },
  princes: { name: "Prince's Golf Club", location: "Kent, United Kingdom" },
  "west lancashire": { name: "West Lancashire Golf Club", location: "Merseyside, United Kingdom" },
  worplesdon: { name: "Worplesdon Golf Club", location: "Surrey, United Kingdom" },
  addington: { name: "The Addington Golf Club", location: "Greater London, United Kingdom" },
  liphook: { name: "Liphook Golf Club", location: "Hampshire, United Kingdom" },
  parkstone: { name: "Parkstone Golf Club", location: "Dorset, United Kingdom" },
  "west hill": { name: "West Hill Golf Club", location: "Surrey, United Kingdom" },
  broadstone: { name: "Broadstone Golf Club", location: "Dorset, United Kingdom" },
  jcb: { name: "JCB Golf & Country Club", location: "Staffordshire, United Kingdom" },
  moortown: { name: "Moortown Golf Club", location: "Yorkshire, United Kingdom" },
  wallasey: { name: "Wallasey Golf Club", location: "Merseyside, United Kingdom" },
  hindhead: { name: "Hindhead Golf Club", location: "Surrey, United Kingdom" },
  "southport ainsdale": { name: "Southport & Ainsdale Golf Club", location: "Merseyside, United Kingdom" },
  "royal ashdown forest": { name: "Royal Ashdown Forest Golf Club (Old)", location: "Sussex, United Kingdom" },
  "sherwood forest": { name: "Sherwood Forest Golf Club", location: "Nottinghamshire, United Kingdom" },
  "new zealand": { name: "New Zealand Golf Club", location: "Surrey, United Kingdom" },
  aldeburgh: { name: "Aldeburgh Golf Club (Championship)", location: "Suffolk, United Kingdom" },
  "beau desert": { name: "Beau Desert Golf Club", location: "Staffordshire, United Kingdom" },
  hayling: { name: "Hayling Golf Club", location: "Hampshire, United Kingdom" },
  "delamere forest": { name: "Delamere Forest Golf Club", location: "Cheshire, United Kingdom" },
  woburn: { name: "Woburn Golf Club", location: "Buckinghamshire, United Kingdom" },
  ferndown: { name: "Ferndown Golf Club (Old)", location: "Dorset, United Kingdom" },
  ipswich: { name: "Ipswich Golf Club (Purdis Heath)", location: "Suffolk, United Kingdom" },
  "royal north devon": { name: "Royal North Devon Golf Club", location: "Devon, United Kingdom" },
  "little aston": { name: "Little Aston Golf Club", location: "Staffordshire, United Kingdom" },
  queenwood: { name: "Queenwood Golf Club", location: "Surrey, United Kingdom" },
  huntercombe: { name: "Huntercombe Golf Club", location: "Oxfordshire, United Kingdom" },
  seacroft: { name: "Seacroft Golf Club", location: "Lincolnshire, United Kingdom" },
  "seaton carew": { name: "Seaton Carew Golf Club (Micklem)", location: "Durham, United Kingdom" },
  trevose: { name: "Trevose Golf & Country Club (Championship)", location: "Cornwall, United Kingdom" },
  goswick: { name: "Goswick Links", location: "Northumberland, United Kingdom" },
  littlestone: { name: "Littlestone Golf Club (Championship)", location: "Kent, United Kingdom" },
  stoneham: { name: "Stoneham Golf Club", location: "Hampshire, United Kingdom" },
  blackmoor: { name: "Blackmoor Golf Club", location: "Hampshire, United Kingdom" },
  "royal worlington newmarket": { name: "Royal Worlington & Newmarket Golf Club", location: "Suffolk, United Kingdom" },
  "bearwood lakes": { name: "Bearwood Lakes Golf Club", location: "Berkshire, United Kingdom" },
  "east devon": { name: "East Devon Golf Club", location: "Devon, United Kingdom" },
  perranporth: { name: "Perranporth Golf Club", location: "Cornwall, United Kingdom" },
  tandridge: { name: "Tandridge Golf Club", location: "Surrey, United Kingdom" },
  blackwell: { name: "Blackwell Golf Club", location: "Worcestershire, United Kingdom" },
  "coombe hill": { name: "Coombe Hill Golf Club", location: "Greater London, United Kingdom" },
  grove: { name: "The Grove", location: "Hertfordshire, United Kingdom" },
  lindrick: { name: "Lindrick Golf Club", location: "Yorkshire, United Kingdom" },
  "camberley heath": { name: "Camberley Heath Golf Club", location: "Surrey, United Kingdom" },
  "remedy oak": { name: "Remedy Oak Golf Club", location: "Dorset, United Kingdom" },
  "hadley wood": { name: "Hadley Wood Golf Club", location: "Greater London, United Kingdom" },
  kington: { name: "Kington Golf Club", location: "Herefordshire, United Kingdom" },
  cavendish: { name: "Cavendish Golf Club", location: "Derbyshire, United Kingdom" },
  "knole park": { name: "Knole Park Golf Club", location: "Kent, United Kingdom" },
  piltdown: { name: "Piltdown Golf Club", location: "Sussex, United Kingdom" },
  ashridge: { name: "Ashridge Golf Club", location: "Hertfordshire, United Kingdom" },
  woodbridge: { name: "Woodbridge Golf Club", location: "Suffolk, United Kingdom" },
  wisley: { name: "The Wisley Golf Club", location: "Surrey, United Kingdom" },
  "isle purbeck": { name: "Isle of Purbeck Golf Club (Purbeck)", location: "Dorset, United Kingdom" },
  "royal wimbledon": { name: "Royal Wimbledon Golf Club", location: "Greater London, United Kingdom" },
  "cleeve hill": { name: "Cleeve Hill Golf Club", location: "Gloucestershire, United Kingdom" },
  "sutton coldfield": { name: "Sutton Coldfield Golf Club", location: "Birmingham, United Kingdom" },
  "north hants": { name: "North Hants Golf Club", location: "Hampshire, United Kingdom" },
  sheringham: { name: "Sheringham Golf Club", location: "Norfolk, United Kingdom" },
  "formby ladies": { name: "Formby Ladies Golf Club", location: "Merseyside, United Kingdom" },
  seascale: { name: "Seascale Golf Club", location: "Cumbria, United Kingdom" },
  prestbury: { name: "Prestbury Golf Club", location: "Cheshire, United Kingdom" },
  "crowborough beacon": { name: "Crowborough Beacon Golf Club", location: "Sussex, United Kingdom" },
  berkhamsted: { name: "Berkhamsted Golf Club", location: "Hertfordshire, United Kingdom" },
  "northamptonshire county": { name: "Northamptonshire County Golf Club", location: "Northamptonshire, United Kingdom" },
  "st annes old": { name: "St Annes Old Links Golf Club", location: "Lancashire, United Kingdom" },
  "st mellion": { name: "St Mellion Golf Club", location: "Cornwall, United Kingdom" },
  thorpeness: { name: "Thorpeness Golf Club", location: "Suffolk, United Kingdom" },
  yelverton: { name: "Yelverton Golf Club", location: "Devon, United Kingdom" },
  "chart hills": { name: "Chart Hills Golf Club", location: "Kent, United Kingdom" },
  fulford: { name: "Fulford Golf Club", location: "Yorkshire, United Kingdom" },
  effingham: { name: "Effingham Golf Club", location: "Surrey, United Kingdom" },
  belfry: { name: "The Belfry (Brabazon)", location: "Warwickshire, United Kingdom" },
  "stoke park": { name: "Stoke Park (Colt & Alison)", location: "Buckinghamshire, United Kingdom" },
  coxmoor: { name: "Coxmoor Golf Club", location: "Nottinghamshire, United Kingdom" },
  "dunstanburgh castle": { name: "Dunstanburgh Castle Golf Course", location: "Northumberland, United Kingdom" },
  "thorndon park": { name: "Thorndon Park Golf Club", location: "Essex, United Kingdom" },
  appleby: { name: "Appleby Golf Club", location: "Cumbria, United Kingdom" },
  denham: { name: "Denham Golf Club", location: "Buckinghamshire, United Kingdom" },
};

const BLENDED = blendClubs().slice(0, 100);

export const TOP100_ENGLAND: ImportInputRow[] = BLENDED.map((entry) => {
  const club = CLUB_DIRECTORY[entry.clubKey];
  return {
    rank: entry.rank,
    name: club?.name ?? entry.sourceName,
    location: club?.location ?? null,
  };
});

/**
 * Which sources put each club where, in the same order as `TOP100_ENGLAND`.
 * Kept alongside the list so corroboration is inspectable data rather than a
 * claim in a comment - the previous docstring's figures were wrong precisely
 * because nothing checked them.
 */
export const TOP100_ENGLAND_PROVENANCE = BLENDED.map((entry) => ({
  rank: entry.rank,
  name: CLUB_DIRECTORY[entry.clubKey]?.name ?? entry.sourceName,
  sourceCount: entry.sourceCount,
  hits: entry.hits.map((hit) => ({ short: hit.short, rank: hit.rank })),
}));
