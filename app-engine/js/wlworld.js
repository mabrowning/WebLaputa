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


	var dirts = new Array();
	this.ground = new Array();
	var data = new Array();
	for(x=0;x<this.xchunk * chunksize ;x++)
	{
		data[x] = new Array();
		for(y=0;y<this.ychunk * chunksize;y++)
		{
			data[x][y] = new Array();
			for(z=0;z<this.zchunk * chunksize;z++)
			{
				cos = Math.cos(Math.PI/5)
				sin = Math.sin(Math.PI/5)
				co2 = Math.cos(Math.PI/4)
				si2 = Math.sin(Math.PI/4)
				xp = x - size/2
				yp = y - size/2;
				zp = size/4 -z+1 ;
				if((xp*xp + yp*yp ) * cos * cos -  z *  z * sin * sin  <= 0)
				{
					if(z > size/4+1 && (xp*xp + yp*yp )*co2 * co2 -zp*zp* si2*si2 <= 0)
					{
						data[x][y][z] = VOXEL.AIR
						continue;
					}

						data[x][y][z] = VOXEL.DIRT;
						if(dirts.length > 1200)
						{
							var ground = gl.createBuffer();
							ground.vcount = dirts.length/3;
		gl.bindBuffer(gl.ARRAY_BUFFER,ground);
		gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dirts),gl.STATIC_DRAW);
							this.ground.push(ground);
							dirts = new Array();
						}
						dirts.push(x+1.5);
						dirts.push(z);
						dirts.push(y+1.5);
					}
				else
					data[x][y][z] = VOXEL.AIR
			}
		}
	}

	var ground = gl.createBuffer();
	ground.vcount = dirts.length/3;
	gl.bindBuffer(gl.ARRAY_BUFFER,ground);
	gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dirts),gl.STATIC_DRAW);
	this.ground.push(ground);

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
			}
		}
	}
	this.chunks = chunk;
	for(x=0;x<this.xchunk;x++)
		for(y=0;y<this.ychunk;y++)
			for(z=0;z<this.zchunk;z++)
			{

				var norms = this.collectnorms(x,y,z);
				chunk[x][y][z].build_mesh(norms);
				if(chunk[x][y][z].vboTop.icount > 0)
				{
					this.meshes.push(chunk[x][y][z].vboTop);
				}
			}
}

WLWorld.prototype.addnorm = function(norms,x,y,z)
{
	try
	{
		norms.push(this.chunks[x][y][z].norms);
	}
	catch(err){}
}
WLWorld.prototype.collectnorms = function(x,y,z)
{
	var norms = [];
	this.addnorm(norms,x-1,y-1,z-1);
	this.addnorm(norms,x  ,y-1,z-1);
	this.addnorm(norms,x+1,y-1,z-1);
	this.addnorm(norms,x-1,y  ,z-1);
	this.addnorm(norms,x  ,y  ,z-1);
	this.addnorm(norms,x+1,y  ,z-1);
	this.addnorm(norms,x-1,y+1,z-1);
	this.addnorm(norms,x  ,y+1,z-1);
	this.addnorm(norms,x+1,y+1,z-1);

	this.addnorm(norms,x-1,y-1,z  );
	this.addnorm(norms,x  ,y-1,z  );
	this.addnorm(norms,x+1,y-1,z  );
	this.addnorm(norms,x-1,y  ,z  );
//	this.addnorm(norms,x  ,y  ,z  );
	this.addnorm(norms,x+1,y  ,z  );
	this.addnorm(norms,x-1,y+1,z  );
	this.addnorm(norms,x  ,y+1,z  );
	this.addnorm(norms,x+1,y+1,z  );

	this.addnorm(norms,x-1,y-1,z+1);
	this.addnorm(norms,x  ,y-1,z+1);
	this.addnorm(norms,x+1,y-1,z+1);
	this.addnorm(norms,x-1,y  ,z+1);
	this.addnorm(norms,x  ,y  ,z+1);
	this.addnorm(norms,x+1,y  ,z+1);
	this.addnorm(norms,x-1,y+1,z+1);
	this.addnorm(norms,x  ,y+1,z+1);
	this.addnorm(norms,x+1,y+1,z+1);
	return norms;
}

WLWorld.prototype.onupdateblock = function(x,y,z) 
{
	var xc = x/ WLChunk.size;
	var yc = y/ WLChunk.size;
	var zc = z/ WLChunk.size;

	var chunk = this.chunks[xc][yc][zc];
	chunk.build_verts(this.data);
	//TODO: figure out if we need to update multiple chunks.
	chunk.build_mesh( null );
	if(chunk.vboTop.icount > 0)
	{
		this.meshes.push(chunk.vboTop);
	}
}

WLWorld.prototype.getvoxel = function(x,y,z)
{
	try
	{
		return this.data[x][y][z] || VOXEL.AIR;
	}
	catch(err)
	{
		return VOXEL.AIR;
	}
}

