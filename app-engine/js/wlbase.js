/*
 * Base WebLaputa code that doesn't really belong anywhere else.
 *
 * Copyright (c) 2012 Mark Browning
 *
 * Licensed under GPL3 or later.
 *
 */


DIR = {
	N:	0,
	E:	2,
	S:	4,
	W:	6
}
VOXEL = {
	AIR:		0, 
	DIRT:		1, 
	HALFBLOCK:	2, 
	WOOD:		3,
	PIT:		4,
}
var last = 5;
BLOCKS = {BLOCK:0,ARCH:0,RAMP:0}
for(blk in BLOCKS)
{
	for(dir in DIR)
	{
		VOXEL[blk+dir+"A"] = last++;
		VOXEL[blk+dir+"B"] = last++;
	}
}

IPC = {
	INITDATA:   0,
	UPDATEDATA: 1,
	UPSERTMESH: 2,
	DELETEMESH: 3,
	PROGRESS  : 4
}

var chunksize = 32;

