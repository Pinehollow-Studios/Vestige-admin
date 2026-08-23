/**
 * top100golfcourses.com's Top 100 England (top100golfcourses.com/top-100-golf-courses-of-england),
 * captured 2026-08-18. One of three ranking sources feeding the Vestige Index
 * `ranking` axis and the blended order in `blend.ts`.
 *
 * Restored 2026-08-23 from `7f50fff^:src/lib/curated-import/top100-england.ts`,
 * where it had lived as `TOP100_ENGLAND` before that commit repurposed the name
 * for the blended output. Losing it caused two problems at once: the blend
 * silently dropped to two sources, and `score.ts` went on citing
 * "top100golfcourses.com" as a vote while actually being handed the blend —
 * attributing positions to a publisher that never published them.
 *
 * **Why it is safe to hold this here, when it was deleted for copyright.**
 * This publisher's terms prohibit reproducing their compiled list without
 * permission, and that is precisely why nothing here is ever republished. The
 * capture is a computation *input*, held exactly as the Golf Empire and Today's
 * Golfer captures already are; what ships is the derived blend, whose order
 * matches no single source. Deleting the input did not reduce the exposure —
 * it only made the derivation impossible to check, which was worse on every
 * axis including this one. Do not export this constant to the CSV, an API
 * response, or the UI.
 *
 * Stored as a typed constant so the import is reproducible, diffable in git
 * when the list is republished, and needs no live scrape at runtime.
 */

import type { ImportInputRow } from "@/lib/curated-import/match";

export const TOP100_GOLFCOURSES_ENGLAND: ImportInputRow[] = [
  { rank: 1, name: "Royal St George's Golf Club", location: "Kent, United Kingdom" },
  { rank: 2, name: "Sunningdale Golf Club (Old)", location: "Berkshire, United Kingdom" },
  { rank: 3, name: "Sunningdale Golf Club (New)", location: "Berkshire, United Kingdom" },
  { rank: 4, name: "St Enodoc Golf Club (Church)", location: "Cornwall, United Kingdom" },
  { rank: 5, name: "Swinley Forest Golf Club", location: "Berkshire, United Kingdom" },
  { rank: 6, name: "Royal Lytham & St Annes Golf Club", location: "Lancashire, United Kingdom" },
  { rank: 7, name: "Ganton Golf Club", location: "Yorkshire, United Kingdom" },
  { rank: 8, name: "Royal Birkdale Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 9, name: "St George's Hill Golf Club (Red & Blue)", location: "Surrey, United Kingdom" },
  { rank: 10, name: "Royal Cinque Ports Golf Club", location: "Kent, United Kingdom" },
  { rank: 11, name: "West Sussex Golf Club", location: "Sussex, United Kingdom" },
  { rank: 12, name: "Woodhall Spa Golf Club (Hotchkin)", location: "Lincolnshire, United Kingdom" },
  { rank: 13, name: "Rye Golf Club (Old)", location: "Sussex, United Kingdom" },
  { rank: 14, name: "Royal West Norfolk Golf Club (Brancaster)", location: "Norfolk, United Kingdom" },
  { rank: 15, name: "Royal Liverpool Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 16, name: "Walton Heath Golf Club (Old)", location: "Surrey, United Kingdom" },
  { rank: 17, name: "Formby Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 18, name: "Hollinwell", location: "Nottinghamshire, United Kingdom" },
  { rank: 19, name: "Alwoodley Golf Club", location: "Yorkshire, United Kingdom" },
  { rank: 20, name: "Saunton Golf Club (East)", location: "Devon, England" },
  { rank: 21, name: "Silloth on Solway Golf Club", location: "Cumbria, United Kingdom" },
  { rank: 22, name: "The Berkshire Golf Club (Red)", location: "Berkshire, United Kingdom" },
  { rank: 23, name: "Hankley Common Golf Club", location: "Surrey, United Kingdom" },
  { rank: 24, name: "Burnham & Berrow Golf Club (Championship)", location: "Somerset, United Kingdom" },
  { rank: 25, name: "Woking Golf Club", location: "Surrey, United Kingdom" },
  { rank: 26, name: "Hunstanton Golf Club", location: "Norfolk, United Kingdom" },
  { rank: 27, name: "Hillside Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 28, name: "Wentworth Club (West)", location: "Surrey, United Kingdom" },
  { rank: 29, name: "West Lancashire Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 30, name: "The Addington Golf Club", location: "Greater London, United Kingdom" },
  { rank: 31, name: "Liphook Golf Club", location: "Hampshire, United Kingdom" },
  { rank: 32, name: "Prince's Golf Club (Dunes & Himalayas)", location: "Kent, United Kingdom" },
  { rank: 33, name: "Parkstone Golf Club", location: "Dorset, United Kingdom" },
  { rank: 34, name: "Queenwood Golf Club", location: "Surrey, United Kingdom" },
  { rank: 35, name: "Worplesdon Golf Club", location: "Surrey, United Kingdom" },
  { rank: 36, name: "The Berkshire Golf Club (Blue)", location: "Berkshire, United Kingdom" },
  { rank: 37, name: "West Hill Golf Club", location: "Surrey, United Kingdom" },
  { rank: 38, name: "Broadstone Golf Club", location: "Dorset, United Kingdom" },
  { rank: 39, name: "Moortown Golf Club", location: "Yorkshire, United Kingdom" },
  { rank: 40, name: "Wallasey Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 41, name: "Walton Heath Golf Club (New)", location: "Surrey, United Kingdom" },
  { rank: 42, name: "Southport & Ainsdale Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 43, name: "Aldeburgh Golf Club (Championship)", location: "Suffolk, United Kingdom" },
  { rank: 44, name: "Hayling Golf Club", location: "Hampshire, United Kingdom" },
  { rank: 45, name: "Royal Ashdown Forest Golf Club (Old)", location: "Sussex, United Kingdom" },
  { rank: 46, name: "Hindhead Golf Club", location: "Surrey, United Kingdom" },
  { rank: 47, name: "Beau Desert Golf Club", location: "Staffordshire, United Kingdom" },
  { rank: 48, name: "Wentworth Club (East)", location: "Surrey, United Kingdom" },
  { rank: 49, name: "Ferndown Golf Club (Old)", location: "Dorset, United Kingdom" },
  { rank: 50, name: "New Zealand Golf Club", location: "Surrey, United Kingdom" },
  { rank: 51, name: "Goswick Links", location: "Northumberland, United Kingdom" },
  { rank: 52, name: "Delamere Forest Golf Club", location: "Cheshire, United Kingdom" },
  { rank: 53, name: "Saunton Golf Club (West)", location: "Devon, England" },
  { rank: 54, name: "Stoneham Golf Club", location: "Hampshire, United Kingdom" },
  { rank: 55, name: "Royal North Devon Golf Club", location: "Devon, United Kingdom" },
  { rank: 56, name: "Seaton Carew Golf Club (Micklem)", location: "Durham, United Kingdom" },
  { rank: 57, name: "Ipswich Golf Club (Purdis Heath)", location: "Suffolk, United Kingdom" },
  { rank: 58, name: "Sherwood Forest Golf Club", location: "Nottinghamshire, United Kingdom" },
  { rank: 59, name: "Woburn Golf Club (Marquess)", location: "Buckinghamshire, United Kingdom" },
  { rank: 60, name: "Perranporth Golf Club", location: "Cornwall, United Kingdom" },
  { rank: 61, name: "Littlestone Golf Club (Championship)", location: "Kent, United Kingdom" },
  { rank: 62, name: "Trevose Golf & Country Club (Championship)", location: "Cornwall, United Kingdom" },
  { rank: 63, name: "Seacroft Golf Club", location: "Lincolnshire, United Kingdom" },
  { rank: 64, name: "Huntercombe Golf Club", location: "Oxfordshire, United Kingdom" },
  { rank: 65, name: "Kington Golf Club", location: "Herefordshire, United Kingdom" },
  { rank: 66, name: "Little Aston Golf Club", location: "Staffordshire, United Kingdom" },
  { rank: 67, name: "Blackmoor Golf Club", location: "Hampshire, United Kingdom" },
  { rank: 68, name: "Royal Wimbledon Golf Club", location: "Greater London, United Kingdom" },
  { rank: 69, name: "East Devon Golf Club", location: "Devon, United Kingdom" },
  { rank: 70, name: "Tandridge Golf Club", location: "Surrey, United Kingdom" },
  { rank: 71, name: "Stoke Park (Colt & Alison)", location: "Buckinghamshire, United Kingdom" },
  { rank: 72, name: "Hadley Wood Golf Club", location: "Greater London, United Kingdom" },
  { rank: 73, name: "Woburn Golf Club (Duke's)", location: "Buckinghamshire, United Kingdom" },
  { rank: 74, name: "JCB Golf & Country Club", location: "Staffordshire, United Kingdom" },
  { rank: 75, name: "Blackwell Golf Club", location: "Worcestershire, United Kingdom" },
  { rank: 76, name: "Ashridge Golf Club", location: "Hertfordshire, United Kingdom" },
  { rank: 77, name: "Camberley Heath Golf Club", location: "Surrey, United Kingdom" },
  { rank: 78, name: "Sutton Coldfield Golf Club", location: "Birmingham, United Kingdom" },
  { rank: 79, name: "Knole Park Golf Club", location: "Kent, United Kingdom" },
  { rank: 80, name: "Isle of Purbeck Golf Club (Purbeck)", location: "Dorset, United Kingdom" },
  { rank: 81, name: "Seascale Golf Club", location: "Cumbria, United Kingdom" },
  { rank: 82, name: "Lindrick Golf Club", location: "Yorkshire, United Kingdom" },
  { rank: 83, name: "Cavendish Golf Club", location: "Derbyshire, United Kingdom" },
  { rank: 84, name: "Sheringham Golf Club", location: "Norfolk, United Kingdom" },
  { rank: 85, name: "The Wisley (Church & Garden)", location: "Surrey, United Kingdom" },
  { rank: 86, name: "The Grove", location: "Hertfordshire, United Kingdom" },
  { rank: 87, name: "Royal Worlington & Newmarket Golf Club", location: "Suffolk, United Kingdom" },
  { rank: 88, name: "Cleeve Hill Golf Club", location: "Gloucestershire, United Kingdom" },
  { rank: 89, name: "Prestbury Golf Club", location: "Cheshire, England" },
  { rank: 90, name: "Bearwood Lakes Golf Club", location: "Berkshire, United Kingdom" },
  { rank: 91, name: "Formby Ladies Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 92, name: "Yelverton Golf Club", location: "Devon, United Kingdom" },
  { rank: 93, name: "Coombe Hill Golf Club", location: "Greater London, United Kingdom" },
  { rank: 94, name: "Appleby Golf Club", location: "Cumbria, United Kingdom" },
  { rank: 95, name: "North Hants Golf Club", location: "Hampshire, United Kingdom" },
  { rank: 96, name: "Remedy Oak Golf Club", location: "Dorset, United Kingdom" },
  { rank: 97, name: "Crowborough Beacon Golf Club", location: "Sussex, United Kingdom" },
  { rank: 98, name: "Denham Golf Club", location: "Buckinghamshire, United Kingdom" },
  { rank: 99, name: "Dunstanburgh Castle Golf Course", location: "Northumberland, United Kingdom" },
  { rank: 100, name: "Woburn Golf Club (Duchess)", location: "Buckinghamshire, United Kingdom" },
];
