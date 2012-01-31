/*
 * WLWorker - WebLaputa Web Worker class for doing background mesh
 * generation work.
 *
 * Copyright (c) 2012 Mark Browning
 *
 * Licensed under GPL3 or later.
 *
 */
if(typeof importScripts === 'undefined' )
{
	importScripts = function(e){} //shimy
}
importScripts('glMatrix-1.2.3.min.js');
importScripts('wlbase.js');
importScripts('wlchunk.js');

var wlworld;

onmessage = function(e)
{

	e = e.data;
	switch(e.type)
	{
		case IPC.INITDATA:
			wlworld = new WLWorldWorker(e.data,e.size);
			break;
		case IPC.UPDATEDATA:
			wlworld.onupdateblock(e.x,e.y,e.z,e.voxel);
			break;
		default:
			break;
	}
}

function WebWorkerShim(pair)
{
	if(!pair)
		this.pair = new WebWorkerShim(this)
	else
	{
		WebWorkerShim.postMessage = function(e){pair.onmessage({data:e})}
		this.pair = pair;
	}
	this.postMessage = function(e){this.pair.onmessage({data:e})}
	this.onmessage = onmessage
}
WebWorkerShim.postMessage = postMessage;

function WLWorldWorker(data,size,webworker)
{
	wlworld = this;
	this.xsize = size;
	this.ysize = size;
	this.zsize = size;


	this.xchunk = Math.floor((size - 1)/chunksize) + 1;
	this.ychunk = Math.floor((size - 1)/chunksize) + 1;
	this.zchunk = Math.floor((size - 1)/chunksize) + 1;

	this.data = data;

	data.heights = new Array();

	var chunk = new Array();
	for(x=0;x<this.xchunk;x++)
	{
		chunk[x] = new Array();
		for(y=0;y<this.ychunk;y++)
		{
			chunk[x][y] = new Array();
			for(z=0;z<this.zchunk;z++)
			{
				chunk[x][y][z] = new WLChunk(x,y,z,data);
			}
		}
	}
	this.chunks = chunk;
	for(x=0;x<this.xchunk;x++)
		for(y=0;y<this.ychunk;y++)
			for(z=0;z<this.zchunk;z++)
			{
				var neighbors = this.getneighbors(x,y,z);
				chunk[x][y][z].build_mesh(neighbors);
			}
}

WLWorldWorker.prototype.addneighbor = function(neighs,x,y,z)
{
	try
	{
		var chunk = this.chunks[x][y][z];
		if(chunk.x) //any property to trigger the TypeError on non-chunk
			neighs.push(chunk);
	}
	catch(err){}
}
WLWorldWorker.prototype.getneighbors = function(x,y,z)
{
	var neighs = [];
	this.addneighbor(neighs,x-1,y-1,z-1);
	this.addneighbor(neighs,x  ,y-1,z-1);
	this.addneighbor(neighs,x+1,y-1,z-1);
	this.addneighbor(neighs,x-1,y  ,z-1);
	this.addneighbor(neighs,x  ,y  ,z-1);
	this.addneighbor(neighs,x+1,y  ,z-1);
	this.addneighbor(neighs,x-1,y+1,z-1);
	this.addneighbor(neighs,x  ,y+1,z-1);
	this.addneighbor(neighs,x+1,y+1,z-1);

	this.addneighbor(neighs,x-1,y-1,z  );
	this.addneighbor(neighs,x  ,y-1,z  );
	this.addneighbor(neighs,x+1,y-1,z  );
	this.addneighbor(neighs,x-1,y  ,z  );
	this.addneighbor(neighs,x  ,y  ,z  );
	this.addneighbor(neighs,x+1,y  ,z  );
	this.addneighbor(neighs,x-1,y+1,z  );
	this.addneighbor(neighs,x  ,y+1,z  );
	this.addneighbor(neighs,x+1,y+1,z  );

	this.addneighbor(neighs,x-1,y-1,z+1);
	this.addneighbor(neighs,x  ,y-1,z+1);
	this.addneighbor(neighs,x+1,y-1,z+1);
	this.addneighbor(neighs,x-1,y  ,z+1);
	this.addneighbor(neighs,x  ,y  ,z+1);
	this.addneighbor(neighs,x+1,y  ,z+1);
	this.addneighbor(neighs,x-1,y+1,z+1);
	this.addneighbor(neighs,x  ,y+1,z+1);
	this.addneighbor(neighs,x+1,y+1,z+1);
	return neighs;
}

WLWorldWorker.prototype.onupdateblock = function(x,y,z,type) 
{
	this.data[x][y][z] = type;

	var xc = Math.floor(x/ chunksize );
	var yc = Math.floor(y/ chunksize);
	var zc = Math.floor(z/ chunksize);

	var xi = x % chunksize;
	var yi = y % chunksize;
	var zi = z % chunksize;

	var xs ={}; xs[xc]=true;
	var ys ={}; ys[yc]=true;
	var zs ={}; zs[zc]=true;

	if(xi < 2)
		xs[xc-1]=true;
	else if(xi > chunksize-3)
		xs[xc+1]=true;

	if(yi < 2)
		ys[yc-1]=true;
	else if(yi > chunksize-3)
		ys[yc+1]=true;

	if(zi < 2)
		zs[zc-1]=true;
	else if(zi > chunksize-3)
		zs[zc+1]=true;

	var chunks = [];

	for(xi in xs)
		for(yi in ys)
			for(zi in zs)
				try
				{
					xi = parseInt(xi);
					yi = parseInt(yi);
					zi = parseInt(zi);
					var ch = this.chunks[xi][yi][zi];
					if(ch.norms)
						chunks.push(ch);
				}
				catch (err)
				{
				}
	


	var neighbors = [];
	//Compute vertices
	for( i in chunks)
	{
		chunks[i].build_verts(this.data);
		neighbors = neighbors.concat(this.getneighbors(xc,yc,zc));
	}

	for( i in chunks)
	{
		var chunk = chunks[i];

		chunk.build_mesh( neighbors );
	}
}

