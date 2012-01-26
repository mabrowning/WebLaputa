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

	this.xchunk = Math.floor((size - 1)/chunksize) + 1;
	this.ychunk = Math.floor((size - 1)/chunksize) + 1;
	this.zchunk = Math.floor((size - 1)/chunksize) + 1;

	//TODO: eventually, this will come from the network.
	var SN = new SimplexNoise();

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
					if(z > size/4 + 1.1*SN.noise(x/8,y/8) )
					{
						data[x][y][z] = VOXEL.AIR
						continue;
					}
						data[x][y][z] = VOXEL.DIRT;
					}
				else
					data[x][y][z] = VOXEL.AIR
			}
		}
	}

	this.data = data;
	this.meshes = {};
	var world = this;

	this.worker = new Worker('js/wlworker.js');
	this.worker.onmessage = function(e)
	{
		e = e.data;
		switch(e.type)
		{
		case IPC.UPSERTMESH:
			var mesh;
			if(e.key in world.meshes)
			{
				//Use mesh object if it exists;
				mesh = world.meshes[e.key];
			}
			else
			{
				//If not, create a new one, complete with GL buffers
				mesh = {}
				mesh.vbo = gl.createBuffer();
				mesh.ibo = gl.createBuffer();
				world.meshes[e.key] = mesh;
			}
			//Create vertices
			gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
			gl.bufferData(gl.ARRAY_BUFFER, 
					new Float32Array(e.vertices), gl.STATIC_DRAW);
			mesh.vcount = e.vcount;

			//Create Indices
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.ibo);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 
					new Uint16Array(e.indices), gl.STATIC_DRAW);
			mesh.icount = e.icount;

			break;
		case IPC.DELETEMESH:
			delete world.meshes[e.key]
			break;
		default:
			break;
		}
	}
	this.worker.postMessage({type:IPC.INITDATA, data:data, size:size})
}

WLWorld.prototype.cubeIntersect =function(cube,origin,ray)
{
	//Finds which x plane (0 or 1), which y plane, which z plane
	//Finds the distance to intersect with that plane
	//Picks the lowest distance
	//Finds the actual intersection point
	var x,y,z,xnc,ync,znc;
	if(ray[0]>0)
	{
		x = (cube[0]+1-origin[0])/ray[0];
		xnc = vec3.add([1,0,0],cube);
	}
	else
	{
		x = (cube[0]-origin[0])/ray[0];
		xnc = vec3.add([-1,0,0],cube);
	}

	if(ray[1]>0)
	{
		y = (cube[1]+1-origin[1])/ray[1];
		ync = vec3.add([0,1,0],cube);
	}
	else
	{
		y = (cube[1]-origin[1])/ray[1];
		ync = vec3.add([0,-1,0],cube);
	}

	if(ray[2]>0)
	{
		z = (cube[2]+1-origin[2])/ray[2];
		znc = vec3.add([0,0,1],cube);
	}
	else
	{
		z = (cube[2]-origin[2])/ray[2];
		znc = vec3.add([0,0,-1],cube);
	}
	var t,nc;
	if(x < y && x < z)
	{
		t = x;
		nc = xnc;
	}
	else if(y < x && y < z)
	{
		t = y;
		nc = ync;
	}
	else
	{
		t = z;
		nc = znc;
	}

	// I = O + tR
	var inter = vec3.add(vec3.scale(ray,t,vec3.create()),origin);
	return [nc,inter];
}

WLWorld.prototype.onupdateblock = function(x,y,z,type)
{
	this.worker.postMessage({type:IPC.UPDATEDATA,
		x:x,y:y,z:z,voxel:type})
}

WLWorld.prototype.place_block = function(type)
{
	x = this.hover[0];
	y = this.hover[1];
	z = this.hover[2];
	this.data[x][y][z] = type;
	this.onupdateblock(x,y,z,type);
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
		var c_o = this.cubeIntersect([x,y,z],origin,ray);
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

