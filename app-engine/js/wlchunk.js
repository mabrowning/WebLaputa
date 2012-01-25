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
	this.vboTop       = gl.createBuffer();
	this.vboTop.ibo   = gl.createBuffer();
	this.vboSides     = gl.createBuffer();
	this.vboSides.ibo = gl.createBuffer();

	var chunksize = WLChunk.size;
	this.x = x * chunksize;
	this.y = y * chunksize;
	this.z = z * chunksize;

	this.build_verts(data)
};

WLChunk.size = 64;

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

WLChunk.prototype.getheight =function(z,heights)
{
	for(i in heights)
		if (Math.abs(z - heights[i]) < 2 )
			return heights[i];
	return z-1;
}

WLChunk.prototype.addnorm = function(norms,pos,norm)
{
	var pos2 = [];
	vec3.add(pos,[this.x,this.y,this.z],pos2);
	//Hash the vertex position
	var i = pos2.join("|");

	//Add or add the norm.
	if( i in norms)
		vec3.add(norms[i],norm);
	else
		norms[i] = norm;
	return i;
}

WLChunk.prototype.build_verts = function(data)
{
	//norms Will store hashed verex positions mapping to their unnormalized
	//normals ;)
	this.norms = {}; 

	//Indices will store hashed vertex positions in gl.TRIANGLES order.
	this.indices = new Array();

	var chunksize = WLChunk.size;
	var heights = new Array();


	//xi, yi and zi in terms of voxels index IN this chunk.
	//x , y  and z  in terms of global voxel position.
	for(xi=-1;xi<=chunksize;xi++)
	{
		var x = this.x + xi;
		heights[xi+1] = new Array();
		for(yi=-1;yi<=chunksize;yi++)
		{
			var y = this.y + yi;
			heights[xi+1][yi+1] = new Array();
			var b = this.getvoxel(x,y,this.z - 2,data);
			for(zi=-1;zi<=chunksize+1;zi++)
			{
				var z = this.z + zi;

				var lastb = b;
				b = this.getvoxel(x,y,z,data);
				if(b != VOXEL.DIRT && lastb == VOXEL.DIRT)
				{
					//zi+1 because the mesh is on the top of the block
					heights[xi+1][yi+1].push(zi+1); 
				}
			}
		}
	}

	//Now that we have the heightmap of the top of the terrain, vertex it!
	this.heights = heights;
	for(x=1; x<heights.length-1; x++)
	{
		for(y=1; y<heights[x].length-1; y++)
		{
			for(i in heights[x][y])
			{
				var h = heights[x][y][i];
				//This heightmap has neighbors... make sure we don't 
				//draw those
				if(h>chunksize || h<0)
				{
					continue;
				}
				/*
				This face(h) has neighors(voxels) with height:

				+--+--+--+    6=w+nw+n+h/4  7=n+h/2 8=n+ne+e+h/4
				|nw| n|ne| 
				+--+--+--+    
				| w| h| e|    3=     w/h/2  4=  h   5=     h+n/2
				+--+--+--+ 
				|sw| s|se|
				+--+--+--+    0=w+sw+s+h/4  1=s+h/2 2=s+se+e+h/4
				*/

				var sw=this.getheight(h,heights[x-1][y-1]);
				var  w=this.getheight(h,heights[x-1][y  ]);
				var nw=this.getheight(h,heights[x-1][y+1]);
				var n =this.getheight(h,heights[x  ][y+1]);
				var ne=this.getheight(h,heights[x+1][y+1]);
				var  e=this.getheight(h,heights[x+1][y  ]);
				var se=this.getheight(h,heights[x+1][y-1]);
				var s =this.getheight(h,heights[x  ][y-1]);

				var qsw = 0.25*sw;
				var qnw = 0.25*nw;
				var qse = 0.25*se;
				var qne = 0.25*ne;
				var  qn = 0.25*n;
				var  qs = 0.25*s;
				var  qw = 0.25*w;
				var  qe = 0.25*e;

				//TODO: MORE SmOoThInG!

				var zp = new Array();
				var weights = 
				zp[0] = (w+sw+s+h) / 4;
				zp[1] = (qw+qe+qsw+qse+s+h) / 3;
				zp[2] = (e+se+s+h) / 4;
				zp[3] = (qsw+qnw+qs+qn+w+h) / 3;
				zp[5] = (qse+qne+qs+qn+e+h) / 3;
				zp[6] = (w+nw+n+h) / 4;
				zp[7] = (qw+qe+qnw+qne+n+h) / 3;
				zp[8] = (e+ne+n+h) / 4;
				zp[4] = (zp[0] + zp[1] + zp[2] + zp[3] + 
						 zp[5] + zp[6] + zp[7] + zp[8] + h)/9;

				var xp = new Array();
				xp[0] = xp[3] = xp[6] = x;
				xp[1] = xp[4] = xp[7] = x + 0.5;
				xp[2] = xp[5] = xp[8] = x + 1.0;

				var yp = new Array();
				yp[0] = yp[1] = yp[2] = y;
				yp[3] = yp[4] = yp[5] = y + 0.5;
				yp[6] = yp[7] = yp[8] = y + 1.0;

				/*
				This face is made up of the following triangles:
				+-+-+     6-7-8      |4/|6/|
				|/|/|	  |/|/|      |/5|/7|
				+-+-+ --> 3-4-5  --> +--+--+
				|/|/|     |/|/|      |0/|2/|
				+-+-+     0-1-2      |/1|/3|
				Triangles are indexed by vertex so that diagonal always
				traces largest change in height: 

				*/

				var tris = [ ];
				if ( Math.abs(zp[4] - zp[0]) >= Math.abs(zp[1] - zp[3]) )
					tris = tris.concat([[0,1,3], [1,4,3]]);
				else
					tris = tris.concat([[0,4,3], [0,1,4]]);
				if ( Math.abs(zp[4] - zp[2]) >= Math.abs( zp[1] - zp[5]) )
					tris = tris.concat([[1,5,4], [1,2,5]]);
				else
					tris = tris.concat([[1,2,4], [2,5,4]]);
				if ( Math.abs(zp[4] - zp[6]) >= Math.abs(zp[3] -zp[7]) )
					tris = tris.concat([[3,7,6], [3,4,7]]);
				else
					tris = tris.concat([[4,6,3], [4,7,6]]);
				if ( Math.abs(zp[4] - zp[8]) >= Math.abs(zp[5] - zp[7]) )
					tris = tris.concat([[5,8,7], [5,7,4]]);
				else
					tris = tris.concat([[4,8,7], [4,5,8]]);

				for(i in tris)
				{
					var tri = tris[i];
					var p0 = [xp[tri[0]], yp[tri[0]], zp[tri[0]]];
					var p1 = [xp[tri[1]], yp[tri[1]], zp[tri[1]]];
					var p2 = [xp[tri[2]], yp[tri[2]], zp[tri[2]]];
					var u = vec3.create();
					vec3.subtract(p1,p0,u);
					var v = vec3.create();
					vec3.subtract(p2,p0,v);
					var norm = vec3.cross(u,v);

					this.indices.push(this.addnorm(this.norms,p0,norm));
					this.indices.push(this.addnorm(this.norms,p1,norm));
					this.indices.push(this.addnorm(this.norms,p2,norm));
				}
			}
		}
	}
}

WLChunk.prototype.build_mesh = function(neigh_norms)
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
			for(i in neigh_norms)
			{
				n = neigh_norms[i][key];
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
	this.vboTop.vcount = vcount;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vboTop);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arrTop), gl.STATIC_DRAW);

	var arrTopInd = new Array();
	//Build Vertex indices
	var icount = 0;
	for( i in this.indices )
	{
		//Each ind is a hashed vertex. The mapping from hash to vertex index is vIndices
		arrTopInd.push(vIndices[this.indices[i]]);
		icount++;
	}
	this.vboTop.icount = icount;
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.vboTop.ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(arrTopInd), gl.STATIC_DRAW);

	//TODO: sides and bottoms
	this.vboSides.vcount = 0;
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vboSides);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(), gl.STATIC_DRAW);

	return icount > 0 || this.vboSides.vcount > 0;
}

