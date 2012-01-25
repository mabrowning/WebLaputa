/*
 * WLRenderer - WebLaputa WebGL render class
 *
 * Copyright (c) 2012 Mark Browning
 *
 * Licensed under GPL3 or later.
 *
 */

WLRenderer = function(world) {
	var fragmentShader = this.getShader("shader-fs");
	var vertexShader = this.getShader("shader-vs");

	this.program = gl.createProgram();

	gl.attachShader(this.program, vertexShader);
	gl.attachShader(this.program, fragmentShader);
	gl.linkProgram(this.program);

	if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}

	gl.useProgram(this.program);

	this.aVertexPos = gl.getAttribLocation (this.program, "aVertexPosition");
	gl.enableVertexAttribArray(this.aVertexPos);
	this.aVertexNor = gl.getAttribLocation (this.program, "aVertexNormal");
	gl.enableVertexAttribArray(this.aVertexNor);


	this.uLightPos   = gl.getUniformLocation(this.program, "uLightPos");
	this.uLightAmCol = gl.getUniformLocation(this.program, "uLightAmCol");
	this.uLightSpCol = gl.getUniformLocation(this.program, "uLightSpCol");
	this.uLightDiCol = gl.getUniformLocation(this.program, "uLightDiCol");

	gl.uniform3f(this.uLightPos,   false, 40,40,40);
	gl.uniform3f(this.uLightAmCol, false, 0.7,0.7,0.6);
	gl.uniform3f(this.uLightSpCol, false, 1.0,1.0,1.0);
	gl.uniform3f(this.uLightDiCol, false, 0.9,0.9,0.8);

	this.uPMatrix   = gl.getUniformLocation(this.program, "uPMatrix");
	this.uMVMatrix  = gl.getUniformLocation(this.program, "uMVMatrix");

    this.mvMatrix   = mat4.create();
    this.tranMatrix = vec3.create();
	this.rotVec     = vec3.create();
	mat4.identity(this.mvMatrix);

    this.pMatrix  = mat4.create();

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);
	gl.frontFace(gl.CW);

	this.world = world;

	this.keys = {}

	var that = this;

	document.addEventListener("keydown",   function(e){that.keydown(e)},   false);
	document.addEventListener("keyup",     function(e){that.keyup(e)},     false);
	document.addEventListener("mousedown", function(e){that.mousedown(e)}, false);
	document.addEventListener("mouseup",   function(e){that.mouseup(e)},   false);
	document.addEventListener("mousemove", function(e){that.mousemove(e)}, false);

	//gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0, this.pMatrix);
	gl.uniformMatrix4fv(this.uPMatrix, false, this.pMatrix);

	this.tranMatrix.set([0,-world.xsize,-world.xsize]);
	this.rotVec.set([-0.92, -0.66, 0]); //chosen arbitrarily by looking a good view.

	this.rend = new Date().getTime();

}

WLRenderer.prototype.draw = function() 
{

	this.do_movement();

	var world = this.world;

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	for(i in world.meshes)
	{
		var mesh = world.meshes[i];
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
		gl.vertexAttribPointer(this.aVertexPos, 3, gl.FLOAT, false, 24, 0);
		gl.vertexAttribPointer(this.aVertexNor, 3, gl.FLOAT, false, 24, 12);

		//gl.drawArrays(gl.POINTS,0, mesh.vcount);


		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ibo)
		gl.drawElements(gl.TRIANGLES,mesh.icount,gl.UNSIGNED_SHORT,0);
	}
	/*
	for(x=0;x<world.xchunk;x++)
	{
		for(y=0;y<world.ychunk;y++)
		{
			for(z=0;z<world.zchunk;z++)
			{
				var chunk = world.chunks[x][y][z];
				gl.bindBuffer(gl.ARRAY_BUFFER, chunk.vboTop);
				gl.vertexAttribPointer(this.aVertexPos, 3, gl.FLOAT, false, 24, 0);
				gl.vertexAttribPointer(this.aVertexNor, 3, gl.FLOAT, false, 24, 12);

				//gl.drawArrays(gl.POINTS,0, chunk.vboTop.vcount);


				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,chunk.vboTop.ibo)
				gl.drawElements(gl.TRIANGLES,chunk.vboTop.icount,gl.UNSIGNED_SHORT,0);

				//gl.bindBuffer(gl.ARRAY_BUFFER, chunk.vboSides);
				//gl.vertexAttribPointer(this.aVertexPos, 3, gl.FLOAT, false, 0, 0);
				//gl.drawArrays(gl.POINTS,0, chunk.vboSides.vcount);
			}
		}
	}
	*/
}

WLRenderer.prototype.do_movement = function()
{
	this.oldrend = this.rend;
	this.rend = new Date().getTime();
	var millielapsed = this.rend - this.oldrend;
	if(this.oldmouse)
	{
		var x = this.oldmouse[0] - this.mousepos[0];
		var y = this.oldmouse[1] - this.mousepos[1];
		if(x)
			this.rotVec[0] += x/200 //Yaw; 
		if(y)
		{
			this.rotVec[1] += y/200; //Pitch
			if(this.rotVec[1] >  Math.PI/2) this.rotVec[1] =  Math.PI/2;
			if(this.rotVec[1] < -Math.PI/2) this.rotVec[1] = -Math.PI/2;
		}

	}

	this.oldmouse = this.mousepos;

	var move = [0,0,0];
	if(this.keys[87]) //W
	{
		move[2] += Math.cos( this.rotVec[0] ) * Math.cos( -this.rotVec[1] );
		move[0] += Math.sin( this.rotVec[0] ) * Math.cos( -this.rotVec[1] );
		move[1] +=                              Math.sin( -this.rotVec[1] );

	}
	if(this.keys[83]) //S
	{
		move[2] -= Math.cos( this.rotVec[0] ) * Math.cos( -this.rotVec[1] );
		move[0] -= Math.sin( this.rotVec[0] ) * Math.cos( -this.rotVec[1] );
		move[1] -=                              Math.sin( -this.rotVec[1] );
	}
	if(this.keys[65]) //A
	{
		move[0] += Math.cos( this.rotVec[0] ) 
		move[2] -= Math.sin( this.rotVec[0] ) 
	}
	if(this.keys[68]) //D
	{
		move[0] -= Math.cos( this.rotVec[0] )
		move[2] += Math.sin( this.rotVec[0] ) 
	}
	if(this.keys[16]) //shift
	{
		move[2] += Math.cos( this.rotVec[0] ) * Math.sin( this.rotVec[1] );
		move[0] += Math.sin( this.rotVec[0] ) * Math.sin( this.rotVec[1] );
		move[1] +=                              Math.cos( this.rotVec[1] );
	}
	if(this.keys[32]) //space
	{
		move[2] -= Math.cos( this.rotVec[0] ) * Math.sin( this.rotVec[1] );
		move[0] -= Math.sin( this.rotVec[0] ) * Math.sin( this.rotVec[1] );
		move[1] -=                              Math.cos( this.rotVec[1] );
	}
	vec3.normalize(move);
	vec3.scale(move,0.05*millielapsed);

	vec3.add(this.tranMatrix,move);

	mat4.identity(this.mvMatrix);

	mat4.rotateX(this.mvMatrix,-this.rotVec[1]);
	mat4.rotateY(this.mvMatrix,-this.rotVec[0]);

	mat4.translate(this.mvMatrix,this.tranMatrix);
	gl.uniformMatrix4fv(this.uMVMatrix, false, this.mvMatrix);
}


WLRenderer.prototype.keydown = function(e)
{
	this.keys[e.keyCode] = true;
}

WLRenderer.prototype.keyup = function(e)
{
	this.keys[e.keyCode] = false;
}

WLRenderer.prototype.mouseup = function(e)
{
	this.mousedrag = false;
	delete this.oldmouse;
	delete this.mousepos;
}

WLRenderer.prototype.mousedown = function(e)
{
	this.mousedrag = true;
}

WLRenderer.prototype.mousemove = function(e)
{
	if(this.mousedrag)
	{
		this.mousepos = [ e.clientX, e.clientY ];
	}
}





WLRenderer.prototype.getShader = function (id) {
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}
