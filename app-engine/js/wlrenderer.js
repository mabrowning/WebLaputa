/*
 * WLRenderer - WebLaputa WebGL render class
 *
 * Copyright (c) 2012 Mark Browning
 *
 * Licensed under GPL3 or later.
 *
 */

var gl;
function initGL(canvas) {
	try {
		gl = canvas.getContext("experimental-webgl");
		gl.canvas = canvas;
	} catch (e) {
	}
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}
}

var renderer;
var world;

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
		  window.webkitRequestAnimationFrame || 
		  window.mozRequestAnimationFrame    || 
		  window.oRequestAnimationFrame      || 
		  window.msRequestAnimationFrame     || 
		  function( callback ){
			window.setTimeout(callback, 1000 / 60);
		  };
})();

function start() 
{
	var canvas = document.getElementById("webGL");
	canvas.width  = canvas.clientWidth;
	canvas.height = canvas.clientHeight;
	initGL(canvas);
	world = new WLWorld(128);
	renderer = new WLRenderer(world);
	(function animloop(){
		  requestAnimFrame(animloop);
		  renderer.draw();
		})();
	var loading = document.getElementById("loading");
	loading.parentNode.removeChild(loading);
}



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

	gl.uniform3f(this.uLightPos,     40, 40, 40);
	gl.uniform3f(this.uLightAmCol,  0.7,0.7,0.6);
	gl.uniform3f(this.uLightSpCol,  1.0,1.0,1.0);
	gl.uniform3f(this.uLightDiCol,  0.9,0.9,0.8);

	this.uPMatrix   = gl.getUniformLocation(this.program, "uPMatrix");
	this.uMVMatrix  = gl.getUniformLocation(this.program, "uMVMatrix");

    this.mvMatrix   = mat4.create();
    this.camPos = vec3.create();
	this.rotVec     = vec3.create();
	mat4.identity(this.mvMatrix);

    this.pMatrix  = mat4.create();

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.enable(gl.DEPTH_TEST);
	//gl.enable(gl.CULL_FACE);
	//gl.cullFace(gl.BACK);
	//gl.frontFace(gl.CW);

	this.world = world;

	this.keys = {}

	var that = this;

	document.addEventListener("keydown",   function(e){that.keydown(e)},   false);
	document.addEventListener("keyup",     function(e){that.keyup(e)},     false);
	document.addEventListener("mousedown", function(e){that.mousedown(e)}, false);
	document.addEventListener("mouseup",   function(e){that.mouseup(e)},   false);
	document.addEventListener("mousemove", function(e){that.mousemove(e)}, false);
	window.addEventListener  ("resize",    function(){that.resize()},      false);


	this.camPos.set([0,world.xsize,world.xsize]);
	this.rotVec.set([-0.92, -0.66, 0]); //chosen arbitrarily by looking a good view.

	this.tick = new Date().getTime();

	this.resize();

	/*
	this.line = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.line);
	gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,0,0,0,0]),gl.STATIC_DRAW);
	*/

	var cube = [
		// Top
		0, 0, 1, 0, 0, 1, 
		1, 0, 1, 0, 0, 1, 
		1, 1, 1, 0, 0, 1, 
		1, 1, 1, 0, 0, 1, 
		0, 1, 1, 0, 0, 1, 
		0, 0, 1, 0, 0, 1, 
		
		// Bottom
		0, 0, 0, 0, 0, -1,
		0, 1, 0, 0, 0, -1,
		1, 1, 0, 0, 0, -1,
		1, 1, 0, 0, 0, -1,
		1, 0, 0, 0, 0, -1,
		0, 0, 0, 0, 0, -1,
		
		// Front 
		0, 0, 1, 0, -1, 0,
		0, 0, 0, 0, -1, 0,
		1, 0, 0, 0, -1, 0,
		1, 0, 0, 0, -1, 0,
		1, 0, 1, 0, -1, 0,
		0, 0, 1, 0, -1, 0,
		
		// Rear	 
		0, 1, 1, 0, 1, 0,
		1, 1, 1, 0, 1, 0,
		1, 1, 0, 0, 1, 0,
		1, 1, 0, 0, 1, 0,
		0, 1, 0, 0, 1, 0,
		0, 1, 1, 0, 1, 0,
		
		// Right
		0, 0, 1, -1, 0, 0,
		0, 1, 1, -1, 0, 0,
		0, 1, 0, -1, 0, 0,
		0, 1, 0, -1, 0, 0,
		0, 0, 0, -1, 0, 0,
		0, 0, 1, -1, 0, 0,
	
		// Left
		1, 0, 1, 1, 0, 0,
		1, 0, 0, 1, 0, 0,
		1, 1, 0, 1, 0, 0,
		1, 1, 0, 1, 0, 0,
		1, 1, 1, 1, 0, 0,
		1, 0, 1, 1, 0, 0
	];

	this.hoverblock = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.hoverblock);
	gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(cube),gl.STATIC_DRAW);
}

WLRenderer.prototype.resize =function()
{
	gl.viewportWidth  = gl.canvas.clientWidth;
	gl.viewportHeight = gl.canvas.clientHeight;
	gl.canvas.height  = gl.viewportHeight;
	gl.canvas.width   = gl.viewportWidth;
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 1000.0, this.pMatrix);
	gl.uniformMatrix4fv(this.uPMatrix, false, this.pMatrix);
	this.dirty = true;
}

WLRenderer.prototype.draw = function() 
{

	this.do_movement();

	if(!this.dirty)
		return;
	this.dirty = false;

	var world = this.world;

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.uniform3f(this.uLightSpCol, 0.1, 0.6, 0.1);

	for(i in world.meshes)
	{
		var mesh = world.meshes[i];
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
		gl.vertexAttribPointer(this.aVertexPos, 3, gl.FLOAT, false, 24, 0);
		gl.vertexAttribPointer(this.aVertexNor, 3, gl.FLOAT, false, 24, 12);

		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,mesh.ibo)
		gl.drawElements(gl.TRIANGLES,mesh.icount,gl.UNSIGNED_SHORT,0);
	}

	gl.uniform3f(this.uLightSpCol, 0.16,0.32,0.64);

	if(world.hover)
	{
		var mvMatrix = mat4.set(this.mvMatrix, mat4.create());
		var neghover = [ world.hover[0], world.hover[2], world.hover[1] ];
		mat4.translate(mvMatrix,neghover);
		gl.uniformMatrix4fv(this.uMVMatrix, false, mvMatrix);

		
		gl.bindBuffer(gl.ARRAY_BUFFER, this.hoverblock);
		gl.vertexAttribPointer(this.aVertexPos, 3, gl.FLOAT, false, 24, 0);
		gl.vertexAttribPointer(this.aVertexNor, 3, gl.FLOAT, false, 24, 12);
		gl.drawArrays(gl.TRIANGLES, 0, 36);
	}

}

WLRenderer.prototype.do_movement = function()
{
	this.lasttick = this.tick;
	this.tick = new Date().getTime();
	var millielapsed = this.tick - this.lasttick;
	if(this.mouseold)
	{
		var x = this.mouseold[0] - this.mousepos[0];
		var y = this.mouseold[1] - this.mousepos[1];
		if(this.mousemotion || Math.abs(x) > 3)
		{
			this.rotVec[0] += x/400 //Yaw; 
			this.dirty = true;
			this.mousemotion = true;
		}
		if(this.mousemotion || Math.abs(y) > 3)
		{
			this.rotVec[1] += y/400; //Pitch
			if(this.rotVec[1] >  Math.PI/2) this.rotVec[1] =  Math.PI/2;
			if(this.rotVec[1] < -Math.PI/2) this.rotVec[1] = -Math.PI/2;
			this.dirty = true;
			this.mousemotion = true;
		}

	}

	if(this.mousemotion)
		this.mouseold = this.mousepos;

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
	if(move[0] || move[1] || move[2])
	{
		this.dirty = true;
	}
	if(!this.dirty)
	{
		return;
	}

	var colldetect = vec3.add(vec3.scale(move,-0.5*millielapsed,vec3.create()),this.camPos);
	if(world.getvoxel(Math.floor(colldetect[0]),
					  Math.floor(colldetect[2]),
					  Math.floor(colldetect[1])) == VOXEL.AIR)
	{
		vec3.scale(move,-0.05*millielapsed);
		vec3.add(this.camPos,move);
	}

	mat4.identity(this.mvMatrix);

	mat4.rotateX(this.mvMatrix,-this.rotVec[1]);
	mat4.rotateY(this.mvMatrix,-this.rotVec[0]);

	mat4.translate(this.mvMatrix,vec3.negate(this.camPos,vec3.create()));
	gl.uniformMatrix4fv(this.uMVMatrix, false, this.mvMatrix);
}

WLRenderer.prototype.click = function(e)
{
	if(e.button == 0)
	{
		world.place_block(VOXEL.DIRT);
	}
	else
	{
		world.hover[2] --;
		world.place_block(VOXEL.AIR);
	}
	this.mousemove(e);
	this.dirty = true;
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
	delete this.mouseold;
	delete this.mousepos;
	if(!this.mousemotion)
	{
		this.click(e);
	}
}

WLRenderer.prototype.mousedown = function(e)
{
	this.mouseold = [ e.clientX, e.clientY ];
	this.mousepos = this.mouseold;
	this.mousedrag = true;
	this.mousemotion = false;
}

WLRenderer.prototype.mousemove = function(e)
{
	if(this.mousedrag)
	{
		this.mousepos = [ e.clientX, e.clientY ];
	}
	else //TODO: only do this if in block-placing mode.
	{
		var view = [0,gl.viewportHeight,gl.viewportWidth,-gl.viewportHeight]
		var p0 = vec3.unproject([e.clientX,e.clientY,0],this.mvMatrix,this.pMatrix,view,vec3.create());
		var p1 = vec3.unproject([e.clientX,e.clientY,1],this.mvMatrix,this.pMatrix,view,vec3.create());
		if( !p0 || !p1 )return;
		var ray = vec3.subtract(p1,p0);
		vec3.normalize(ray);
		world.hover_block([p0[0],p0[2],p0[1]],[ray[0],ray[2],ray[1]]);
		this.dirty = true;
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

