/*
 * WLChunk - WebLaputa class for handling generating meshes.
 *
 * Copyright (c) 2012 Mark Browning
 *
 * Licensed under GPL3 or later.
 *
 */

function WLChunk(x,y,z,data)
{
	this.x = x * chunksize;
	this.y = y * chunksize;
	this.z = z * chunksize;

	this.build_verts(data)
};

WLChunk.prototype.getvoxel = function(x,y,z,data)
{
	try
	{
		return data[x][y][z] || VOXEL.AIR
	}
	catch(err)
	{
		return VOXEL.AIR;
	}
}


WLChunk.prototype.build_verts = function(data)
{
	var heights = data.heights;
	if( typeof heights === 'undefined')
	{
		heights = new Array();
		data.heights = heights;
	}


	//xi, yi and zi in terms of voxels index IN this chunk.
	//x , y  and z  in terms of global voxel position.
	for(var x=this.x; x<=(this.x + chunksize); x++)
	{
		if( typeof heights[x] === 'undefined')
			heights[x] = new Array();

		for(var y=this.y; y<=(this.y + chunksize); y++)
		{
			if( typeof heights[x][y] === 'undefined')
				heights[x][y] = new Array();

			thish = heights[x][y];
			var b = this.getvoxel(x,y,this.z - 1,data);

			var m = [[x-1,y-1,3],[x,y-1,2],[x-1,y,1]];

			for(var z=this.z; z<=(this.z + chunksize); z++)
			{
				delete thish[z]

				var lastb = b;
				b = this.getvoxel(x,y,z,data);
				if(b != VOXEL.DIRT && lastb == VOXEL.DIRT)
				{
					thish[z] = [false,false,false,false]; 
					var count = 1
					var val   = z;

					var hs = [thish[z]];
					var edge = false;
					for( var j in m)
					{
						var xy = m[j];
						var hi = false;
						try{
							hi = heights[xy[0]][xy[1]]
						}
						catch(err) { }

						var neigh = false;
						var h = -1;
						//Find closest height in this direction
						for(h = z+1;h>=z-1;h--)
						{
							try{
								if( typeof hi[h] !== 'undefined')
								{
									neigh = hi[h];
									break;
								}
							}catch(err){}
						}
						
						if( neigh )
						{
							//memoize h's so we can update their 
							//verts after computing
							hs[xy[2]] = neigh; 
							if(!edge)
							{
								count++;
								val += h;
							}
						}
						else
						{
							edge = true;
							val = z-1;
							count = 1;
						}
						//What to do if you get a edge?
					}

					for(i=0;i<hs.length;i++)
					{
						if(hs[i])
							hs[i][i] = val/count;
					}
				}
			}
		}
	}

	//norms Will store hashed verex positions mapping to their 
	//unnormalized normals ;)
	this.norms = {}; 
	this.sidenorms = [{},{},{},{},{}] //North, South, East, West, Bottom

	//Indices will store hashed vertex positions in gl.TRIANGLES order.
	this.topIndices = new Array();
	//Indices for side vertex. gl.TRIANGLES order
	this.sideIndices = [[], [], [], [], []]


	//Now that we have the heightmap of the top of the terrain, vertex it!
	for(x=this.x; x<(this.x + chunksize); x++)
	{
		for(y=this.y; y<(this.y + chunksize); y++)
		{
			var pilar = (this.getvoxel(x,y,this.z+chunksize-1,data)
					!= VOXEL.AIR);
			for(z=(this.z+chunksize-1); z>=this.z-1; z--)
			{
				if(pilar)
				{
					//If we've reached an air block, 
					//we'll no longer be in a pilar
					pilar = (this.getvoxel(x,y,z-1,data) != VOXEL.AIR); 
					if(!pilar)
						this.addface(x,y,z,4);
					if(this.getvoxel(x,y+1,z,data) == VOXEL.AIR )
						this.addface(x,y,z,0);
					if(this.getvoxel(x,y-1,z,data) == VOXEL.AIR )
						this.addface(x,y,z,1);
					if(this.getvoxel(x+1,y,z,data) == VOXEL.AIR )
						this.addface(x,y,z,2);
					if(this.getvoxel(x-1,y,z,data) == VOXEL.AIR )
						this.addface(x,y,z,3);
				}
				if(z<this.z)break;

				if( typeof heights[x][y][z] === 'undefined')
					continue;
				
				//If we've reached an air block, 
				//we'll no longer be in a pilar
				pilar = (this.getvoxel(x,y,z-1,data) != VOXEL.AIR); 


				var xp = [x-1,x,x-1,x,x-0.5];
				var yp = [y-1,y-1,y,y,y-0.5];
				var xp = [x,x+1,x,x+1,x+0.5];
				var yp = [y,y,y+1,y+1,y+0.5];
				var zp = heights[x][y][z].slice(0); //copy


				var edge = false;
				for( i in zp )
				{
					//quick and dirty fix
					if(zp[i] === false)
					{
						edge = true;
						zp[i] = z-1;
					}
					else if(zp[i] < z-0.9)
					{
						edge = true;
					}
				}
				if(false)
					for( i in zp )
						if(zp[i] > z)
							zp[i] = z;

				zp[4] = 0.25 * ( zp[0] + zp[1] + zp[2] + zp[3] )
				

				var tris = [
					1,//[0,1,4],
					3,//[1,3,4],
					0,//[2,0,4],
					2]//[3,2,4]]
				for(i in tris)
				{
					var t = tris[i];
					var p0 = [xp[i], yp[i], zp[i]];
					var p1 = [xp[t], yp[t], zp[t]];
					var p2 = [xp[4], yp[4], zp[4]];
					this.addtri(p0,p1,p2);
				}
			}
		}
	}
}

WLChunk.prototype.addtri =  function(p0,p1,p2)
{
	var u = vec3.create();
	vec3.subtract(p1,p0,u);
	var v = vec3.create();
	vec3.subtract(p2,p0,v);
	var norm = vec3.cross(u,v);

	this.topIndices.push(this.addnorm(this.norms,p0,norm));
	this.topIndices.push(this.addnorm(this.norms,p1,norm));
	this.topIndices.push(this.addnorm(this.norms,p2,norm));
}

WLChunk.prototype.addface =  function(x,y,z,face)
{
	z--;
	var p0;
	var p1;
	var p2;
	var p3;
	switch(face)
	{
		case 0: //N
			p0 = [x+1,y+1,z  ]
			p1 = [x  ,y+1,z  ]
			p2 = [x  ,y+1,z+1]
			p3 = [x+1,y+1,z+1]
			break;
		case 1: //S
			p0 = [x  ,y,z  ]
			p1 = [x+1,y,z  ]
			p2 = [x+1,y,z+1]
			p3 = [x  ,y,z+1]
			break;
		case 2: //E
			p0 = [x+1,y  ,z  ]
			p1 = [x+1,y+1,z  ]
			p2 = [x+1,y+1,z+1]
			p3 = [x+1,y  ,z+1]
			break;
		case 3: //W
			p0 = [x,y+1,z  ]
			p1 = [x,y  ,z  ]
			p2 = [x,y  ,z+1]
			p3 = [x,y+1,z+1]
			break;
		case 4: //Bottom
			p0 = [x  ,y  ,z]
			p1 = [x  ,y+1,z]
			p2 = [x+1,y+1,z]
			p3 = [x+1,y  ,z]
			break;
	}
	var k0 = p0.join("|");
	var k1 = p1.join("|");
	var k2 = p2.join("|");
	var k3 = p3.join("|");
	this.sidenorms[face][k0]=true;
	this.sidenorms[face][k1]=true;
	this.sidenorms[face][k2]=true;
	this.sidenorms[face][k3]=true;
	this.sideIndices[face].push(k0)
	this.sideIndices[face].push(k1)
	this.sideIndices[face].push(k2)
	this.sideIndices[face].push(k0)
	this.sideIndices[face].push(k2)
	this.sideIndices[face].push(k3)
}

var facenorms = [ 
	[ 0 ,0, 1],//north
	[ 0, 0,-1],//south
	[ 1, 0, 0],//east
	[-1, 0 ,0],//west
	[ 0,-1 ,0]]//bottom

WLChunk.prototype.addnorm = function(norms,pos,norm)
{
	var pos2 = [];
	//vec3.add(pos,[this.x,this.y,this.z],pos2);
	//Hash the vertex position
	var i = pos.join("|");

	//Add or add the norm.
	if( i in norms)
		vec3.add(norms[i],norm);
	else
		norms[i] = norm;
	return i;
}

WLChunk.prototype.build_mesh = function(neighs)
{

	//Build VBO for top mesh.
	var arrTop = new Array();
	var vcount = 0;
	var vIndices = {};
	for( key in this.norms )
	{
		vIndices[key] = vcount;

		var pos = key.split("|");
		var x = parseFloat(pos[0]);
		var y = parseFloat(pos[1]);
		var z = parseFloat(pos[2]);

		arrTop.push(x);
		arrTop.push(z);
		arrTop.push(y);
		var norm = this.norms[key];
		
		//Check if this vertex is on the edge
			//We might need to add up neighbor normals, too
			for(i in neighs)
			{
				if(this == neighs[i])
				{
					continue;
				}
				n = neighs[i].norms[key];
				if(n)
				{
					vec3.add(norm,n);
				}
			}

		vec3.normalize(norm);
		arrTop.push(norm[0]);
		arrTop.push(norm[2]);
		arrTop.push(norm[1]);
		vcount++;
	}

	var arrTopInd = new Array();
	//Build Vertex topIndices
	var icount = 0;
	for( i in this.topIndices )
	{
		//Each ind is a hashed vertex. 
		//The mapping from hash to vertex index is vIndices
		arrTopInd.push(vIndices[this.topIndices[i]]);
		icount++;
	}
	if(icount>0)
	{
		postMessage({type:IPC.UPSERTMESH,
					key:      this.x+"|"+this.y+"|"+this.z+"|top",
					vertices: arrTop,
					vcount:   vcount,
					indices:  arrTopInd,
			        icount:   icount});
	}
	else
	{
		postMessage({type:IPC.DELETEMESH,
					key:      this.x+"|"+this.y+"|"+this.z+"|top" });
	}

	//Build VBO for sides mesh.
	var arrSides = new Array();
	vcount = 0;

	vIndices = {};
	
	var arrSidesInd = new Array();
	icount = 0;

	for( face=0;face<5;face++)
	{
		for( key in this.sidenorms[face] )
		{
			vIndices[key] = vcount;

			var pos = key.split("|");
			var x = parseFloat(pos[0]);
			var y = parseFloat(pos[1]);
			var z = parseFloat(pos[2]);

			var norm = facenorms[face];

			arrSides.push(x);
			arrSides.push(z);
			arrSides.push(y);
			arrSides.push(norm[0])
			arrSides.push(norm[1])
			arrSides.push(norm[2]) //0,1,2 is correct
			vcount++;
		}

		for( i in this.sideIndices[face] )
		{
			//Each ind is a hashed vertex. 
			//The mapping from hash to vertex index is vIndices
			arrSidesInd.push(vIndices[this.sideIndices[face][i]]);
			icount++;
		}
	}
	if(icount>0)
	{
		postMessage({type:IPC.UPSERTMESH,
					key:      this.x+"|"+this.y+"|"+this.z+"|side",
					vertices: arrSides,
					vcount:   vcount,
					indices:  arrSidesInd,
			        icount:   icount});
	}
	else
	{
		postMessage({type:IPC.DELETEMESH,
					key:      this.x+"|"+this.y+"|"+this.z+"|side" });
	}
}

