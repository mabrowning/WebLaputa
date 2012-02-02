/*
 * WLWorld - Logic for building whole worlds out of chunks.
 *
 * Copyright (c) 2012 Mark Browning
 *
 * Licensed under GPL3 or later.
 *
 */

function WLWorld(seed)
{
	if(!seed)seed=""
	this.seed = seed;

	this.data = new Array();
	this.meshes = {};
	var world = this;

	this.chunks = {}

	//Set up webworker. We'll then fetch the current world
	//from the server and pass it in.
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
			if(renderer) renderer.dirty = true;
			var loading = document.getElementById("loading");
			if(loading)
				loading.parentNode.removeChild(loading);

			break;
		case IPC.DELETEMESH:
			delete world.meshes[e.key]
			break;
		case IPC.PROGRESS:
			if(e.text)
			{
				var loading = document.getElementById("loading");
				if(loading) loading.innerHTML +="<br>"+ e.text;
				console.log(e.text);
			}
			if(e.data)
			{
				console.log(e.data);
			}
			break;
		default:
			break;
		}
	}
	this.worker.onerror = function(e)
	{
		console.log("WebWorker error: "+e.filename + " on lineno: "+e.lineno);
	}

	this.chunk_load_queue = []


	var loading = document.getElementById("loading");
	loading.innerHTML +="<br>Downloading world...";
	//Start downloading the world.
	var request = new XMLHttpRequest();
	request.open("GET","/join/"+seed,true);
	request.onreadystatechange = function()
	{
		if(this.readyState!=4)return;

		if(this.status != 200)
		{
			loading.innerHTML +="<br>Downloading world Failed!";
			return;
		}
		var data = JSON.parse(this.responseText);
		if( data && data.success )
		{
			world.seed  = data.seed

			world.chunk_load_queue.push([0,0,0])
			world.chunk_load_queue.push([1,0,0])
			world.chunk_load_queue.push([0,1,0])
			world.chunk_load_queue.push([1,1,0])
			world.chunk_load_queue.push([0,0,1])
			world.chunk_load_queue.push([1,0,1])
			world.chunk_load_queue.push([0,1,1])
			world.chunk_load_queue.push([1,1,1])

			world.process_chunk_load()
		}
		else
		{
			loading.innerHTML +="<br>Downloading world Failed!";
		}
	}
	request.send();



	this.worker.postMessage({type:IPC.INITDATA, data:[]})
	
}

WLWorld.prototype.process_chunk_load = function()
{
	xyz = this.chunk_load_queue.shift()
	if( !xyz )return;
	this.chunks[xyz.join("|")] = true;
	var request = new XMLHttpRequest();
	request.x =xyz[0]
	request.y =xyz[1]
	request.z =xyz[2]
	request.open("POST","/get",true);
	request.onreadystatechange = function()
	{
		if(this.readyState!=4)return;

		if(this.status != 200)
		{
			return;
		}
		var data = JSON.parse(this.responseText);
		world.addchunk(this.x,this.y,this.z,data);

		world.process_chunk_load();

	}
	var formData = new FormData();
	formData.append("seed",this.seed);
	formData.append("x",xyz[0]);
	formData.append("y",xyz[1]);
	formData.append("z",xyz[2]);
	
	request.send(formData);
}
WLWorld.prototype.addchunk = function(x,y,z,data)
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
	world.worker.postMessage({ type:IPC.NEWCHUNK, x:x, y:y, z:z, data:data})
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
	if( !this.hover)return;
	x = this.hover[0];
	y = this.hover[1];
	z = this.hover[2];
	this.data[x][y][z] = type;
	this.onupdateblock(x,y,z,type);
}

WLWorld.prototype.onmove = function(x,y,z)
{
	var xc = Math.floor(x/ chunksize);
	var yc = Math.floor(y/ chunksize);
	var zc = Math.floor(z/ chunksize);
	if(!this.chunks[xc+"|"+yc+"|"+zc])
	{
		world.chunk_load_queue.push([xc,yc,zc])
		world.process_chunk_load()
	}
}

WLWorld.prototype.hover_block = function(origin,ray)
{
	var x = Math.floor(origin[0]);
	var y = Math.floor(origin[1]);
	var z = Math.floor(origin[2]);

	var lx,ly,lz;
	var count = 0;
	var maxcount = 128; //Maximum distance away
	while(this.getvoxel(x,y,z) == VOXEL.AIR && count < maxcount)
	{
		count++
		lx = x; ly = y; lz = z;
		var c_o = this.cubeIntersect([x,y,z],origin,ray);
		x = c_o[0][0];
		y = c_o[0][1];
		z = c_o[0][2];
		origin = c_o[1];
	}
	if( count == maxcount )
	{
		delete this.hover;
	}
	else
	{
		this.hover = [lx,ly,lz];
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

