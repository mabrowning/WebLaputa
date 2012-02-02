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
			wlworld = new WLWorldWorker(e.data);
			break;
		case IPC.NEWCHUNK:
			wlworld.addchunk(e.x,e.y,e.z,e.data)
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

function WLWorldWorker(data,webworker)
{
	wlworld = this;

	this.data = data;

	data.heights = new Array();

	postMessage({type:IPC.PROGRESS,text:"Splitting world into chunks..."})

	var chunk = new Array();
	var xchunk = Math.floor((data.length - 1)/chunksize) + 1;
	for(x=0;x<xchunk;x++)
	{
		var datax = data[x*chunksize]
		if(typeof datax === 'undefined')continue;

		var ychunk = Math.floor((datax.length - 1)/chunksize) + 1;
		chunk[x] = new Array();
		for(y=0;y<ychunk;y++)
		{
			var datay = datax[y*chunksize]
			if(typeof datay === 'undefined')continue;

			var zchunk = Math.floor((datay.length - 1)/chunksize) + 1;
			chunk[x][y] = new Array();
			for(z=0;z<zchunk;z++)
			{
				chunk[x][y][z] = new WLChunk(x,y,z,data);
			}
		}
	}
	postMessage({type:IPC.PROGRESS,text:"Building mesh..."})
	this.chunks = chunk;

	for(x=0;x<xchunk;x++)
	{
		var chunkx = chunk[x]
		if(typeof chunkx === 'undefined')continue;

		var ychunk = chunkx.length;
		for(y=0;y<ychunk;y++)
		{
			var chunky = chunkx[y];
			if(typeof chunky === 'undefined')continue;

			var zchunk = chunky.length;
			for(z=0;z<zchunk;z++)
			{
				var neighbors = this.getneighbors(x,y,z);
				chunky[z].build_mesh(neighbors);
			}
		}
	}
	postMessage({type:IPC.PROGRESS,text:"Finished loading world. Done!"})
}

WLWorldWorker.prototype.addchunk = function(x,y,z,data)
{
	var xb = x*chunksize,
		yb = y*chunksize,
		zb = z*chunksize;
	//x,y,z are chunk indices, and data indices are chunk relative
	for(var xi = 0; xi < data.length ; xi++)
	{
		var xc = xb + xi;
		if(typeof this.data[xc] === 'undefined' )
			this.data[xc] = []
		for(var yi = 0; yi < data[xi].length; yi++ )
		{
			var yc = yb + yi;
			if(typeof this.data[xc][yc] === 'undefined' )
				this.data[xc][yc] = []
			for(var zi = 0; zi < data[xi][yi].length; zi++ )
			{
				var zc = zb + zi;
				this.data[xc][yc][zc] = data[xi][yi][zi];
			}
		}
	}


	//Add the new chunk, after having updated the data array
	
	//Possibly 
	if(typeof this.chunks[x] === 'undefined')
		this.chunks[x] = new Array();
	if(typeof this.chunks[x][y] === 'undefined')
		this.chunks[x][y] = new Array();

	var chunk = new WLChunk(x,y,z,this.data);
	this.chunks[x][y][z] = chunk;

	var neighs = this.getneighbors(x,y,z);
	for(var n=0; n<neighs.length;n++)
	{
		neighs[n].build_verts(this.data);
	}
	var neighs = this.getneighbors(x,y,z);
	for(var n=0; n<neighs.length;n++)
	{
		neighs[n].build_mesh(neighs.slice(0));
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

