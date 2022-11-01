# ChatwarsTools
Web-Based tools for the telegram game ChatWars


Dungeon Improvements ToDo:

- allow for "chest hunting" paths.  
- improve sorting algorithm speed by just saving all paths up to 35 but only considering the ones up to a length of 30 for the shorter length, which coupled with adding an index of reasons for weights instead of just the weights to the nodes should eliminate the need for recalculation on algorithm change.
- remove duplicates of paths with the same weight and only keep the shorter ones.
- show path / segment length

- mark consumables as used / defeated / disabled (esp. fountains, also monsters)
- on mouse hover show info about path / segment (length, monsters, torch useage, etc)