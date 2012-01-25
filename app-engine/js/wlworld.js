/*
 * WLWorld - Logic for building whole worlds out of chunks.
 *
 * Copyright (c) 2012 Mark Browning
 *
 * Licensed under GPL3 or later.
 *
 */

function WLWorld(size)
{
	this.xsize = size;
	this.ysize = size;
	this.zsize = size;

	var chunksize = WLChunk.size;

	this.xchunk = Math.floor((size - 1)/chunksize) + 1;
	this.ychunk = Math.floor((size - 1)/chunksize) + 1;
	this.zchunk = Math.floor((size - 1)/chunksize) + 1;

	var data = new Array();
	for(x=0;x<this.xchunk * chunksize ;x++)
	{
		data[x] = new Array();
		for(y=0;y<this.ychunk * chunksize;y++)
		{
			data[x][y] = new Array();
			for(z=0;z<this.zchunk * chunksize;z++)
			{
				cos = Math.cos(Math.PI/8)
				sin = Math.sin(Math.PI/8)
				xp = x - size/2
				yp = y - size/2;
				if( (xp*xp + yp*yp ) * cos * cos - z * z * sin * sin  < 0 )
				{

					if( z > size/2 + 1)
						data[x][y][z] = VOXEL.AIR;
					else if( z > size/2  && Math.random() > 0.1)
						data[x][y][z] = VOXEL.AIR;
					else
						data[x][y][z] = VOXEL.DIRT;
				}
				else
					data[x][y][z] = VOXEL.AIR
			}
		}
	}
	this.data = data;
	var chunk = new Array();
	this.meshes = new Array();
	for(x=0;x<this.xchunk;x++)
	{
		chunk[x] = new Array();
		for(y=0;y<this.ychunk;y++)
		{
			chunk[x][y] = new Array();
			for(z=0;z<this.zchunk;z++)
			{
				chunk[x][y][z] = new WLChunk(x,y,z,data);
				if(chunk[x][y][z].vboTop.icount > 0)
				{
					this.meshes.push(chunk[x][y][z].vboTop);
				}
			}
		}
	}
	this.chunks = chunk;
}

WLWorld.prototype.onupdateblock = function(x,y,z) 
{
	var xc = x/ WLChunk.size;
	var yc = y/ WLChunk.size;
	var zc = z/ WLChunk.size;
	var add = this.chunks[x][y][z].rebuild(this.data);
	if(chunk[x][y][z].vboTop.icount > 0)
	{
		this.meshes.push(chunk[x][y][z].vboTop);
	}
}
