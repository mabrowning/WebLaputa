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


	/*
	var dirts = new Array();
	this.ground = new Array();
	*/

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
					/*
					if(z > size/4+1 && (xp*xp + yp*yp )*co2 * co2 -zp*zp* si2*si2 <= 0)
					*/
					if(z > size/4)
					{
						data[x][y][z] = VOXEL.AIR
						continue;
					}
						data[x][y][z] = VOXEL.DIRT;
						/*
						if(dirts.length > 1200)
						{
							var ground = gl.createBuffer();
							ground.vcount = dirts.length/3;
		gl.bindBuffer(gl.ARRAY_BUFFER,ground);
		gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dirts),gl.STATIC_DRAW);
							this.ground.push(ground);
							dirts = new Array();
						}
						dirts.push(x+0.5);
						dirts.push(z+0.5);
						dirts.push(y+0.5);
						*/
					}
				else
					data[x][y][z] = VOXEL.AIR
			}
		}
	}

	/*
	var ground = gl.createBuffer();
	ground.vcount = dirts.length/3;
	gl.bindBuffer(gl.ARRAY_BUFFER,ground);
	gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(dirts),gl.STATIC_DRAW);
	this.ground.push(ground);
	*/

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
				var neighbors = this.getneighbors(x,y,z);
				chunk[x][y][z].build_mesh(neighbors);
				if(chunk[x][y][z].vboTop.icount > 0)
				{
					this.meshes.push(chunk[x][y][z].vboTop);
				}
			}
}

WLWorld.prototype.addneighbor = function(neighs,x,y,z)
{
	try
	{
		var chunk = this.chunks[x][y][z];
		if(chunk.x) //any property to trigger the TypeError on non-chunk
			neighs.push(chunk);
	}
	catch(err){}
}
WLWorld.prototype.getneighbors = function(x,y,z)
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

WLWorld.prototype.onupdateblock = function(x,y,z) 
{
	var chunksize = WLChunk.size;

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
		for(i=0;i<this.meshes.length;i++)
		{
			if(this.meshes[i] == chunk.vboTop)
			{
				this.meshes.splice(i,1)
			}
		}
		if(chunk.vboTop.icount > 0)
		{
			this.meshes.push(chunk.vboTop);
		}
	}
}

WLWorld.prototype.place_block = function(type)
{
	x = this.hover[0];
	y = this.hover[1];
	z = this.hover[2];
	this.data[x][y][z] = type;
	this.onupdateblock(x,y,z);

}

WLWorld.prototype.hover_block = function(origin,ray)
{
	var x = Math.floor(origin[0]);
	var y = Math.floor(origin[1]);
	var z = Math.floor(origin[2]);

	var lx,ly,lz;
	var count = 0;
	while(this.getvoxel(x,y,z) == VOXEL.AIR && count < this.xsize*2)
	{
		count++
		lx = x; ly = y; lz = z;
		var c_o = cubeIntersect([x,y,z],origin,ray);
		x = c_o[0][0];
		y = c_o[0][1];
		z = c_o[0][2];
		origin = c_o[1];
	}
	this.hover = [lx,ly,lz];
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

