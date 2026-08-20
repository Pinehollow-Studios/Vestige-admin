/**
 * "Vestige's Top 100 England" - a blended consensus, not a copy of any one
 * publisher's list. Each club's position is derived by averaging its rank
 * (Borda-style, normalised 0-100 regardless of source list length) across
 * three published England rankings: this site's own top100golfcourses.com
 * capture, Today's Golfer's Top 200 England, and Golf Empire's Top 100
 * England (all in `src/lib/ranking-import/`, which also feed the Vestige
 * Index `ranking` axis). Reproducing a single publisher's exact compiled
 * order/selection risks their asserted copyright + UK database right over
 * that compilation (checked: top100golfcourses.com's terms explicitly
 * prohibit reproduction without written permission, no attribution
 * exemption) - averaging facts (rank positions) from three independent
 * sources into an original derived order is a materially different, and
 * standard, practice.
 *
 * One entry per CLUB, not per individual course - Old/New/Red/Blue/East/
 * West siblings (Sunningdale, Walton Heath, Wentworth, Saunton, The
 * Berkshire, Woburn) collapse to a single ranked slot, since most of these
 * clubs currently exist as one row in the course catalogue and the app has
 * no per-course disambiguation at play-tracking time yet. 96 of the 100
 * have 2-3 source agreement; the last 4 (Piltdown, Berkhamsted, Northants
 * County, St Annes Old Links) rest on Today's Golfer alone, since its list
 * runs to 200 where the other two stop at 100 - all four are genuine,
 * well-regarded clubs, just without independent cross-source corroboration.
 *
 * Used by `BulkImportPanel` as the one-click seed for a curated list; the
 * panel also accepts pasted CSV/plain-text for any future top-N list.
 */

import type { ImportInputRow } from "./match";

export const TOP100_ENGLAND: ImportInputRow[] = [
  { rank: 1, name: "Royal St George's Golf Club", location: "Kent, United Kingdom" },
  { rank: 2, name: "Sunningdale Golf Club", location: "Berkshire, United Kingdom" },
  { rank: 3, name: "Swinley Forest Golf Club", location: "Berkshire, United Kingdom" },
  { rank: 4, name: "Royal Lytham & St Annes Golf Club", location: "Lancashire, United Kingdom" },
  { rank: 5, name: "St Enodoc Golf Club (Church)", location: "Cornwall, United Kingdom" },
  { rank: 6, name: "Royal Birkdale Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 7, name: "Ganton Golf Club", location: "Yorkshire, United Kingdom" },
  { rank: 8, name: "St George's Hill Golf Club (Red & Blue)", location: "Surrey, United Kingdom" },
  { rank: 9, name: "Royal Cinque Ports Golf Club", location: "Kent, United Kingdom" },
  { rank: 10, name: "Woodhall Spa Golf Club (Hotchkin)", location: "Lincolnshire, United Kingdom" },
  { rank: 11, name: "West Sussex Golf Club", location: "Sussex, United Kingdom" },
  { rank: 12, name: "Rye Golf Club (Old)", location: "Sussex, United Kingdom" },
  { rank: 13, name: "Royal Liverpool Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 14, name: "Walton Heath Golf Club", location: "Surrey, United Kingdom" },
  { rank: 15, name: "Royal West Norfolk Golf Club (Brancaster)", location: "Norfolk, United Kingdom" },
  { rank: 16, name: "Alwoodley Golf Club", location: "Yorkshire, United Kingdom" },
  { rank: 17, name: "Formby Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 18, name: "Hollinwell (Notts Golf Club)", location: "Nottinghamshire, United Kingdom" },
  { rank: 19, name: "Silloth on Solway Golf Club", location: "Cumbria, United Kingdom" },
  { rank: 20, name: "Saunton Golf Club", location: "Devon, United Kingdom" },
  { rank: 21, name: "The Berkshire Golf Club", location: "Berkshire, United Kingdom" },
  { rank: 22, name: "Hankley Common Golf Club", location: "Surrey, United Kingdom" },
  { rank: 23, name: "Woking Golf Club", location: "Surrey, United Kingdom" },
  { rank: 24, name: "Hillside Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 25, name: "Burnham & Berrow Golf Club (Championship)", location: "Somerset, United Kingdom" },
  { rank: 26, name: "Wentworth Club", location: "Surrey, United Kingdom" },
  { rank: 27, name: "Hunstanton Golf Club", location: "Norfolk, United Kingdom" },
  { rank: 28, name: "West Lancashire Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 29, name: "Liphook Golf Club", location: "Hampshire, United Kingdom" },
  { rank: 30, name: "Prince's Golf Club", location: "Kent, United Kingdom" },
  { rank: 31, name: "Worplesdon Golf Club", location: "Surrey, United Kingdom" },
  { rank: 32, name: "The Addington Golf Club", location: "Greater London, United Kingdom" },
  { rank: 33, name: "Parkstone Golf Club", location: "Dorset, United Kingdom" },
  { rank: 34, name: "West Hill Golf Club", location: "Surrey, United Kingdom" },
  { rank: 35, name: "Broadstone Golf Club", location: "Dorset, United Kingdom" },
  { rank: 36, name: "Moortown Golf Club", location: "Yorkshire, United Kingdom" },
  { rank: 37, name: "Wallasey Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 38, name: "Southport & Ainsdale Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 39, name: "Hindhead Golf Club", location: "Surrey, United Kingdom" },
  { rank: 40, name: "Royal Ashdown Forest Golf Club (Old)", location: "Sussex, United Kingdom" },
  { rank: 41, name: "Aldeburgh Golf Club (Championship)", location: "Suffolk, United Kingdom" },
  { rank: 42, name: "Beau Desert Golf Club", location: "Staffordshire, United Kingdom" },
  { rank: 43, name: "Hayling Golf Club", location: "Hampshire, United Kingdom" },
  { rank: 44, name: "New Zealand Golf Club", location: "Surrey, United Kingdom" },
  { rank: 45, name: "Delamere Forest Golf Club", location: "Cheshire, United Kingdom" },
  { rank: 46, name: "Ferndown Golf Club (Old)", location: "Dorset, United Kingdom" },
  { rank: 47, name: "Sherwood Forest Golf Club", location: "Nottinghamshire, United Kingdom" },
  { rank: 48, name: "JCB Golf & Country Club", location: "Staffordshire, United Kingdom" },
  { rank: 49, name: "Ipswich Golf Club (Purdis Heath)", location: "Suffolk, United Kingdom" },
  { rank: 50, name: "Woburn Golf Club", location: "Buckinghamshire, United Kingdom" },
  { rank: 51, name: "Royal North Devon Golf Club", location: "Devon, United Kingdom" },
  { rank: 52, name: "Stoneham Golf Club", location: "Hampshire, United Kingdom" },
  { rank: 53, name: "Seaton Carew Golf Club (Micklem)", location: "Durham, United Kingdom" },
  { rank: 54, name: "Little Aston Golf Club", location: "Staffordshire, United Kingdom" },
  { rank: 55, name: "Huntercombe Golf Club", location: "Oxfordshire, United Kingdom" },
  { rank: 56, name: "Littlestone Golf Club (Championship)", location: "Kent, United Kingdom" },
  { rank: 57, name: "Trevose Golf & Country Club (Championship)", location: "Cornwall, United Kingdom" },
  { rank: 58, name: "Seacroft Golf Club", location: "Lincolnshire, United Kingdom" },
  { rank: 59, name: "Queenwood Golf Club", location: "Surrey, United Kingdom" },
  { rank: 60, name: "Perranporth Golf Club", location: "Cornwall, United Kingdom" },
  { rank: 61, name: "Blackmoor Golf Club", location: "Hampshire, United Kingdom" },
  { rank: 62, name: "East Devon Golf Club", location: "Devon, United Kingdom" },
  { rank: 63, name: "Tandridge Golf Club", location: "Surrey, United Kingdom" },
  { rank: 64, name: "Goswick Links", location: "Northumberland, United Kingdom" },
  { rank: 65, name: "Bearwood Lakes Golf Club", location: "Berkshire, United Kingdom" },
  { rank: 66, name: "Blackwell Golf Club", location: "Worcestershire, United Kingdom" },
  { rank: 67, name: "Hadley Wood Golf Club", location: "Greater London, United Kingdom" },
  { rank: 68, name: "Royal Wimbledon Golf Club", location: "Greater London, United Kingdom" },
  { rank: 69, name: "Kington Golf Club", location: "Herefordshire, United Kingdom" },
  { rank: 70, name: "Camberley Heath Golf Club", location: "Surrey, United Kingdom" },
  { rank: 71, name: "Lindrick Golf Club", location: "Yorkshire, United Kingdom" },
  { rank: 72, name: "Royal Worlington & Newmarket Golf Club", location: "Suffolk, United Kingdom" },
  { rank: 73, name: "Ashridge Golf Club", location: "Hertfordshire, United Kingdom" },
  { rank: 74, name: "Coombe Hill Golf Club", location: "Greater London, United Kingdom" },
  { rank: 75, name: "The Grove", location: "Hertfordshire, United Kingdom" },
  { rank: 76, name: "Knole Park Golf Club", location: "Kent, United Kingdom" },
  { rank: 77, name: "Remedy Oak Golf Club", location: "Dorset, United Kingdom" },
  { rank: 78, name: "Sutton Coldfield Golf Club", location: "Birmingham, United Kingdom" },
  { rank: 79, name: "Cavendish Golf Club", location: "Derbyshire, United Kingdom" },
  { rank: 80, name: "Isle of Purbeck Golf Club (Purbeck)", location: "Dorset, United Kingdom" },
  { rank: 81, name: "Sheringham Golf Club", location: "Norfolk, United Kingdom" },
  { rank: 82, name: "Cleeve Hill Golf Club", location: "Gloucestershire, United Kingdom" },
  { rank: 83, name: "North Hants Golf Club", location: "Hampshire, United Kingdom" },
  { rank: 84, name: "Seascale Golf Club", location: "Cumbria, United Kingdom" },
  { rank: 85, name: "Prestbury Golf Club", location: "Cheshire, United Kingdom" },
  { rank: 86, name: "Woodbridge Golf Club", location: "Suffolk, United Kingdom" },
  { rank: 87, name: "Formby Ladies Golf Club", location: "Merseyside, United Kingdom" },
  { rank: 88, name: "Crowborough Beacon Golf Club", location: "Sussex, United Kingdom" },
  { rank: 89, name: "Piltdown Golf Club", location: "Sussex, United Kingdom" },
  { rank: 90, name: "St Mellion Golf Club", location: "Cornwall, United Kingdom" },
  { rank: 91, name: "Yelverton Golf Club", location: "Devon, United Kingdom" },
  { rank: 92, name: "Berkhamsted Golf Club", location: "Hertfordshire, United Kingdom" },
  { rank: 93, name: "Northamptonshire County Golf Club", location: "Northamptonshire, United Kingdom" },
  { rank: 94, name: "St Annes Old Links Golf Club", location: "Lancashire, United Kingdom" },
  { rank: 95, name: "Appleby Golf Club", location: "Cumbria, United Kingdom" },
  { rank: 96, name: "Dunstanburgh Castle Golf Course", location: "Northumberland, United Kingdom" },
  { rank: 97, name: "Stoke Park (Colt & Alison)", location: "Buckinghamshire, United Kingdom" },
  { rank: 98, name: "Coxmoor Golf Club", location: "Nottinghamshire, United Kingdom" },
  { rank: 99, name: "Thorndon Park Golf Club", location: "Essex, United Kingdom" },
  { rank: 100, name: "Denham Golf Club", location: "Buckinghamshire, United Kingdom" },
];
